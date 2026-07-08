-- 011 — Etiquetas viram TAGS múltiplas (um mentorado pode ter várias:
-- Devedor + Cliente problema, etc.). A barra de filtro fica enxuta
-- (Todos / Ativos / Entrada Facilitada); as demais são só tags.
alter table public.mentorados add column if not exists tags text[] not null default '{}';

-- Migra o status único atual para dentro das tags
update public.mentorados
  set tags = array[status]
  where status is not null and status <> '' and cardinality(tags) = 0;

-- Novos mentorados (webhook/import) nascem como "ativo"
alter table public.mentorados alter column tags set default '{ativo}';
