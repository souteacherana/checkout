-- ============================================================
-- 024 — Leads de captação das landings.
--
-- A landing da Black não vende nada: ela inscreve gente num evento ao vivo no
-- YouTube. Não passa pelo checkout, então não gera linha em `checkouts` e não
-- existe produto em `products` pra pendurar a inscrição. Sem uma tabela
-- própria, o lead só existiria no Mailchimp — e aí a base de contatos da
-- campanha fica refém de um serviço externo, sem jeito de cruzar com venda
-- depois nem de reemitir se a automação falhar.
--
-- A coluna `campanha` existe pra esta tabela servir a próxima landing de
-- captação também, em vez de criar uma tabela por campanha.
--
-- As UTMs vêm desnormalizadas, nas mesmas colunas e com os mesmos nomes de
-- `checkouts`: é o que permite cruzar "quem se inscreveu" com "quem comprou"
-- sem traduzir nomes de coluna no meio do caminho.
--
-- Único por (campanha, e-mail): reenviar o formulário ATUALIZA o lead em vez de
-- duplicar. É constraint simples, e não índice parcial sobre lower(email),
-- porque o upsert do PostgREST só casa com colunas puras; quem garante o e-mail
-- em minúsculas é a rota (src/app/api/lead/route.ts).
--
-- Rodar no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  campanha      text        not null,
  nome          text        not null,
  email         text        not null,
  telefone      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  fbclid        text,
  gclid         text,
  -- Null enquanto não tentou; false quando o Mailchimp recusou. Serve pra
  -- reprocessar depois sem perder o lead, já que a automação de e-mail não
  -- pode derrubar o cadastro (ver src/app/api/lead/route.ts).
  mailchimp_ok  boolean,
  deleted_at    timestamptz,
  constraint leads_campanha_email_uniq unique (campanha, email)
);

create index if not exists leads_campanha_created_idx
  on public.leads (campanha, created_at desc)
  where deleted_at is null;

-- A tabela é escrita só pela rota de API, que usa a service role e passa por
-- cima do RLS. Ligar o RLS sem policy deixa a chave anônima sem nenhum acesso
-- — que é exatamente o que se quer: ninguém lê a base de leads pelo cliente.
alter table public.leads enable row level security;
