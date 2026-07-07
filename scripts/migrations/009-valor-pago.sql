-- 009 — "A Pagar" numérico não fazia sentido (o da planilha é a forma de
-- pagamento, já em forma_pagamento). Entra valor_pago: quanto a pessoa já
-- quitou segundo o Asaas — calculado pela automação, somente leitura.
alter table public.mentorados add column if not exists valor_pago numeric;
alter table public.mentorados drop column if exists a_pagar;
