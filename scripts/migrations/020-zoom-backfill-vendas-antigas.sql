-- ============================================================
-- 020 — Backfill do e-mail do Zoom nas vendas anteriores ao deploy.
--
-- RODAR ANTES DE DEPLOYAR a automação (migration 019 + código).
--
-- Motivo: no cartão o Asaas manda PAYMENT_CONFIRMED na aprovação e
-- PAYMENT_RECEIVED só quando a compensação cai (~30 dias depois). As vendas
-- que já estão PAID hoje ainda vão receber esse segundo webhook. Sem este
-- backfill, ele encontraria zoom_email_sent_at vazio e mandaria o link da
-- sala bem depois da aula ter acontecido.
--
-- Marcamos só o que já está PAID. Linhas PIX_PENDING ficam de fora de
-- propósito: um Pix gerado hoje ainda pode ser pago amanhã, já com a
-- automação no ar, e essa pessoa DEVE receber o e-mail normalmente.
--
-- Quem já pagou antes do deploy precisa receber o link manualmente.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

-- Confira quem será marcado antes de aplicar:
--   select id, created_at, customer_email, product_key, payment_method, status
--   from public.checkouts
--   where status = 'PAID' and zoom_email_sent_at is null;

update public.checkouts
   set zoom_email_sent_at = now()
 where status = 'PAID'
   and zoom_email_sent_at is null;
