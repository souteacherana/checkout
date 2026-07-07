-- ============================================================
-- 007 — Área de Mentorados + roles ANA e EMMY
--   ANA  : enxerga e opera tudo (financeiro completo, sem janela
--          de 30 dias), exceto gestão de Equipe
--   EMMY : visualização (janela de 30 dias nas vendas) + edita
--          APENAS a Data de Início dos mentorados do Partiu 10k
--          (a escrita dela passa por API própria, não pelo cliente)
-- ============================================================

-- 1. Tabela de mentorados (espelho automatizado da planilha da Ana)
create table if not exists public.mentorados (
  id uuid primary key default gen_random_uuid(),
  mentoria text not null check (mentoria in ('elite', 'partiu10k')),
  status text not null default 'ativo', -- ativo | concluido | cancelado
  asaas_customer_id text,
  nome text not null,
  email text,
  telefone text,
  cpf text,
  rg text,
  endereco text,
  cep text,
  imersao_rise boolean not null default false,
  origem text,
  valor_contrato numeric,
  a_pagar numeric,
  parcelas_vencidas int not null default 0,
  brinde_enviado boolean not null default false, -- Caneca (Elite) / Matéria (P10k)
  data_inicio date,
  data_termino date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Um mentorado por cliente Asaas por mentoria (o sync/webhook usa upsert)
create unique index if not exists idx_mentorados_asaas
  on public.mentorados (mentoria, asaas_customer_id)
  where asaas_customer_id is not null;

alter table public.mentorados enable row level security;

-- Leitura: ANA/ADMIN/SUPERADMIN e EMMY (papel dela exige ver a lista)
create policy mentorados_select on public.mentorados
  for select to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN','EMMY'));

-- Escrita direta via cliente: só ANA/ADMIN/SUPERADMIN
-- (EMMY escreve a data de início pela API /api/admin/mentorados, com service role)
create policy mentorados_insert on public.mentorados
  for insert to authenticated
  with check (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));
create policy mentorados_update on public.mentorados
  for update to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'))
  with check (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));

-- 2. ANA entra no conjunto "vê tudo" das vendas (políticas + view)
drop policy if exists checkouts_select_by_role on public.checkouts;
create policy checkouts_select_by_role on public.checkouts
  for select to authenticated using (
    public.current_user_role() in ('ANA','ADMIN','SUPERADMIN')
    or (
      created_at >= now() - interval '30 days'
      and (
        public.current_user_role() is distinct from 'VENDEDOR'
        or utm_content = public.current_user_utm_code()
      )
    )
  );

drop policy if exists eduzz_select_by_role on public.eduzz_sales;
create policy eduzz_select_by_role on public.eduzz_sales
  for select to authenticated using (
    public.current_user_role() in ('ANA','ADMIN','SUPERADMIN')
    or (
      created_at >= now() - interval '30 days'
      and (
        public.current_user_role() is distinct from 'VENDEDOR'
        or utm_content = public.current_user_utm_code()
      )
    )
  );

-- Updates (soft delete / recuperação / produtos) passam a incluir ANA
drop policy if exists checkouts_update_admin on public.checkouts;
create policy checkouts_update_admin on public.checkouts
  for update to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'))
  with check (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));

drop policy if exists eduzz_update_admin on public.eduzz_sales;
create policy eduzz_update_admin on public.eduzz_sales
  for update to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'))
  with check (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));

drop policy if exists products_insert_admin on public.products;
create policy products_insert_admin on public.products
  for insert to authenticated
  with check (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));
drop policy if exists products_update_admin on public.products;
create policy products_update_admin on public.products
  for update to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'))
  with check (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));
drop policy if exists products_delete_admin on public.products;
create policy products_delete_admin on public.products
  for delete to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));

-- 3. View vendas: líquido visível também pra ANA
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
  case when public.current_user_role() in ('ANA','ADMIN','SUPERADMIN')
       then coalesce(c.net_value, c.amount * 0.95)
       else null
  end                                      as valor_liquido,
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
  case when public.current_user_role() in ('ANA','ADMIN','SUPERADMIN')
       then coalesce(e.net_value, e.value * 0.95)
       else null
  end,
  e.payment_method,
  coalesce(e.installments, 1),
  e.utm_source, e.utm_medium, e.utm_campaign, e.utm_content, e.utm_term,
  e.created_at,
  e.paid_at,
  null::timestamptz
from public.eduzz_sales e
left join lateral (
  select slug from public.products
  where e.product_name like title || '%'
  order by length(title) desc
  limit 1
) pe on true
where e.deleted_at is null;
