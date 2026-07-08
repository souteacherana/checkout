-- 013 — Controle de Reuniões/Consultorias por mentorado
--   Elite: Consultoria Individual 1x/mês (Henrique, Ricardo, Ana, Renata Saia)
--   P10k : CS 1x/mês + Extra (consultoria com a Ana quando bate o faturamento)
create table if not exists public.mentorado_reunioes (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  tipo text not null,          -- consultoria (elite) | cs (p10k) | extra_ana (p10k)
  consultor text,
  data date not null default current_date,
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reunioes_mentorado on public.mentorado_reunioes(mentorado_id);

alter table public.mentorado_reunioes enable row level security;

create policy reunioes_select on public.mentorado_reunioes
  for select to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN','EMMY'));
create policy reunioes_insert on public.mentorado_reunioes
  for insert to authenticated
  with check (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));
create policy reunioes_delete on public.mentorado_reunioes
  for delete to authenticated
  using (public.current_user_role() in ('ANA','ADMIN','SUPERADMIN'));
