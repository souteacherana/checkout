-- ============================================================
-- 026 — Aplicações e o produto do sinal da Black.
--
-- Depois da live, quem quer a vaga responde as perguntas da aplicação e paga
-- R$ 50 de sinal. Até o ano passado isso era um Google Forms com a chave Pix do
-- CNPJ no texto e comprovante pelo WhatsApp. Agora as respostas ficam aqui e o
-- pagamento passa pelo checkout, com confirmação automática do Asaas.
--
-- As respostas de múltipla escolha e de texto ficam em `respostas` (jsonb):
-- a lista de perguntas muda de campanha pra campanha, e uma coluna por
-- pergunta exigiria migração a cada lançamento. Nome, e-mail, WhatsApp e
-- Instagram têm coluna própria porque é por eles que o time busca e cruza com
-- a venda (pelo e-mail).
--
-- Rodar no SQL Editor do Supabase ANTES de publicar o código.
-- ============================================================

create table if not exists public.aplicacoes (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  campanha      text        not null,
  email         text        not null,
  nome          text        not null,
  whatsapp      text        not null,
  instagram     text,
  respostas     jsonb       not null default '{}'::jsonb,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  fbclid        text,
  gclid         text,
  deleted_at    timestamptz
);

create index if not exists aplicacoes_campanha_created_idx
  on public.aplicacoes (campanha, created_at desc)
  where deleted_at is null;

create index if not exists aplicacoes_email_idx
  on public.aplicacoes (lower(email));

-- Escrita só pela rota de API, com a service role: sem policy, a chave anônima
-- não lê nem grava nada.
alter table public.aplicacoes enable row level security;

-- Produto do sinal. É venda comum: Pix ou cartão no checkout de sempre.
insert into public.products
  (slug, title, price, accent_color, accent_color_hover, landing_url, tipo, tem_aula_ao_vivo)
select
  'black-sinal', 'Sinal Black November - Mentoria Partiu 10k', 50, '#c81010', '#a30d0d',
  'https://www.riseeducacao.com.br/black/sinal', 'venda', false
where not exists (select 1 from public.products where slug = 'black-sinal');
