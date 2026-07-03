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
 * Mapeia uma venda da API MyEduzz para a linha da tabela eduzz_sales.
 * - `value` é o TOTAL da venda (total.value), não o ganho do produtor
 * - `net_value` é o ganho líquido real (netGain.value)
 * - UTMs reais da venda são preservadas
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
    created_at: sale.createdAt || new Date().toISOString(),
    paid_at: sale.paidAt || null,
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
