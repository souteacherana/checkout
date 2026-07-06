/**
 * Tipos do schema do Supabase, escritos à mão a partir do schema real.
 * Se o schema mudar, atualize aqui (ou gere oficialmente com
 * `npx supabase gen types typescript --project-id <ref>`).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CheckoutRow = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_cpf: string | null;
  product_key: string | null;
  product_name: string | null;
  amount: number | null;
  net_value: number | null;
  payment_method: string | null;
  payment_id: string | null;
  installments: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fb_fbp: string | null;
  fb_fbc: string | null;
  payment_date: string | null;
  credit_date: string | null;
  asaas_invoice_url: string | null;
  asaas_invoice_number: string | null;
  asaas_payload: Json | null;
  deleted_at: string | null;
  recovery_contacted_at: string | null;
};

export type EduzzSaleRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  product_name: string | null;
  value: number | null;
  net_value: number | null;
  status: string | null;
  paid_at: string | null;
  payment_method: string | null;
  installments: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  sku: string | null;
  offer_name: string | null;
  deleted_at: string | null;
};

export type ProductRow = {
  id: string;
  created_at: string;
  slug: string;
  title: string;
  price: number;
  accent_color: string | null;
  accent_color_hover: string | null;
  image_src: string | null;
  fb_pixel_id: string | null;
  fb_capi_token: string | null;
};

export type UserRoleRow = {
  email: string;
  role: string;
  created_at: string | null;
  utm_code: string | null;
};

/** Linha da view unificada `vendas` (fonte única de verdade de vendas) */
export type VendaRow = {
  fonte: 'checkout' | 'eduzz';
  id_origem: string;
  status: string; // paga | pix_pendente | abandono | em_revisao | reembolsada | cancelada | ...
  cliente_nome: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  produto_slug: string | null;
  produto_nome: string | null;
  valor_bruto: number | null;
  valor_liquido: number | null;
  metodo_pagamento: string | null;
  parcelas: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  created_at: string;
  pago_em: string | null;
  recovery_contacted_at: string | null;
};

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      checkouts: TableDef<CheckoutRow>;
      eduzz_sales: TableDef<EduzzSaleRow>;
      products: TableDef<ProductRow>;
      user_roles: TableDef<UserRoleRow>;
    };
    Views: {
      vendas: { Row: VendaRow; Relationships: [] };
    };
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: string };
      vendas_stats_por_produto: {
        Args: Record<string, never>;
        Returns: { produto_slug: string | null; vendas: number; receita: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
