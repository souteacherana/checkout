-- ============================================================
-- 016 — Checkout de mentoria (vendas do seller), tabela de preços
--       e documentos de mentorados (contrato / nota fiscal).
-- Rodar no SQL Editor do Supabase.
-- ============================================================

-- 1. PREÇOS — uma linha por opção de pagamento, editável sem deploy.
--    Necessário porque os valores máximos (12x cartão / 6x boleto)
--    são âncoras comerciais que não seguem a fórmula por parcela.
create table if not exists public.mentoria_precos (
  mentoria text not null check (mentoria in ('elite', 'partiu10k')),
  metodo text not null check (metodo in ('PIX', 'BOLETO', 'CREDIT_CARD')),
  parcelas int not null check (parcelas between 1 and 12),
  valor_parcela numeric not null,
  primary key (mentoria, metodo, parcelas)
);

alter table public.mentoria_precos enable row level security;

-- Leitura pra qualquer logado (o form do seller consulta direto);
-- escrita só ADMIN/SUPERADMIN. A página pública lê via API (service role).
create policy precos_select on public.mentoria_precos
  for select to authenticated using (true);
create policy precos_write on public.mentoria_precos
  for all to authenticated
  using (public.current_user_role() in ('ADMIN','SUPERADMIN'))
  with check (public.current_user_role() in ('ADMIN','SUPERADMIN'));

