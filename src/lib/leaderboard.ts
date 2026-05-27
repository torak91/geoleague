// Query helpers for the leaderboard_view. The view exists in Postgres
// (migration 20260526180000_leaderboard.sql) but is not yet in the
// generated database.types.ts — running `npm run db:types` after pushing
// the migration would close the gap. Until then, we centralise the cast
// here so the call sites stay strongly typed at their boundary.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LeaderboardPeriodType, LeaderboardRow } from '@/types/leaderboard';

const COLUMNS =
  'user_id, period_type, period_start, total_score, plays_count, best_play_id, display_name, avatar_url, is_pro, rank';

// Accept any Supabase client; the generic parameters of the bound client
// (Database, Schema) don't matter for an untyped view query.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

export async function fetchLeaderboardTop(
  supabase: AnyClient,
  periodType: LeaderboardPeriodType,
  periodStart: string,
  limit = 100,
): Promise<LeaderboardRow[]> {
  const { data } = await supabase
    .from('leaderboard_view')
    .select(COLUMNS)
    .eq('period_type', periodType)
    .eq('period_start', periodStart)
    .order('rank', { ascending: true })
    .limit(limit);
  return (data ?? []) as LeaderboardRow[];
}

export async function fetchOwnLeaderboardRow(
  supabase: AnyClient,
  periodType: LeaderboardPeriodType,
  periodStart: string,
  userId: string,
): Promise<LeaderboardRow | null> {
  const { data } = await supabase
    .from('leaderboard_view')
    .select(COLUMNS)
    .eq('period_type', periodType)
    .eq('period_start', periodStart)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as LeaderboardRow | null) ?? null;
}
