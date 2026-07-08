-- ============================================================
-- 012 — Separa a PESSOA (mentorado) do PERÍODO (ciclo de mentoria).
--   mentorados          → dados de contato + resumo financeiro BRUTO do Asaas
--   mentorado_ciclos    → cada período curado pela Ana (datas, valor, tags…)
-- Preserva 100% do trabalho manual: cada mentorado atual vira 1 ciclo.
-- As colunas antigas de mentorados NÃO são removidas (ficam de backup).
-- ============================================================

-- 1. Tabela de ciclos
create table if not exists public.mentorado_ciclos (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  numero int not null default 1,
  tags text[] not null default '{ativo}',
  data_inicio date,
  data_termino date,
  duracao_meses int not null default 6,
  valor_contrato numeric,        -- deste ciclo (curado; pode puxar do Asaas)
  valor_pago numeric,            -- deste ciclo
  forma_pagamento text,
  imersao_rise text,             -- ano(s) de ingresso Rise deste ciclo
  caneca text,                   -- Elite
  origem text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ciclos_mentorado on public.mentorado_ciclos(mentorado_id);

alter table public.mentorado_ciclos enable row level security;

-- Leitura: ANA/ADMIN/SUPER/EMMY. Escrita direta: ANA/ADMIN/SUPER
-- (EMMY edita data_inicio de ciclos do P10k pela API com service role)
create policy ciclos_select on public.mentorado_ciclos
  for select to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN','EMMY'));
create policy ciclos_insert on public.mentorado_ciclos
  for insert to authenticated
  with check (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));
create policy ciclos_update on public.mentorado_ciclos
  for update to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'))
  with check (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));
create policy ciclos_delete on public.mentorado_ciclos
  for delete to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));

-- 2. Resumo financeiro bruto do Asaas, agora explicitamente na PESSOA
alter table public.mentorados
  add column if not exists asaas_total_contratado numeric,
  add column if not exists asaas_total_pago numeric,
  add column if not exists materia_pessoa text;   -- matéria que ensina (P10k) fica na pessoa

update public.mentorados set
  asaas_total_contratado = valor_contrato,
  asaas_total_pago = valor_pago,
  materia_pessoa = materia
where deleted_at is null;

-- 3. Migra cada mentorado atual → 1 ciclo, preservando tudo que foi curado
insert into public.mentorado_ciclos
  (mentorado_id, numero, tags, data_inicio, data_termino, duracao_meses,
   valor_contrato, valor_pago, forma_pagamento, imersao_rise, caneca, origem, notas, created_at)
select
  m.id,
  coalesce(m.ciclo, 1),
  case when cardinality(m.tags) = 0 then array['ativo'] else m.tags end,
  m.data_inicio, m.data_termino, coalesce(m.duracao_meses, 6),
  m.valor_contrato, m.valor_pago, m.forma_pagamento, m.imersao_rise, m.caneca, m.origem, m.notas, m.created_at
from public.mentorados m
where m.deleted_at is null
  and not exists (select 1 from public.mentorado_ciclos c where c.mentorado_id = m.id);
