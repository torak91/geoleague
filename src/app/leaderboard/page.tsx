import { requireUser } from '@/lib/auth';
import { weeklyPeriodStart } from '@/lib/time';
import { t } from '@/lib/i18n';
import { LeaderboardLive } from '@/components/Leaderboard/LeaderboardLive';
import { fetchLeaderboardTop, fetchOwnLeaderboardRow } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

function formatItDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export default async function LeaderboardWeeklyPage() {
  const { user, supabase } = await requireUser();
  const periodStart = weeklyPeriodStart();

  const [rows, ownRow] = await Promise.all([
    fetchLeaderboardTop(supabase, 'weekly', periodStart),
    fetchOwnLeaderboardRow(supabase, 'weekly', periodStart, user.id),
  ]);

  return (
    <>
      <p className="text-xs text-neutral-500">
        {t['leaderboard.period_weekly']} {formatItDate(periodStart)}
      </p>
      <LeaderboardLive
        periodType="weekly"
        periodStart={periodStart}
        ownUserId={user.id}
        initialRows={rows}
        initialOwnRow={ownRow}
      />
      {ownRow === null && rows.length > 0 ? (
        <p className="text-center text-xs text-neutral-500">{t['leaderboard.not_ranked']}</p>
      ) : null}
    </>
  );
}
