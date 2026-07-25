-- ============================================================
-- 018 — Guarda os timestamps CRUS da API da Eduzz.
-- Rodar no SQL Editor do Supabase.
--
-- created_at/paid_at são derivados: a Eduzz manda horário de Brasília
-- carimbado como "Z" e a ingestão soma +3h (ver src/lib/eduzz.ts).
-- Guardando o valor original como texto, qualquer mudança futura nessa
-- regra vira um recálculo local — sem depender de reimportar 3 mil vendas
-- da API deles, e sem perder a evidência do que a fonte realmente mandou.
-- ============================================================

alter table public.eduzz_sales
  add column if not exists created_at_raw text,
  add column if not exists paid_at_raw text;

comment on column public.eduzz_sales.created_at_raw is
  'String exata de createdAt como veio da API Eduzz (Brasília rotulado Z). Fonte para recalcular created_at.';
comment on column public.eduzz_sales.paid_at_raw is
  'String exata de paidAt como veio da API Eduzz (Brasília rotulado Z). Fonte para recalcular paid_at.';
