-- ============================================================
-- 022 — Destino padrão do site.
--
-- Marca UM produto como "pra onde vai quem se perdeu": a raiz do site e
-- qualquer /{slug} que não exista mais (produto arquivado, link antigo em
-- anúncio, erro de digitação) passam a levar pra ele em vez de 404.
--
-- Antes disso o destino era o CHECKOUT_RAIZ, uma constante hardcoded em
-- src/proxy.ts. Quando o HYB foi arquivado, a raiz do site continuou
-- apontando pra ele e caiu em 404 — é esse acoplamento que a coluna desfaz:
-- agora quem troca a campanha é o painel, não um deploy.
--
-- O índice único garante a exclusividade no BANCO, não só na tela: dois
-- produtos marcados ao mesmo tempo viraria uma escolha silenciosa de qual
-- deles ganha. Ele indexa só as linhas com destino_padrao = true, e como
-- todas teriam o mesmo valor, no máximo uma sobrevive.
--
-- Rodar no SQL Editor do Supabase.
-- ============================================================

alter table public.products
  add column if not exists destino_padrao boolean not null default false;

create unique index if not exists products_destino_padrao_unico
  on public.products (destino_padrao)
  where destino_padrao;
