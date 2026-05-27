-- Allow multiple challenges per day by replacing the unique(scheduled_for)
-- constraint with unique(scheduled_for, publish_after_hour).
--
-- publish_after_hour: Rome wall-clock hour at which the cron may start
-- publishing this challenge (e.g. 9 = morning slot, 18 = evening slot).

alter table public.challenges
  add column publish_after_hour integer not null default 9
    check (publish_after_hour between 0 and 23);

alter table public.challenges
  drop constraint challenges_scheduled_for_key;

alter table public.challenges
  add constraint challenges_scheduled_for_hour_key
    unique (scheduled_for, publish_after_hour);
