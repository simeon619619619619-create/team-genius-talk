-- pg_cron job: call polymarket-tracker every 15 minutes via pg_net
-- pg_net makes HTTP POST to the edge function URL

-- Enable extensions if not already
create extension if not exists pg_net with schema extensions;

-- Remove old job if exists
select cron.unschedule('polymarket-tracker-15min')
  where exists (select 1 from cron.job where jobname = 'polymarket-tracker-15min');

-- Schedule every 15 min
select cron.schedule(
  'polymarket-tracker-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://uzdrfjunyfuzntyfsduv.supabase.co/functions/v1/polymarket-tracker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
