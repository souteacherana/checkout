-- ============================================================
-- 025 — Produto de captação.
--
-- Nem todo produto é vendido: a Black só coleta inscrição e manda a pessoa pro
-- grupo. `tipo` separa os dois casos. Em 'captacao', o painel do produto mostra
-- os leads em vez das vendas, /{slug} no checkout leva pra landing e a API de
-- checkout recusa cobrança.
--
-- `grupo_url` deixa trocar o link do WhatsApp pelo painel quando o grupo lotar,
-- sem deploy. A página /black/grupo lê este campo.
--
-- O produto `black` entra aqui porque a landing já está no ar e os leads dela
-- usam `campanha = 'black'`, que é o slug do produto.
--
-- Rodar no SQL Editor do Supabase ANTES de publicar o código que usa as colunas.
-- ============================================================

alter table public.products
  add column if not exists tipo text not null default 'venda'
    check (tipo in ('venda', 'captacao')),
  add column if not exists grupo_url text;

insert into public.products
  (slug, title, price, accent_color, accent_color_hover, landing_url, tipo, grupo_url, tem_aula_ao_vivo)
select
  'black', 'Black da Teacher', 0, '#c81010', '#a30d0d',
  'https://www.riseeducacao.com.br/black', 'captacao',
  'https://chat.whatsapp.com/HmIyM4XX8BUHsgk5RVxpFt?s=hd&p=i&mlu=4&ilr=4&iam=2', false
where not exists (select 1 from public.products where slug = 'black');
