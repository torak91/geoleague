-- Plan step 12: enable Supabase Realtime on leaderboard_entries.
--
-- Supabase pipes `postgres_changes` events only for tables added to the
-- `supabase_realtime` publication. Without this, the client channel will
-- subscribe but never receive payloads.
--
-- The default Supabase publication is `supabase_realtime`; if a project
-- was created before this was the default, the ALTER will fail and the
-- user must create the publication via the dashboard (Database →
-- Replication → enable for `leaderboard_entries`).

alter publication supabase_realtime add table public.leaderboard_entries;
