-- supabase/migrations/0001_init.sql
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ============================================================
-- STUDENTS  — the class roster, self-registered from the UI
-- ============================================================
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  leetcode_username text not null unique,
  display_name text,
  joined_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- ============================================================
-- SNAPSHOTS — one row per student per day, captured by the
-- sync-student edge function. This is what lets us compute
-- "questions solved today" / "this week" instead of just a
-- live cumulative total.
-- ============================================================
create table if not exists snapshots (
  id bigint generated always as identity primary key,
  student_id uuid not null references students(id) on delete cascade,
  captured_on date not null default current_date,
  easy_solved int not null default 0,
  medium_solved int not null default 0,
  hard_solved int not null default 0,
  total_solved int not null default 0,
  ranking int,
  raw jsonb,                -- full API payload, kept for debugging/future stats
  created_at timestamptz not null default now(),
  unique (student_id, captured_on)
);

create index if not exists snapshots_student_date_idx
  on snapshots (student_id, captured_on desc);

-- ============================================================
-- SETTINGS — single-row table holding the shared scoring weights
-- so every student sees the same leaderboard config (editable
-- from the UI, persisted instead of being purely client-side).
-- ============================================================
create table if not exists settings (
  id int primary key default 1,
  easy_weight numeric not null default 1,
  medium_weight numeric not null default 3,
  hard_weight numeric not null default 5,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- VIEW: latest_snapshot — most recent snapshot per student,
-- used for the "Total Solved" / "Score" tabs.
-- ============================================================
create or replace view latest_snapshot as
select distinct on (student_id)
  student_id, captured_on, easy_solved, medium_solved, hard_solved, total_solved, ranking
from snapshots
order by student_id, captured_on desc;

-- ============================================================
-- VIEW: daily_delta — solved-today count per student
-- (today's snapshot minus yesterday's, floor at 0 if no prior
-- snapshot exists yet, e.g. brand-new student).
-- ============================================================
create or replace view daily_delta as
select
  t.student_id,
  t.total_solved as total_today,
  coalesce(t.total_solved - y.total_solved, t.total_solved) as solved_today,
  coalesce(t.easy_solved - y.easy_solved, t.easy_solved) as easy_today,
  coalesce(t.medium_solved - y.medium_solved, t.medium_solved) as medium_today,
  coalesce(t.hard_solved - y.hard_solved, t.hard_solved) as hard_today
from snapshots t
left join snapshots y
  on y.student_id = t.student_id and y.captured_on = t.captured_on - 1
where t.captured_on = current_date;

-- ============================================================
-- VIEW: weekly_delta — solved in the last 7 days per student
-- (today's snapshot minus the snapshot from 7 days ago, or the
-- earliest snapshot on/after that date if a day was missed).
-- ============================================================
create or replace view weekly_delta as
with today as (
  select * from snapshots where captured_on = current_date
),
week_ago as (
  select distinct on (student_id) *
  from snapshots
  where captured_on <= current_date - 7
  order by student_id, captured_on desc
)
select
  t.student_id,
  coalesce(t.total_solved - w.total_solved, t.total_solved) as solved_week,
  coalesce(t.easy_solved - w.easy_solved, t.easy_solved) as easy_week,
  coalesce(t.medium_solved - w.medium_solved, t.medium_solved) as medium_week,
  coalesce(t.hard_solved - w.hard_solved, t.hard_solved) as hard_week
from today t
left join week_ago w on w.student_id = t.student_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- Public read for the leaderboard. Public insert on students
-- (self-registration) but no public update/delete. Snapshots
-- and settings are written only by the edge function using the
-- service role key (which bypasses RLS), so no public write
-- policy is needed for them.
-- ============================================================
alter table students enable row level security;
alter table snapshots enable row level security;
alter table settings enable row level security;

create policy "Public can read students"
  on students for select using (true);

create policy "Public can register themselves"
  on students for insert with check (true);

create policy "Public can read snapshots"
  on snapshots for select using (true);

create policy "Public can read settings"
  on settings for select using (true);

-- Allow anyone to update the shared weight settings (classroom tool,
-- low stakes). Tighten this with auth if you need per-teacher control.
create policy "Public can update settings"
  on settings for update using (true) with check (true);
