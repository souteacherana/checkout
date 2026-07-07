-- 005 — Landing page opcional por produto (usada nos links da equipe)
alter table public.products add column if not exists landing_url text;
