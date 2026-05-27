-- Plan step: migration 0001 — init
-- Tables: profiles, challenges, challenge_opens, plays.
-- Extensions: pgcrypto (gen_random_uuid), cube + earthdistance (haversine for scoring RPC in 0006).
-- RLS policies and views live in later migrations.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists cube with schema extensions;
create extension if not exists earthdistance with schema extensions;

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users. Bootstrap trigger lives in a later migration.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text,
  avatar_url            text,
  is_admin              boolean not null default false,
  is_pro                boolean not null default false,
  stripe_customer_id    text unique,
  stripe_subscription_id text,
  pro_until             timestamptz,
  notification_channel  text not null default 'push'
                          check (notification_channel in ('push','email','both','none')),
  streak_count          int not null default 0 check (streak_count >= 0),
  longest_streak        int not null default 0 check (longest_streak >= 0),
  last_played_on        date,
  last_seen_at          timestamptz,
  locale                text not null default 'it',
  created_at            timestamptz not null default now()
);

comment on table public.profiles is 'Public profile, 1:1 with auth.users';

-- ---------------------------------------------------------------------------
-- challenges: one daily Street View location. lat/lng never exposed via RLS;
-- clients read through views (active_challenge_public / closed_challenge_public).
-- ---------------------------------------------------------------------------
create table public.challenges (
  id                uuid primary key default gen_random_uuid(),
  scheduled_for     date not null unique,
  lat               double precision not null,
  lng               double precision not null,
  image_prefix      text not null,
  difficulty        text not null check (difficulty in ('easy','medium','hard')),
  region            text not null check (region in ('nord','centro','sud','isole')),
  location_label    text,
  published_at      timestamptz,
  window_closes_at  timestamptz,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint challenges_window_after_publish
    check (window_closes_at is null or published_at is null or window_closes_at > published_at),
  constraint challenges_lat_range check (lat between -90 and 90),
  constraint challenges_lng_range check (lng between -180 and 180)
);

create index challenges_published_idx
  on public.challenges (published_at)
  where published_at is not null;

-- ---------------------------------------------------------------------------
-- challenge_opens: first time a user loaded the pano for a given challenge.
-- Anchors the speed bonus; idempotent insert (on conflict do nothing).
-- ---------------------------------------------------------------------------
create table public.challenge_opens (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  opened_at    timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

-- ---------------------------------------------------------------------------
-- plays: one submitted guess per (user, challenge). Inserts only via the
-- submit_guess RPC (RLS denies direct INSERT in migration 0005).
-- ---------------------------------------------------------------------------
create table public.plays (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  challenge_id            uuid not null references public.challenges(id) on delete cascade,
  guess_lat               double precision not null check (guess_lat between -90 and 90),
  guess_lng               double precision not null check (guess_lng between -180 and 180),
  distance_km             double precision not null check (distance_km >= 0),
  base_score              int not null check (base_score >= 0),
  speed_bonus             int not null check (speed_bonus >= 0),
  accuracy_multiplier     numeric(3,2) not null check (accuracy_multiplier >= 1.0),
  total_score             int not null check (total_score >= 0),
  opened_at               timestamptz not null,
  submitted_at            timestamptz not null default now(),
  time_to_submit_seconds  int not null check (time_to_submit_seconds >= 0),
  unique (user_id, challenge_id)
);

create index plays_challenge_score_idx
  on public.plays (challenge_id, total_score desc);

create index plays_user_submitted_idx
  on public.plays (user_id, submitted_at desc);
