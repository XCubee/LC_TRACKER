# LeetCode Class Leaderboard (Supabase + React, no Netlify)

Students add themselves, real stats get pulled from LeetCode, and the board
shows Daily / Weekly / Total / Weighted-Score rankings — all live via
Supabase, no backend server to run yourself.

## How it works

- **Supabase Postgres** stores the roster (`students`) and one stats
  snapshot per student per day (`snapshots`). Daily/weekly numbers are
  just SQL views that diff today's snapshot against yesterday's / last
  week's.
- **One Supabase Edge Function** (`sync-student`) is the only thing that
  calls the LeetCode API. It runs server-side, so there's no CORS issue,
  and it writes results straight into `snapshots`.
- **React frontend** talks directly to Supabase (`supabase-js`) for reads,
  and calls the edge function for syncs. Realtime subscriptions mean
  everyone's board updates live when anyone joins or a sync runs.

No Netlify, no custom Express server, no manual cron server — Supabase
hosts the function and the schedule.

## 1. Create the Supabase project

1. Go to supabase.com → New project.
2. In **SQL Editor**, run `supabase/migrations/0001_init.sql`.
3. (Optional but recommended) run `supabase/migrations/0002_cron.sql` —
   first replace `YOUR_PROJECT_REF` and `YOUR_ANON_KEY` with your actual
   values (Project Settings → API). This auto-refreshes every student's
   stats once a day so "Today" / "This Week" stay accurate without
   anyone clicking the button.

## 2. Deploy the edge function

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy sync-student
```

No environment variables to set manually — `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are automatically injected into edge functions
by Supabase.

If your "LeetCode open source API" isn't
`https://leetcode-api-faisalshohag.vercel.app`, open
`supabase/functions/sync-student/index.ts` and edit the
`LEETCODE_API_BASE` constant + the field mapping in `fetchLeetCodeStats()`
to match your API's response shape. That's the only place LeetCode-specific
logic lives.

## 3. Run the frontend

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from
# Project Settings -> API
npm run dev
```

That's it — `npm run dev` is the entire local dev loop, no second process,
no proxy config, no functions emulator required (the edge function lives
on Supabase, not locally).

## 4. Deploy the frontend anywhere static

This is now a plain Vite SPA — deploy `dist/` (after `npm run build`) to
Vercel, Cloudflare Pages, GitHub Pages, S3, or yes, still Netlify if you
want, just as static hosting with zero special config. Just set the two
`VITE_SUPABASE_*` env vars in whichever host you pick.

## Data model recap

| Table/View       | Purpose                                              |
|-------------------|------------------------------------------------------|
| `students`        | Roster — self-registered from the Join form          |
| `snapshots`        | One row per student per day with raw solved counts   |
| `latest_snapshot`  | View: most recent snapshot per student (cumulative)  |
| `daily_delta`      | View: today's snapshot minus yesterday's             |
| `weekly_delta`     | View: today's snapshot minus the one from 7 days ago |
| `settings`         | Shared Easy/Medium/Hard weights, editable from UI     |

## Adjusting how often stats refresh

Edit the cron schedule in `0002_cron.sql` (`cron.schedule(... '0 2 * * *' ...)`)
— standard 5-field cron syntax, runs in UTC. You can also just hit
"Refresh All" in the UI any time, which calls the same edge function on
demand.
