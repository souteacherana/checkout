-- ============================================================
-- 004 — Hierarquia: role VENDEDOR, janela de 30 dias pra não-admins
--       e mascaramento do ganho líquido no nível do banco.
-- ============================================================

-- Helper: código UTM do usuário logado
create or replace function public.current_user_utm_code() returns text
language sql stable security definer set search_path = public as $$
  select utm_code from public.user_roles where email = (auth.jwt()->>'email') limit 1;
$$;

-- Leitura de CHECKOUTS por papel:
--   ADMIN/SUPERADMIN → tudo
--   VENDEDOR         → só os últimos 30 dias E só as vendas com o próprio código UTM
--   VIEWER (e resto) → só os últimos 30 dias
drop policy if exists checkouts_select_authenticated on public.checkouts;
drop policy if exists checkouts_select_by_role on public.checkouts;
create policy checkouts_select_by_role on public.checkouts
  for select to authenticated using (
    public.current_user_role() in ('ADMIN','SUPERADMIN')
    or (
      created_at >= now() - interval '30 days'
      and (
        public.current_user_role() is distinct from 'VENDEDOR'
        or utm_content = public.current_user_utm_code()
      )
    )
  );

-- Idem para EDUZZ_SALES
drop policy if exists eduzz_select_authenticated on public.eduzz_sales;
drop policy if exists eduzz_select_by_role on public.eduzz_sales;
create policy eduzz_select_by_role on public.eduzz_sales
  for select to authenticated using (
    public.current_user_role() in ('ADMIN','SUPERADMIN')
    or (
      created_at >= now() - interval '30 days'
      and (
        public.current_user_role() is distinct from 'VENDEDOR'
        or utm_content = public.current_user_utm_code()
      )
    )
  );

-- VIEW VENDAS: recriada com o valor_liquido mascarado —
-- só ADMIN/SUPERADMIN enxergam a margem real da empresa.
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
  case when public.current_user_role() in ('ADMIN','SUPERADMIN')
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
  case when public.current_user_role() in ('ADMIN','SUPERADMIN')
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
