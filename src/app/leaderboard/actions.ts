'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchLeaderboardTop, fetchOwnLeaderboardRow } from '@/lib/leaderboard';
import type { LeaderboardPeriodType, LeaderboardRow } from '@/types/leaderboard';

const ALLOWED: LeaderboardPeriodType[] = ['weekly', 'monthly'];

// ISO date YYYY-MM-DD; permissive — DB will reject anything malformed.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type RefreshResult =
  | { ok: true; rows: LeaderboardRow[]; ownRow: LeaderboardRow | null }
  | { ok: false; error: 'unauthenticated' | 'invalid_args' };

export async function refreshLeaderboardAction(
  periodType: LeaderboardPeriodType,
  periodStart: string,
): Promise<RefreshResult> {
  if (!ALLOWED.includes(periodType) || !ISO_DATE.test(periodStart)) {
    return { ok: false, error: 'invalid_args' };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const [rows, ownRow] = await Promise.all([
    fetchLeaderboardTop(supabase, periodType, periodStart),
    fetchOwnLeaderboardRow(supabase, periodType, periodStart, user.id),
  ]);

  return { ok: true, rows, ownRow };
}
