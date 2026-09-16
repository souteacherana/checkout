import type { VendaUI } from './vendas';

/**
 * Filtros da tela de vendas. Vivem aqui (e não dentro da página) porque a
 * exportação de CSV precisa aplicar exatamente os mesmos critérios: se as duas
 * pontas tivessem cópias da regra, o CSV voltaria a divergir da tela.
 */
export type VendasFiltros = {
  from: number | null;   // epoch ms; null = sem limite
  to: number | null;
  status: string;        // 'ALL' | PAID | PENDING | ...
  produtos: string[];    // nomes exatos; vazio = todos os produtos
  busca: string;         // nome, e-mail ou telefone do cliente
  utm: string;           // qualquer um dos campos utm_*
  incluirEduzz: boolean;
};

export type VendasOrdem = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'utm_asc';

export const FILTROS_PADRAO: VendasFiltros = {
  from: null,
  to: null,
  status: 'ALL',
  produtos: [],
  busca: '',
  utm: '',
  incluirEduzz: true,
};

const contem = (campo: string | null | undefined, termo: string) =>
  (campo || '').toLowerCase().includes(termo);

export function filtrarVendas(vendas: VendaUI[], f: VendasFiltros): VendaUI[] {
  const busca = f.busca.trim().toLowerCase();
  const utm = f.utm.trim().toLowerCase();
  const de = f.from ?? -Infinity;
  const ate = f.to ?? Infinity;
  const produtos = f.produtos.length ? new Set(f.produtos) : null;

  return vendas.filter(v => {
    const t = new Date(v.created_at).getTime();
    if (t < de || t > ate) return false;
    if (!f.incluirEduzz && v.fonte === 'eduzz') return false;
    if (f.status !== 'ALL' && v.status !== f.status) return false;
    if (produtos && !produtos.has(v.product_name || '')) return false;
    if (busca && !(
      contem(v.customer_name, busca) ||
      contem(v.customer_email, busca) ||
      contem(v.customer_phone, busca)
    )) return false;
    if (utm && !(
      contem(v.utm_source, utm) ||
      contem(v.utm_campaign, utm) ||
      contem(v.utm_medium, utm) ||
      contem(v.utm_content, utm)
    )) return false;
    return true;
  });
}

export function ordenarVendas(vendas: VendaUI[], ordem: VendasOrdem): VendaUI[] {
  const data = (v: VendaUI) => new Date(v.created_at).getTime();
  return [...vendas].sort((a, b) => {
    switch (ordem) {
      case 'date_asc': return data(a) - data(b);
      case 'name_asc': return (a.customer_name || '').localeCompare(b.customer_name || '');
      case 'name_desc': return (b.customer_name || '').localeCompare(a.customer_name || '');
      case 'utm_asc': return (a.utm_source || '').localeCompare(b.utm_source || '');
      default: return data(b) - data(a);
    }
  });
}

/** Serializa os filtros para a querystring da rota de exportação. */
export function filtrosParaQuery(f: VendasFiltros, ordem: VendasOrdem): string {
  const p = new URLSearchParams();
  if (f.from !== null) p.set('from', String(f.from));
  if (f.to !== null) p.set('to', String(f.to));
  if (f.status !== 'ALL') p.set('status', f.status);
  f.produtos.forEach(nome => p.append('produto', nome));
  if (f.busca.trim()) p.set('busca', f.busca.trim());
  if (f.utm.trim()) p.set('utm', f.utm.trim());
  if (!f.incluirEduzz) p.set('eduzz', '0');
  p.set('ordem', ordem);
  return p.toString();
}

const ORDENS: VendasOrdem[] = ['date_desc', 'date_asc', 'name_asc', 'name_desc', 'utm_asc'];

/** Lê os filtros de volta na rota de exportação. */
export function filtrosDaQuery(sp: URLSearchParams): { filtros: VendasFiltros; ordem: VendasOrdem } {
  const num = (chave: string) => {
    const v = Number(sp.get(chave));
    return sp.get(chave) !== null && Number.isFinite(v) ? v : null;
  };
  const ordem = sp.get('ordem') as VendasOrdem | null;

  return {
    filtros: {
      from: num('from'),
      to: num('to'),
      status: sp.get('status') || 'ALL',
      produtos: sp.getAll('produto'),
      busca: sp.get('busca') || '',
      utm: sp.get('utm') || '',
      incluirEduzz: sp.get('eduzz') !== '0',
    },
    ordem: ordem && ORDENS.includes(ordem) ? ordem : 'date_desc',
  };
}
