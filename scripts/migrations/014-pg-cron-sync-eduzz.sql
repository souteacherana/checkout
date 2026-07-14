-- 014 — Sincronização automática da Eduzz pelo PRÓPRIO Supabase (pg_cron + pg_net).
-- Substitui o workflow do GitHub Actions (que nunca funcionou: 27 falhas por
-- falta do secret, e o agendamento do GitHub é irregular).
-- A cada 10 minutos, o banco chama o endpoint de sync com janela de 7 dias.
-- O cron diário da Vercel (30 dias) continua como varredura de segurança.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento anterior se existir (idempotente)
do $$
begin
  perform cron.unschedule('sync-eduzz-10min');
exception when others then null;
end $$;

select cron.schedule(
  'sync-eduzz-10min',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://checkout.riseeducacao.com.br/api/cron/sync-eduzz?days=7',
    headers := '{"Authorization": "Bearer d826d4573339f3fa06d960564b0bf494922149a64563a73f"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
