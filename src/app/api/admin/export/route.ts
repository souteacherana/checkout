import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dataBR, dataISOBR, horaBR } from '@/lib/datas';
import { buscarVendas, type VendaUI } from '@/lib/vendas';
import { filtrarVendas, filtrosDaQuery, ordenarVendas } from '@/lib/vendas-filtros';

function escapeCSV(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Paga',
  PENDING: 'Abandono',
  PIX_PENDING: 'Aguardando Pix',
  PAYMENT_MISMATCH_REVIEW: 'Em Revisão',
  REFUNDED: 'Reembolsada',
  CANCELED: 'Cancelada',
};

const METODO_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de Crédito',
  BOLETO: 'Boleto',
};

// Byte order mark: sem ele o Excel abre o arquivo como latin-1 e come os acentos.
const BOM = String.fromCharCode(0xfeff);

const COLUNAS = [
  'Data', 'Hora', 'Status', 'Origem', 'Cliente / Nome', 'Cliente / E-mail', 'Cliente / Telefone',
  'Produto', 'Método de Pagamento', 'Nº Parcelas', 'Valor Bruto', 'Valor Líquido', 'Taxa',
  'Data de Pagamento', 'UTM Source', 'UTM Campaign', 'UTM Medium', 'UTM Content', 'UTM Term',
];

// 1234,56 — decimal com vírgula e sem separador de milhar, que é o que o
// Excel pt-BR lê como número (com milhar ele trataria a célula como texto).
const valorBR = (val: number | null) =>
  val === null || val === undefined
    ? ''
    : val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

function linha(v: VendaUI): string {
  const bruto = v.amount === null ? null : Number(v.amount);
  // Líquido vem null quando a view mascara o financeiro (papéis sem acesso);
  // sem líquido não há taxa a calcular.
  const liquido = v.net_value === null || v.net_value === undefined ? null : Number(v.net_value);
  // Só venda paga tem taxa. Em cancelada/reembolsada o líquido é zero, e
  // bruto - líquido devolveria o valor cheio como se fosse taxa cobrada.
  const taxa = v.status === 'PAID' && bruto !== null && liquido !== null ? bruto - liquido : null;

  return [
    dataBR(v.created_at),
    horaBR(v.created_at),
    STATUS_LABEL[v.status] || v.status,
    v.source,
    v.customer_name || '',
    v.customer_email || '',
    v.customer_phone || '',
    v.product_name || '',
    v.payment_method ? (METODO_LABEL[v.payment_method] || v.payment_method) : '',
    v.installments || 1,
    valorBR(bruto),
    valorBR(liquido),
    valorBR(taxa),
    dataBR(v.payment_date),
    v.utm_source || '',
    v.utm_campaign || '',
    v.utm_medium || '',
    v.utm_content || '',
    v.utm_term || '',
  ].map(escapeCSV).join(';');
}

/** Nome de arquivo sem acento/espaço e sem nada que quebre o header HTTP. */
function sanitizar(texto: string): string {
  return texto
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Client com o token do admin: a view `vendas` é security_invoker, então
    // RLS e o mascaramento do líquido seguem valendo para quem exporta.
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { filtros, ordem } = filtrosDaQuery(new URL(req.url).searchParams);
    const vendas = await buscarVendas(supabaseClient);
    const selecionadas = ordenarVendas(filtrarVendas(vendas, filtros), ordem);

    // O BOM do UTF-8 obriga o Excel a reconhecer os acentos, e ';' é o
    // separador que o Excel pt-BR usa por padrão.
    const csv = BOM + [
      COLUNAS.map(escapeCSV).join(';'),
      ...selecionadas.map(linha),
    ].join('\n');

    const partes = ['Vendas'];
    if (filtros.produtos.length === 1) partes.push(sanitizar(filtros.produtos[0]));
    else if (filtros.produtos.length > 1) partes.push(`${filtros.produtos.length}-produtos`);
    if (filtros.from !== null) partes.push(dataISOBR(filtros.from));
    if (filtros.to !== null) partes.push('a', dataISOBR(filtros.to));
    const filename = `${partes.join('_')}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('Export CSV Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
