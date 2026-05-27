-- Plan step 15: Web Push subscriptions + send log.
--
-- notification_subscriptions  — one row per (user, device endpoint).
--                               Cleaned up on 404/410 from the push service.
-- notification_log            — idempotency + observability for cron sends.
--                               UNIQUE (challenge_id, user_id, channel, kind)
--                               guarantees no double-send across retries.

-- ---------------------------------------------------------------------------
-- notification_subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.notification_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  endpoint     text        not null unique,
  p256dh       text        not null,
  auth         text        not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists idx_notif_subs_user
  on public.notification_subscriptions (user_id);

comment on table public.notification_subscriptions is
  'Web Push endpoints. One row per device per user.';

-- RLS: user owns their own subscriptions. Service role bypasses for pruning.
alter table public.notification_subscriptions enable row level security;
revoke all on public.notification_subscriptions from anon, authenticated;

drop policy if exists "notif_subs: select own" on public.notification_subscriptions;
create policy "notif_subs: select own"
  on public.notification_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "notif_subs: insert own" on public.notification_subscriptions;
create policy "notif_subs: insert own"
  on public.notification_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "notif_subs: delete own" on public.notification_subscriptions;
create policy "notif_subs: delete own"
  on public.notification_subscriptions for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.notification_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- notification_log
-- ---------------------------------------------------------------------------
create table if not exists public.notification_log (
  id            bigserial   primary key,
  challenge_id  uuid        not null references public.challenges(id) on delete cascade,
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  channel       text        not null check (channel in ('push','email')),
  kind          text        not null check (kind in ('launch','last_call')),
  status        text        not null check (status in ('sent','failed','skipped')),
  error         text,
  sent_at       timestamptz not null default now(),
  unique (challenge_id, user_id, channel, kind)
);

create index if not exists idx_notif_log_challenge_kind
  on public.notification_log (challenge_id, kind);

comment on table public.notification_log is
  'One row per (challenge, user, channel, kind). Enforces idempotency.';

alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;

drop policy if exists "notif_log: select own" on public.notification_log;
create policy "notif_log: select own"
  on public.notification_log for select
  using (auth.uid() = user_id);

grant select on public.notification_log to authenticated;
