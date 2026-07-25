/**
 * Traduz os status da API MyEduzz (e de seeds legados) para o
 * vocabulário canônico usado no painel admin.
 */
export const EDUZZ_STATUS_TO_CANONICAL: Record<string, string> = {
  'paid': 'PAID', 'pago': 'PAID', 'aprovado': 'PAID',
  'waiting_payment': 'PIX_PENDING', 'aguardando pagamento': 'PIX_PENDING', 'pix': 'PIX_PENDING',
  'open': 'PENDING',
  'refunded': 'REFUNDED', 'chargeback': 'REFUNDED', 'contested': 'REFUNDED',
  'canceled': 'CANCELED', 'cancelled': 'CANCELED', 'expired': 'CANCELED', 'duplicated': 'CANCELED',
};

export type EduzzSale = {
  id?: number | string;
  status?: string;
  createdAt?: string;
  paidAt?: string | null;
  installments?: number;
  paymentMethod?: string;
  payment?: { method?: string };
  total?: { value?: number };
  netGain?: { value?: number };
  buyer?: { name?: string; email?: string; phone?: string; document?: string };
  product?: { name?: string; sku?: string };
  offer?: { name?: string | null };
  utm?: { source?: string; campaign?: string; medium?: string; content?: string; term?: string };
};

/**
 * A API da Eduzz retorna textos com UTF-8 duplamente codificado
 * (ex: "Vivendo SÃ³ de Turmas" em vez de "Vivendo Só de Turmas").
 * Desfaz a dupla codificação apenas quando o padrão é detectado.
 */
export function fixMojibake(value?: string | null): string | null {
  if (!value) return null;
  if (!/[ÃÂ]/.test(value)) return value;
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('�') ? value : decoded;
}

/**
 * A API da Eduzz carimba "Z" (UTC) em timestamps que na verdade estão em
 * horário de BRASÍLIA. Confirmado em 25/07/2026 comparando o painel deles
 * com a API: a venda 101338882 aparece como 11:45:52 no painel da Eduzz e
 * chega na API como "2026-07-25T11:45:52.000Z" — mesmo número, dois fusos.
 * Sem esta correção o banco fica 3h atrasado.
 *
 * +3h fixas: o Brasil não tem horário de verão desde 2019 e todo o
 * histórico importado é posterior a isso.
 *
 * ⚠ Se a Eduzz um dia corrigir a API, este ajuste passa a errar 3h para o
 * outro lado — o sintoma seria venda aparecendo no futuro. Para conferir,
 * compare o horário de uma venda no painel deles com o do nosso admin.
 */
const EDUZZ_BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

export function eduzzDateToUTC(value?: string | null): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t + EDUZZ_BRT_OFFSET_MS).toISOString();
}

/**
 * Mapeia uma venda da API MyEduzz para a linha da tabela eduzz_sales.
 * - `value` é o TOTAL da venda (total.value), não o ganho do produtor
 * - `net_value` é o ganho líquido real (netGain.value)
 * - UTMs reais da venda são preservadas
 * - datas são reinterpretadas de Brasília para UTC (ver eduzzDateToUTC)
 */
export function mapEduzzSale(sale: EduzzSale) {
  return {
    id: String(sale.id),
    client_name: fixMojibake(sale.buyer?.name) || 'Desconhecido',
    client_email: sale.buyer?.email || 'Desconhecido',
    client_phone: sale.buyer?.phone || null,
    product_name: fixMojibake(sale.product?.name) || 'Desconhecido',
    value: sale.total?.value ?? 0,
    net_value: sale.netGain?.value ?? null,
    status: (sale.status || 'unknown').toLowerCase(),
    created_at: eduzzDateToUTC(sale.createdAt) || new Date().toISOString(),
    paid_at: eduzzDateToUTC(sale.paidAt),
    payment_method: sale.paymentMethod || sale.payment?.method || null,
    installments: sale.installments || 1,
    utm_source: fixMojibake(sale.utm?.source) || null,
    utm_medium: fixMojibake(sale.utm?.medium) || null,
    utm_campaign: fixMojibake(sale.utm?.campaign) || null,
    utm_content: fixMojibake(sale.utm?.content) || null,
    utm_term: fixMojibake(sale.utm?.term) || null,
    sku: sale.product?.sku || null,
    offer_name: fixMojibake(sale.offer?.name) || null,
  };
}