-- 2. VENDAS DE MENTORIA — uma linha por link gerado pelo seller.
create table if not exists public.vendas_mentoria (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,              -- vai na URL /m/{codigo}
  seller_email text not null,               -- atribuição do "Minhas Vendas"
  mentoria text not null check (mentoria in ('elite', 'partiu10k')),
  renovacao boolean not null default false,
  valor_total numeric not null,
  entrada_valor numeric,                    -- pix manual, fora do Asaas
  entrada_facilitada boolean not null default false,

  -- Dados do cliente (bloquinho do WhatsApp digitalizado)
  cliente_nome text not null,
  cliente_telefone text,
  cliente_email text,
  cliente_cpf text,
  cliente_rg text,
  cliente_nacionalidade text,
  cliente_estado_civil text,
  cliente_profissao text,
  end_rua text,
  end_numero text,
  end_bairro text,
  end_cidade text,
  end_estado text,
  end_cep text,

  -- Contrato
  descricao text,
  prazo_meses int not null default 6,

  -- Execução do pagamento
  status text not null default 'LINK_CRIADO'
    check (status in ('LINK_CRIADO','AGUARDANDO_PAGAMENTO','PARCIAL','PAGO','CANCELADO')),
  metodo_escolhido text,
  parcelas_escolhidas int,
  asaas_customer_id text,
  asaas_payment_id text,                    -- 1ª cobrança ou installment
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendas_mentoria_seller on public.vendas_mentoria(seller_email);
create index if not exists idx_vendas_mentoria_status on public.vendas_mentoria(status);

alter table public.vendas_mentoria enable row level security;

-- Seller vê as próprias; ANA/ADMIN/SUPERADMIN veem todas.
-- Escrita nenhuma via cliente: criação e updates passam pelas APIs (service role),
-- que é onde ficam CPF/RG/endereço — a página pública nunca lê a tabela direto.
create policy vendas_mentoria_select on public.vendas_mentoria
  for select to authenticated
  using (
    seller_email = (auth.jwt()->>'email')
    or public.current_user_role() in ('ANA','ADMIN','SUPERADMIN')
  );

-- 3. DOCUMENTOS DE MENTORADOS — contrato e nota fiscal anexados.
create table if not exists public.mentorado_docs (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  tipo text not null check (tipo in ('contrato', 'nota_fiscal')),
  nome_arquivo text not null,
  storage_path text not null,               -- caminho no bucket mentorados-docs
  uploaded_by text,                         -- e-mail de quem anexou
  created_at timestamptz not null default now()
);

create index if not exists idx_mentorado_docs on public.mentorado_docs(mentorado_id);

alter table public.mentorado_docs enable row level security;

-- Mesma visibilidade da área de mentorados; escrita via API (service role).
create policy mentorado_docs_select on public.mentorado_docs
  for select to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN','EMMY'));

-- Bucket privado pros arquivos (idempotente). Download via URL assinada pela API.
insert into storage.buckets (id, name, public)
values ('mentorados-docs', 'mentorados-docs', false)
on conflict (id) do nothing;

-- 4. SEED DE PREÇOS
-- Partiu 10k: valores exatos da tabela oficial (12x é âncora ÷10, intencional).
insert into public.mentoria_precos (mentoria, metodo, parcelas, valor_parcela) values
  ('partiu10k', 'PIX',         1, 3797.15),
  ('partiu10k', 'CREDIT_CARD', 1, 3997.00),
  ('partiu10k', 'CREDIT_CARD', 2, 2047.50),
  ('partiu10k', 'CREDIT_CARD', 3, 1381.33),
  ('partiu10k', 'CREDIT_CARD', 4, 1048.25),
  ('partiu10k', 'CREDIT_CARD', 5,  848.40),
  ('partiu10k', 'CREDIT_CARD', 6,  715.15),
  ('partiu10k', 'CREDIT_CARD', 7,  620.00),
  ('partiu10k', 'CREDIT_CARD', 8,  548.62),
  ('partiu10k', 'CREDIT_CARD', 9,  493.11),
  ('partiu10k', 'CREDIT_CARD', 10, 448.70),
  ('partiu10k', 'CREDIT_CARD', 11, 412.36),
  ('partiu10k', 'CREDIT_CARD', 12, 399.70),
  ('partiu10k', 'BOLETO',      1, 3997.00),
  ('partiu10k', 'BOLETO',      2, 2047.50),
  ('partiu10k', 'BOLETO',      3, 1381.33),
  ('partiu10k', 'BOLETO',      4, 1048.25),
  ('partiu10k', 'BOLETO',      5,  848.40),
  ('partiu10k', 'BOLETO',      6,  715.15),
-- Elite: base 12.000; +120/parcela cartão e +100/parcela boleto (2x em diante);
-- 12x cartão (1.250) e 6x boleto (2.250) são as âncoras passadas pela Ana.
-- ⚠ Intermediárias DERIVADAS da regra — confirmar com a Ana antes da página
--   pública ir ao ar. Corrigir = update nesta tabela, sem deploy.
  ('elite', 'PIX',         1, 12000.00),
  ('elite', 'CREDIT_CARD', 1, 12000.00),
  ('elite', 'CREDIT_CARD', 2,  6120.00),
  ('elite', 'CREDIT_CARD', 3,  4120.00),
  ('elite', 'CREDIT_CARD', 4,  3120.00),
  ('elite', 'CREDIT_CARD', 5,  2520.00),
  ('elite', 'CREDIT_CARD', 6,  2120.00),
  ('elite', 'CREDIT_CARD', 7,  1834.28),
  ('elite', 'CREDIT_CARD', 8,  1620.00),
  ('elite', 'CREDIT_CARD', 9,  1453.33),
  ('elite', 'CREDIT_CARD', 10, 1320.00),
  ('elite', 'CREDIT_CARD', 11, 1210.90),
  ('elite', 'CREDIT_CARD', 12, 1250.00),
  ('elite', 'BOLETO',      1, 12000.00),
  ('elite', 'BOLETO',      2,  6100.00),
  ('elite', 'BOLETO',      3,  4100.00),
  ('elite', 'BOLETO',      4,  3100.00),
  ('elite', 'BOLETO',      5,  2500.00),
  ('elite', 'BOLETO',      6,  2250.00)
on conflict (mentoria, metodo, parcelas)
do update set valor_parcela = excluded.valor_parcela;
