-- ============================================================
-- 023 — Nem todo produto é workshop.
--
-- A migração 019 tornou o link do Zoom obrigatório no formulário do admin,
-- pra ninguém publicar um workshop e o e-mail de confirmação sair sem a sala.
-- Só que a regra valia pra TODO produto: cadastrar algo que não é aula ao
-- vivo obrigava a inventar um link do Zoom só pra conseguir salvar — e um
-- link inventado no banco é pior que campo vazio, porque o webhook do Asaas
-- decide mandar o e-mail da sala justamente pela presença do zoom_link.
--
-- A coluna separa as duas coisas: a obrigatoriedade continua existindo, mas
-- só pra quem declarou ter aula ao vivo.
--
-- Default true e backfill: todo produto cadastrado até aqui passou pela regra
-- antiga, então é workshop — exceto os que ficaram sem link (a 019 criou a
-- coluna nullable e produtos antigos, como o HYB, nunca preencheram).
--
-- Rodar no SQL Editor do Supabase.
-- ============================================================

alter table public.products
  add column if not exists tem_aula_ao_vivo boolean not null default true;

update public.products
   set tem_aula_ao_vivo = false
 where coalesce(zoom_link, '') = '';
