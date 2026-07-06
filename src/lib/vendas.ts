import type { VendaRow } from './database.types';

/**
 * Traduz o status canônico da view `vendas` para os códigos
 * que a UI do admin usa nos badges e filtros.
 */
export const VENDA_STATUS_TO_UI: Record<string, string> = {
  paga: 'PAID',
  pix_pendente: 'PIX_PENDING',
  abandono: 'PENDING',
  em_revisao: 'PAYMENT_MISMATCH_REVIEW',
  reembolsada: 'REFUNDED',
  cancelada: 'CANCELED',
};

/** Formato interno que as páginas do admin usam para renderizar vendas */
export type VendaUI = {
  id: string;            // `${fonte}:${id_origem}` — único entre fontes
  fonte: 'checkout' | 'eduzz';
  id_origem: string;
  created_at: string;
  status: string;        // códigos UI (PAID, PENDING, ...)
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  produto_slug: string | null;
  product_name: string | null;
  amount: number | null;
  net_value: number | null;
  payment_method: string | null;
  installments: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  recovery_contacted_at: string | null;
  source: string;        // rótulo de exibição: 'Asaas' | 'Eduzz'
};

export function vendaToUI(v: VendaRow): VendaUI {
  return {
    id: `${v.fonte}:${v.id_origem}`,
    fonte: v.fonte,
    id_origem: v.id_origem,
    created_at: v.created_at,
    status: VENDA_STATUS_TO_UI[v.status] || 'PENDING',
    customer_name: v.cliente_nome,
    customer_email: v.cliente_email,
    customer_phone: v.cliente_telefone,
    produto_slug: v.produto_slug,
    product_name: v.produto_nome,
    amount: v.valor_bruto,
    net_value: v.valor_liquido,
    payment_method: v.metodo_pagamento,
    installments: v.parcelas,
    utm_source: v.utm_source || (v.fonte === 'eduzz' ? 'Eduzz' : null),
    utm_medium: v.utm_medium,
    utm_campaign: v.utm_campaign,
    utm_content: v.utm_content,
    utm_term: v.utm_term,
    recovery_contacted_at: v.recovery_contacted_at,
    source: v.fonte === 'eduzz' ? 'Eduzz' : 'Asaas',
  };
}
