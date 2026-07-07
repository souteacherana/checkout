-- 006 — Arquivamento de produtos (ocultar sem excluir; histórico preservado)
alter table public.products add column if not exists archived_at timestamptz;
