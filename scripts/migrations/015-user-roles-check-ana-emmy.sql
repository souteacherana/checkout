-- ============================================================
-- 015 — Libera ANA e EMMY na constraint de cargo da user_roles
-- Rodar no SQL Editor do Supabase.
--
-- A 007 adicionou ANA/EMMY às políticas de RLS, mas a tabela
-- user_roles (criada antes das migrations) tem um CHECK que só
-- conhece os 4 cargos originais — gravar ANA/EMMY estourava com
-- "violates check constraint user_roles_role_check".
-- ============================================================

alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('VIEWER', 'VENDEDOR', 'EMMY', 'ANA', 'ADMIN', 'SUPERADMIN'));
