-- 008 — Ajustes do modelo de mentorados após análise das planilhas reais da Ana:
--   "Matéria" (P10k) é a matéria que o professor ensina (texto, não brinde)
--   "Caneca" (Elite) tem estados: Não / Em produção / Sim (texto)
--   "Imersão Rise" é a edição (VIP - 2025, VIP 2026, Rise 2026...), não booleano
--   "A pagar" da planilha é a forma de pagamento; e existe coluna Renovação

alter table public.mentorados
  add column if not exists materia text,          -- P10k: matéria que ensina
  add column if not exists caneca text,           -- Elite: Não | Em produção | Sim
  add column if not exists renovacao text,        -- ex: "SIM - 8 MESES", "3º Ciclo"
  add column if not exists forma_pagamento text;  -- ex: "Asaas 12x - Cartão", "Entrada + Boleto"

-- imersao_rise: boolean → texto com a edição
alter table public.mentorados
  alter column imersao_rise drop default;
alter table public.mentorados
  alter column imersao_rise type text
  using case when imersao_rise then 'sim' else null end;

-- brinde_enviado (boolean antigo) sai de cena — substituído por caneca/materia
alter table public.mentorados drop column if exists brinde_enviado;
