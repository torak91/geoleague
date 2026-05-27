-- Plan step 9: server-side scoring RPC.
--
-- This is the ONLY write path for plays. RLS denies direct INSERT.
-- Clients pass guess coordinates; the function fetches the challenge
-- coordinates (RLS-bypass via SECURITY DEFINER), computes the score
-- server-side, and inserts a row.
--
-- The leaderboard / streak trigger is added in plan step 11 / 20 alongside
-- the leaderboard_entries table.
--
-- Formula must match src/lib/score.ts exactly:
--   base_score        = round(5000 * exp(-distance_km / 1500))
--   speed_bonus       = 500  if seconds <= 60
--                       200  if seconds <= 120
--                       0    otherwise
--   accuracy_mult     = 1.2  if distance_km < 10
--                       1.0  otherwise
--   total_score       = round((base_score + speed_bonus) * accuracy_mult)

create or replace function public.submit_guess(
  p_challenge_id uuid,
  p_guess_lat double precision,
  p_guess_lng double precision
)
returns table (
  play_id uuid,
  total_score int,
  distance_km double precision,
  base_score int,
  speed_bonus int,
  accuracy_multiplier numeric
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user            uuid := auth.uid();
  v_opened_at       timestamptz;
  v_lat             double precision;
  v_lng             double precision;
  v_window_close    timestamptz;
  v_distance_km     double precision;
  v_base            int;
  v_speed_bonus     int;
  v_accuracy        numeric(3,2);
  v_total           int;
  v_seconds         int;
  v_play_id         uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_guess_lat is null or p_guess_lng is null
     or p_guess_lat < -90 or p_guess_lat > 90
     or p_guess_lng < -180 or p_guess_lng > 180 then
    raise exception 'invalid_guess' using errcode = '22023';
  end if;

  -- Lock the open row so two concurrent submits cannot both succeed; also
  -- gives us opened_at and the challenge coordinates in one round trip.
  select co.opened_at, c.lat, c.lng, c.window_closes_at
    into v_opened_at, v_lat, v_lng, v_window_close
  from public.challenge_opens co
  join public.challenges c on c.id = co.challenge_id
  where co.user_id = v_user
    and co.challenge_id = p_challenge_id
  for update of co;

  if v_opened_at is null then
    raise exception 'not_opened' using errcode = 'P0002';
  end if;

  if v_window_close is null or now() > v_window_close then
    raise exception 'window_closed' using errcode = 'P0001';
  end if;

  -- Double-submit guard. The plays unique(user_id, challenge_id) is the
  -- ultimate enforcement; this branch yields a friendlier error code.
  if exists (
    select 1 from public.plays
    where user_id = v_user and challenge_id = p_challenge_id
  ) then
    raise exception 'already_submitted' using errcode = 'P0003';
  end if;

  v_distance_km := earth_distance(
    ll_to_earth(v_lat, v_lng),
    ll_to_earth(p_guess_lat, p_guess_lng)
  ) / 1000.0;

  v_base := round(5000 * exp(-v_distance_km / 1500.0))::int;

  v_seconds := greatest(0, extract(epoch from now() - v_opened_at)::int);
  v_speed_bonus := case
    when v_seconds <= 60 then 500
    when v_seconds <= 120 then 200
    else 0
  end;

  v_accuracy := case when v_distance_km < 10 then 1.20 else 1.00 end;

  v_total := round((v_base + v_speed_bonus) * v_accuracy)::int;

  insert into public.plays (
    user_id, challenge_id,
    guess_lat, guess_lng,
    distance_km,
    base_score, speed_bonus, accuracy_multiplier, total_score,
    opened_at, time_to_submit_seconds
  ) values (
    v_user, p_challenge_id,
    p_guess_lat, p_guess_lng,
    v_distance_km,
    v_base, v_speed_bonus, v_accuracy, v_total,
    v_opened_at, v_seconds
  )
  returning id into v_play_id;

  return query
    select v_play_id, v_total, v_distance_km, v_base, v_speed_bonus, v_accuracy;
end;
$$;

revoke all on function public.submit_guess(uuid, double precision, double precision)
  from public, anon;
grant execute on function public.submit_guess(uuid, double precision, double precision)
  to authenticated;
