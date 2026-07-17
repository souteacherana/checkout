-- ============================================================
-- 017 — Config visual das mentorias (foto do checkout /m).
-- Editável na aba Mentorias; o checkout lê daqui — sem deploy.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.mentoria_config (
  mentoria text primary key check (mentoria in ('elite', 'partiu10k')),
  image_src text,
  updated_at timestamptz not null default now()
);

alter table public.mentoria_config enable row level security;

-- Leitura pra logados (a aba Mentorias mostra); escrita via API (service role)
create policy mentoria_config_select on public.mentoria_config
  for select to authenticated using (true);

insert into public.mentoria_config (mentoria) values ('partiu10k'), ('elite')
on conflict (mentoria) do nothing;
