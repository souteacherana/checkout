-- ============================================================
-- 019 — Automação de e-mail de confirmação (Zoom).
-- zoom_link/zoom_datetime em products: quando preenchidos, o webhook do
-- Asaas dispara o evento no Mailchimp após pagamento confirmado.
-- zoom_email_sent_at em checkouts: trava de idempotência (o Asaas pode
-- reentregar o mesmo webhook mais de uma vez).
-- Nullable de propósito — produtos existentes (ex: HYB) não têm isso
-- ainda; obrigatoriedade é aplicada no formulário do admin, não no banco.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

alter table public.products
  add column if not exists zoom_link text,
  add column if not exists zoom_datetime timestamptz;

alter table public.checkouts
  add column if not exists zoom_email_sent_at timestamptz;
