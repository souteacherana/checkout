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
  landing_url: string | null;
  archived_at: string | null;
};

// A PESSOA. Dados de contato + resumo financeiro bruto do Asaas.
// (As colunas *_legado seguem no banco como backup pós-migração 012.)
export type MentoradoRow = {
  id: string;
  mentoria: 'elite' | 'partiu10k';
  asaas_customer_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  rg: string | null;
  endereco: string | null;
  cep: string | null;
  materia_pessoa: string | null;        // P10k: matéria que o professor ensina
  asaas_total_contratado: number | null; // soma bruta de todas as cobranças (Asaas)
  asaas_total_pago: number | null;        // soma bruta das cobranças pagas (Asaas)
  parcelas_vencidas: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// UM CICLO de mentoria (período). Curado pela Ana.
export type MentoradoCicloRow = {
  id: string;
  mentorado_id: string;
  numero: number;
  tags: string[];                // ativo | entrada_facilitada | devedor | ...
  data_inicio: string | null;
  data_termino: string | null;
  duracao_meses: number;
  valor_contrato: number | null;
  valor_pago: number | null;
  forma_pagamento: string | null;
  imersao_rise: string | null;   // ano(s) de ingresso Rise
  caneca: string | null;         // Elite
  origem: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

// Reunião/consultoria de um mentorado
export type MentoradoReuniaoRow = {
  id: string;
  mentorado_id: string;
  tipo: string;          // consultoria (elite) | cs (p10k) | extra_ana (p10k)
  consultor: string | null;
  data: string;
  notas: string | null;
  created_at: string;
};

// Pessoa + seus ciclos + reuniões (embedded do Supabase)
export type MentoradoComCiclos = MentoradoRow & {
  mentorado_ciclos: MentoradoCicloRow[];
  mentorado_reunioes: MentoradoReuniaoRow[];
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

// Preço de uma opção de pagamento de mentoria (editável na aba Mentorias)
export type MentoriaPrecoRow = {
  mentoria: string;       // elite | partiu10k
  metodo: string;         // PIX | BOLETO | CREDIT_CARD
  parcelas: number;
  valor_parcela: number;
};

// Venda de mentoria criada pelo seller (link /m/{codigo})
export type VendaMentoriaRow = {
  id: string;
  codigo: string;
  seller_email: string;
  mentoria: string;       // elite | partiu10k
  renovacao: boolean;
  valor_total: number;
  entrada_valor: number | null;
  entrada_facilitada: boolean;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  cliente_cpf: string | null;
  cliente_rg: string | null;
  cliente_nacionalidade: string | null;
  cliente_estado_civil: string | null;
  cliente_profissao: string | null;
  end_rua: string | null;
  end_numero: string | null;
  end_bairro: string | null;
  end_cidade: string | null;
  end_estado: string | null;
  end_cep: string | null;
  descricao: string | null;
  prazo_meses: number;
  status: string;         // LINK_CRIADO | AGUARDANDO_PAGAMENTO | PARCIAL | PAGO | CANCELADO
  metodo_escolhido: string | null;
  parcelas_escolhidas: number | null;
  asaas_customer_id: string | null;
  asaas_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

// Config visual de uma mentoria (foto do checkout /m)
export type MentoriaConfigRow = {
  mentoria: string;       // elite | partiu10k
  image_src: string | null;
  updated_at: string;
};

// Documento anexado a um mentorado (contrato / nota fiscal)
export type MentoradoDocRow = {
  id: string;
  mentorado_id: string;
  tipo: string;           // contrato | nota_fiscal
  nome_arquivo: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
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
      mentorados: TableDef<MentoradoRow>;
      mentorado_ciclos: TableDef<MentoradoCicloRow>;
      mentorado_reunioes: TableDef<MentoradoReuniaoRow>;
      mentoria_precos: TableDef<MentoriaPrecoRow>;
      mentoria_config: TableDef<MentoriaConfigRow>;
      vendas_mentoria: TableDef<VendaMentoriaRow>;
      mentorado_docs: TableDef<MentoradoDocRow>;
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
