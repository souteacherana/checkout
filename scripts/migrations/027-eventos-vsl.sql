-- ============================================================
-- 027 — Funil da VSL (acesso → play → pitch → clique no WhatsApp).
--
-- A VSL da Black não tem formulário: a pessoa assiste e clica no WhatsApp.
-- Sem esta tabela, acessos e cliques só existiriam na Meta e no GA4, que
-- amostram, atrasam e não cruzam com o nosso painel.
--
-- Nenhum dado pessoal: `visitante` é um id aleatório gerado no navegador
-- (localStorage), só pra contar pessoas em vez de recarregamentos.
--
-- `campanha` é o slug do produto, como em `leads`, pra próxima VSL reaproveitar
-- a tabela.
--
-- Rodar no SQL Editor do Supabase ANTES de publicar o código.
-- ============================================================

create table if not exists public.vsl_eventos (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  campanha      text not null,
  visitante     uuid not null,
  evento        text not null check (evento in ('acesso', 'play', 'pitch', 'clique')),
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text
);

create index if not exists vsl_eventos_campanha_created_idx
  on public.vsl_eventos (campanha, created_at);

-- Escrita e leitura só pela API (service role). RLS sem policy fecha a chave
-- anônima.
alter table public.vsl_eventos enable row level security;

-- Agrega no banco: a VSL pode ter dezenas de milhares de acessos, e trazer
-- linha por linha pro painel seria lento.
create or replace function public.vsl_metricas(p_campanha text, p_de timestamptz, p_ate timestamptz)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select * from vsl_eventos
    where campanha = p_campanha and created_at >= p_de and created_at < p_ate
  ),
  origem as (
    select 'utm_source' as campo, coalesce(utm_source, '(sem UTM)') as valor, visitante, evento from base
    union all
    select 'utm_campaign', coalesce(utm_campaign, '(sem UTM)'), visitante, evento from base
    union all
    select 'utm_content', coalesce(utm_content, '(sem UTM)'), visitante, evento from base
  )
  select json_build_object(
    'funil', (
      select coalesce(json_agg(f), '[]'::json) from (
        select evento, count(*) as eventos, count(distinct visitante) as visitantes
        from base group by evento
      ) f
    ),
    'por_dia', (
      select coalesce(json_agg(d order by d.dia), '[]'::json) from (
        select to_char(created_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as dia,
               evento, count(distinct visitante) as visitantes
        from base group by 1, 2
      ) d
    ),
    'por_origem', (
      select coalesce(json_agg(o), '[]'::json) from (
        select campo, valor,
               count(distinct visitante) filter (where evento = 'acesso') as acessos,
               count(distinct visitante) filter (where evento = 'clique') as cliques
        from origem group by campo, valor
      ) o
    )
  );
$$;

revoke all on function public.vsl_metricas(text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.vsl_metricas(text, timestamptz, timestamptz) to service_role;

-- Produto da VSL no painel, do tipo captação (sem cobrança).
insert into public.products
  (slug, title, price, accent_color, accent_color_hover, landing_url, tipo, tem_aula_ao_vivo)
select
  'blackdateacher', 'Black da Teacher (VSL)', 0, '#c81010', '#a30d0d',
  'https://www.riseeducacao.com.br/blackdateacher', 'captacao', false
where not exists (select 1 from public.products where slug = 'blackdateacher');
