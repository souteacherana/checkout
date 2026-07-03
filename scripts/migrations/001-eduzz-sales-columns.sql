-- Novas colunas da tabela eduzz_sales para armazenar os dados completos
-- retornados pela API MyEduzz (rodar no SQL Editor do Supabase).
alter table public.eduzz_sales
  add column if not exists net_value numeric,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text,
  add column if not exists installments integer default 1,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists sku text,
  add column if not exists offer_name text;
