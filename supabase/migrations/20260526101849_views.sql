-- Plan step 6: client-safe projection views.
-- These run as their owner (postgres) by default, bypassing the RLS that
-- locks the underlying tables. That is intentional: the view IS the API
-- surface — it only ever returns columns we are willing to expose.
--
-- leaderboard_view is intentionally NOT created here. The underlying
-- leaderboard_entries table is added later (plan step 11). The view will
-- live in that migration so this file does not reference missing tables.

-- ---------------------------------------------------------------------------
-- active_challenge_public: today's playable challenge. NO lat/lng.
-- ---------------------------------------------------------------------------
create or replace view public.active_challenge_public as
select
  c.id,
  c.scheduled_for,
  c.image_prefix,
  c.difficulty,
  c.region,
  c.published_at,
  c.window_closes_at
from public.challenges c
where c.published_at is not null
  and c.window_closes_at > now();

comment on view public.active_challenge_public is
  'Currently playable challenge, hides lat/lng/location_label';

-- ---------------------------------------------------------------------------
-- closed_challenge_public: challenges whose 2h window has elapsed.
-- Safe to reveal exact coordinates and label.
-- ---------------------------------------------------------------------------
create or replace view public.closed_challenge_public as
select
  c.id,
  c.scheduled_for,
  c.image_prefix,
  c.difficulty,
  c.region,
  c.lat,
  c.lng,
  c.location_label,
  c.published_at,
  c.window_closes_at
from public.challenges c
where c.published_at is not null
  and c.window_closes_at <= now();

comment on view public.closed_challenge_public is
  'Past challenges including exact coordinates and label';

-- ---------------------------------------------------------------------------
-- profiles_public: safe cross-user lookup. Used for leaderboard rows and
-- the public profile route.
-- ---------------------------------------------------------------------------
create or replace view public.profiles_public as
select
  p.id,
  p.display_name,
  p.avatar_url,
  p.is_pro
from public.profiles p;

comment on view public.profiles_public is
  'Public projection of profiles (display name, avatar, pro flag)';

-- ---------------------------------------------------------------------------
-- Grants. anon + authenticated should be able to read these views via
-- PostgREST. Revoking direct access on the underlying challenges table
-- happens in the RLS migration.
-- ---------------------------------------------------------------------------
grant select on public.active_challenge_public to anon, authenticated;
grant select on public.closed_challenge_public to anon, authenticated;
grant select on public.profiles_public to anon, authenticated;
