import { requireUser } from '@/lib/auth';
import { monthlyPeriodStart } from '@/lib/time';
import { t } from '@/lib/i18n';
import { LeaderboardLive } from '@/components/Leaderboard/LeaderboardLive';
import { fetchLeaderboardTop, fetchOwnLeaderboardRow } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

function formatItMonth(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export default async function LeaderboardMonthlyPage() {
  const { user, supabase } = await requireUser();
  const periodStart = monthlyPeriodStart();

  const [rows, ownRow] = await Promise.all([
    fetchLeaderboardTop(supabase, 'monthly', periodStart),
    fetchOwnLeaderboardRow(supabase, 'monthly', periodStart, user.id),
  ]);

  return (
    <>
      <p className="text-xs text-neutral-500">
        {t['leaderboard.period_monthly']} {formatItMonth(periodStart)}
      </p>
      <LeaderboardLive
        periodType="monthly"
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
