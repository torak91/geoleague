-- Plan step 6: RLS policies and column-level grants.
--
-- Defence in depth. Three layers:
--   1. RLS policies decide which ROWS each role can see/touch.
--   2. Column grants decide which COLUMNS a role can update (PostgreSQL
--      cannot express column scope inside an RLS policy).
--   3. Views (created in the previous migration) are the only client read
--      path for challenges.
--
-- Inserts into profiles happen via the SECURITY DEFINER bootstrap trigger
-- (migration profile_bootstrap). Inserts into plays happen via the
-- submit_guess RPC (plan step 9). Neither needs an RLS INSERT policy
-- because SECURITY DEFINER bypasses RLS.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Block direct table-wide access; users may only update their editable
-- columns. is_admin / is_pro / stripe_* / streak_* are written only by
-- service-role code paths (admin SQL, Stripe webhook, scoring trigger).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, notification_channel)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- challenges — no client-facing policies. Reads go through the views;
-- writes go through admin code paths (which use service-role or admin
-- sessions that bypass via grants).
-- ---------------------------------------------------------------------------
alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;

-- ---------------------------------------------------------------------------
-- challenge_opens — user can insert and read their own opens. Used by the
-- markOpened server action to anchor the speed bonus.
-- ---------------------------------------------------------------------------
alter table public.challenge_opens enable row level security;

drop policy if exists "challenge_opens: select own" on public.challenge_opens;
create policy "challenge_opens: select own"
  on public.challenge_opens for select
  using (auth.uid() = user_id);

drop policy if exists "challenge_opens: insert own" on public.challenge_opens;
create policy "challenge_opens: insert own"
  on public.challenge_opens for insert
  with check (auth.uid() = user_id);

revoke all on public.challenge_opens from anon, authenticated;
grant select, insert on public.challenge_opens to authenticated;

-- ---------------------------------------------------------------------------
-- plays — user reads only their own rows. No INSERT / UPDATE / DELETE
-- policies — all writes go through the SECURITY DEFINER submit_guess RPC.
-- ---------------------------------------------------------------------------
alter table public.plays enable row level security;

drop policy if exists "plays: select own" on public.plays;
create policy "plays: select own"
  on public.plays for select
  using (auth.uid() = user_id);

revoke all on public.plays from anon, authenticated;
grant select on public.plays to authenticated;
