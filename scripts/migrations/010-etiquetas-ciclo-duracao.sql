-- 010 — Taxonomia oficial de status (etiquetas da equipe), ciclo da mentoria,
-- duração selecionável e trava financeira pra casos multi-ciclo.
alter table public.mentorados
  add column if not exists ciclo int not null default 1,
  add column if not exists duracao_meses int not null default 6,
  add column if not exists financeiro_manual boolean not null default false;

-- Status antigo "devendo" vira "devedor" (taxonomia nova)
update public.mentorados set status = 'devedor' where status = 'devendo';
