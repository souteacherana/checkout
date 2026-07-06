-- 003 — Código UTM pessoal por membro da equipe (página "Meus Links")
alter table public.user_roles add column if not exists utm_code text;

-- Evita dois vendedores com o mesmo código (ignora nulos)
create unique index if not exists idx_user_roles_utm_code
  on public.user_roles (lower(utm_code)) where utm_code is not null;
