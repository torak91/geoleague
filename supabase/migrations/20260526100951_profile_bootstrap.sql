-- Plan step 4: bootstrap a profiles row whenever an auth.users row is created.
-- Idempotent (on conflict) so a manual backfill or replayed migration is safe.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- One-time backfill in case users already exist (e.g. seeded admin).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
