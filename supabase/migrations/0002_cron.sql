-- supabase/migrations/0002_cron.sql
--
-- Schedules the sync-student edge function to run automatically so
-- daily/weekly deltas keep accumulating without anyone clicking refresh.
-- Requires the `pg_cron` and `pg_net` extensions (enable them in
-- Supabase Dashboard -> Database -> Extensions, or via the lines below
-- if your project allows it).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY before running, or set
-- these via Supabase Vault and reference them — see README for details.
select cron.schedule(
  'sync-all-students-daily',
  '0 2 * * *', -- 02:00 UTC every day; adjust to suit your timezone
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.functions.supabase.co/sync-student',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Optional: run every 6 hours instead for more granular "today" numbers
-- as the day progresses (uncomment and remove the daily one above if
-- you'd rather have this).
--
-- select cron.schedule(
--   'sync-all-students-6h',
--   '0 */6 * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT_REF.functions.supabase.co/sync-student',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_ANON_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
