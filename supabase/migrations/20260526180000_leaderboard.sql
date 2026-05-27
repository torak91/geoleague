-- Plan step 11: leaderboard table, trigger, and view.
--
-- Strategy: maintain a pre-aggregated `leaderboard_entries` table via a
-- trigger on `plays`. This gives O(log n) ranked reads and exactly one
-- Realtime broadcast per submission (step 12 wires Realtime; this step
-- is non-realtime).
--
-- Weekly period_start = Monday (Europe/Rome calendar).
-- Monthly period_start = 1st of month (Europe/Rome calendar).
--
-- The trigger uses SECURITY DEFINER so it bypasses RLS on profiles /
-- plays when looking up auxiliary data. RLS denies direct writes to
-- leaderboard_entries from any client role — only the trigger writes.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.leaderboard_entries (
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  period_type  text        not null check (period_type in ('weekly','monthly')),
  period_start date        not null,
  total_score  int         not null default 0,
  plays_count  int         not null default 0,
  best_play_id uuid        references public.plays(id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (user_id, period_type, period_start)
);

comment on table public.leaderboard_entries is
  'Per-user, per-period aggregated score. Maintained by trigger on plays.';

-- Covers `where period_type=$1 and period_start=$2 order by total_score desc`.
create index if not exists idx_leaderboard_period_score
  on public.leaderboard_entries (period_type, period_start, total_score desc);

-- ---------------------------------------------------------------------------
-- Trigger function: upsert weekly + monthly entries after a new play lands.
-- ---------------------------------------------------------------------------
create or replace function public.apply_play_to_leaderboards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rome_ts        timestamp;
  v_weekly_start   date;
  v_monthly_start  date;
begin
  -- AT TIME ZONE on a timestamptz yields a naive timestamp in that zone.
  v_rome_ts       := new.submitted_at at time zone 'Europe/Rome';
  v_weekly_start  := date_trunc('week',  v_rome_ts)::date;  -- Monday
  v_monthly_start := date_trunc('month', v_rome_ts)::date;  -- 1st

  -- Weekly upsert
  insert into public.leaderboard_entries (
    user_id, period_type, period_start, total_score, plays_count, best_play_id
  )
  values (new.user_id, 'weekly', v_weekly_start, new.total_score, 1, new.id)
  on conflict (user_id, period_type, period_start) do update
  set
    total_score = public.leaderboard_entries.total_score + excluded.total_score,
    plays_count = public.leaderboard_entries.plays_count + 1,
    best_play_id = case
      when public.leaderboard_entries.best_play_id is null then excluded.best_play_id
      when (
        select p.total_score from public.plays p
        where p.id = public.leaderboard_entries.best_play_id
      ) < excluded.total_score then excluded.best_play_id
      else public.leaderboard_entries.best_play_id
    end,
    updated_at = now();

  -- Monthly upsert
  insert into public.leaderboard_entries (
    user_id, period_type, period_start, total_score, plays_count, best_play_id
  )
  values (new.user_id, 'monthly', v_monthly_start, new.total_score, 1, new.id)
  on conflict (user_id, period_type, period_start) do update
  set
    total_score = public.leaderboard_entries.total_score + excluded.total_score,
    plays_count = public.leaderboard_entries.plays_count + 1,
    best_play_id = case
      when public.leaderboard_entries.best_play_id is null then excluded.best_play_id
      when (
        select p.total_score from public.plays p
        where p.id = public.leaderboard_entries.best_play_id
      ) < excluded.total_score then excluded.best_play_id
      else public.leaderboard_entries.best_play_id
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists plays_after_insert_leaderboards on public.plays;
create trigger plays_after_insert_leaderboards
  after insert on public.plays
  for each row execute function public.apply_play_to_leaderboards();

-- ---------------------------------------------------------------------------
-- View: leaderboard rows joined with public profile fields, ranked.
-- Owner = postgres → bypasses RLS on profiles when read by anon/authenticated.
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard_view as
select
  le.user_id,
  le.period_type,
  le.period_start,
  le.total_score,
  le.plays_count,
  le.best_play_id,
  le.updated_at,
  p.display_name,
  p.avatar_url,
  p.is_pro,
  rank() over (
    partition by le.period_type, le.period_start
    order by le.total_score desc, le.user_id
  ) as rank
from public.leaderboard_entries le
left join public.profiles p on p.id = le.user_id;

comment on view public.leaderboard_view is
  'Leaderboard rows with profile display fields and per-period rank';

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.leaderboard_entries enable row level security;
revoke all on public.leaderboard_entries from anon, authenticated;

drop policy if exists "leaderboard_entries: select all" on public.leaderboard_entries;
create policy "leaderboard_entries: select all"
  on public.leaderboard_entries for select
  using (true);

grant select on public.leaderboard_entries to anon, authenticated;
grant select on public.leaderboard_view     to anon, authenticated;
