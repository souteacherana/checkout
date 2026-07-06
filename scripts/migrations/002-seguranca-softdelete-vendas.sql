-- ============================================================
-- 002 — Segurança (RLS canônico), soft delete e view unificada
-- Rodar no SQL Editor do Supabase ANTES do deploy do código.
-- ============================================================

-- 1. Helper: role do usuário logado (security definer pra poder
--    ler user_roles mesmo com a tabela fechada pra clientes)
create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.user_roles where email = (auth.jwt()->>'email') limit 1;
$$;

-- 2. Soft delete + marcação de recuperação de abandono
alter table public.checkouts   add column if not exists deleted_at timestamptz;
alter table public.eduzz_sales add column if not exists deleted_at timestamptz;
alter table public.checkouts   add column if not exists recovery_contacted_at timestamptz;

-- Índices de apoio
create index if not exists idx_checkouts_product_key on public.checkouts(product_key);
create index if not exists idx_checkouts_status      on public.checkouts(status);
create index if not exists idx_eduzz_product_name    on public.eduzz_sales(product_name);

-- 3. Políticas RLS canônicas: derruba todas as existentes
--    nessas tabelas e recria um conjunto limpo e auditável.
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('products', 'checkouts', 'eduzz_sales', 'user_roles')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

alter table public.products    enable row level security;
alter table public.checkouts   enable row level security;
alter table public.eduzz_sales enable row level security;
alter table public.user_roles  enable row level security;

-- PRODUCTS: leitura só pra logados (fecha o vazamento público do
-- fb_capi_token; a página pública de checkout usa o service role).
-- Escrita só ADMIN/SUPERADMIN.
create policy products_select_authenticated on public.products
  for select to authenticated using (true);
create policy products_insert_admin on public.products
  for insert to authenticated
  with check (public.current_user_role() in ('ADMIN','SUPERADMIN'));
create policy products_update_admin on public.products
  for update to authenticated
  using (public.current_user_role() in ('ADMIN','SUPERADMIN'))
  with check (public.current_user_role() in ('ADMIN','SUPERADMIN'));
create policy products_delete_admin on public.products
  for delete to authenticated
  using (public.current_user_role() in ('ADMIN','SUPERADMIN'));

-- CHECKOUTS: leitura pra logados; update (soft delete / recuperação)
-- só ADMIN+. Sem DELETE físico via cliente — exclusão agora é soft.
create policy checkouts_select_authenticated on public.checkouts
  for select to authenticated using (true);
create policy checkouts_update_admin on public.checkouts
  for update to authenticated
  using (public.current_user_role() in ('ADMIN','SUPERADMIN'))
  with check (public.current_user_role() in ('ADMIN','SUPERADMIN'));

-- EDUZZ_SALES: idem
create policy eduzz_select_authenticated on public.eduzz_sales
  for select to authenticated using (true);
create policy eduzz_update_admin on public.eduzz_sales
  for update to authenticated
  using (public.current_user_role() in ('ADMIN','SUPERADMIN'))
  with check (public.current_user_role() in ('ADMIN','SUPERADMIN'));

-- USER_ROLES: nenhuma política = nenhum acesso via cliente.
-- (Toda a gestão de equipe passa pelas APIs com service role.)

-- 4. VIEW VENDAS — a fonte única de verdade de vendas.
--    security_invoker: respeita o RLS de quem consulta.
create or replace view public.vendas
with (security_invoker = true) as
select
  'checkout'::text                         as fonte,
  c.id::text                               as id_origem,
  case c.status
    when 'PAID'                     then 'paga'
    when 'PIX_PENDING'              then 'pix_pendente'
    when 'PENDING'                  then 'abandono'
    when 'PAYMENT_MISMATCH_REVIEW'  then 'em_revisao'
    else lower(c.status)
  end                                      as status,
  c.customer_name                          as cliente_nome,
  c.customer_email                         as cliente_email,
  c.customer_phone                         as cliente_telefone,
  coalesce(lower(nullif(c.product_key,'')), pl.slug) as produto_slug,
  c.product_name                           as produto_nome,
  c.amount                                 as valor_bruto,
  coalesce(c.net_value, c.amount * 0.95)   as valor_liquido,
  c.payment_method                         as metodo_pagamento,
  coalesce(c.installments, 1)              as parcelas,
  c.utm_source, c.utm_medium, c.utm_campaign, c.utm_content, c.utm_term,
  c.created_at,
  c.payment_date                           as pago_em,
  c.recovery_contacted_at
from public.checkouts c
left join lateral (
  select slug from public.products
  where c.product_key is null and title = c.product_name
  limit 1
) pl on true
where c.deleted_at is null

union all

select
  'eduzz',
  e.id::text,
  case lower(coalesce(e.status,''))
    when 'paid'            then 'paga'
    when 'pago'            then 'paga'
    when 'aprovado'        then 'paga'
    when 'waiting_payment' then 'pix_pendente'
    when 'open'            then 'abandono'
    when 'refunded'        then 'reembolsada'
    when 'chargeback'      then 'reembolsada'
    when 'contested'       then 'reembolsada'
    when 'canceled'        then 'cancelada'
    when 'cancelled'       then 'cancelada'
    when 'expired'         then 'cancelada'
    when 'duplicated'      then 'cancelada'
    else lower(coalesce(e.status, 'desconhecido'))
  end,
  e.client_name,
  e.client_email,
  e.client_phone,
  pe.slug,
  e.product_name,
  e.value,
  coalesce(e.net_value, e.value * 0.95),
  e.payment_method,
  coalesce(e.installments, 1),
  e.utm_source, e.utm_medium, e.utm_campaign, e.utm_content, e.utm_term,
  e.created_at,
  e.paid_at,
  null::timestamptz
from public.eduzz_sales e
left join lateral (
  -- Convenção: o nome na Eduzz começa com o título interno do produto.
  -- Em caso de múltiplos matches, vence o título mais longo (mais específico).
  select slug from public.products
  where e.product_name like title || '%'
  order by length(title) desc
  limit 1
) pe on true
where e.deleted_at is null;

-- 5. RPC: vendas pagas e receita agrupadas por produto (pro hub)
create or replace function public.vendas_stats_por_produto()
returns table (produto_slug text, vendas bigint, receita numeric)
language sql stable as $$
  select
    v.produto_slug,
    count(*) filter (where v.status = 'paga'),
    coalesce(sum(v.valor_bruto) filter (where v.status = 'paga'), 0)
  from public.vendas v
  group by v.produto_slug;
$$;
