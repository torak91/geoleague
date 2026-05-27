import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { fetchOwnLeaderboardRow } from '@/lib/leaderboard';
import { weeklyPeriodStart, monthlyPeriodStart } from '@/lib/time';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// UUID v4 shape; permissive (postgres rejects mismatches anyway).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatScore(n: number): string {
  return n.toLocaleString('it-IT');
}

export default async function PublicProfilePage({ params }: { params: { userId: string } }) {
  const { user, supabase } = await requireUser();

  if (!UUID.test(params.userId)) {
    notFound();
  }

  // Self-view → redirect to the rich own-profile page.
  if (params.userId === user.id) {
    // next/link's redirect is for client. Use a Link below or a redirect call.
    // Cleanest: just redirect.
    const { redirect } = await import('next/navigation');
    redirect('/profile');
  }

  const [profileRes, weeklyRow, monthlyRow] = await Promise.all([
    supabase
      .from('profiles_public')
      .select('id, display_name, avatar_url, is_pro')
      .eq('id', params.userId)
      .maybeSingle(),
    fetchOwnLeaderboardRow(supabase, 'weekly', weeklyPeriodStart(), params.userId),
    fetchOwnLeaderboardRow(supabase, 'monthly', monthlyPeriodStart(), params.userId),
  ]);

  const profile = profileRes.data;
  if (!profile) {
    notFound();
  }

  const displayName = profile.display_name?.trim() || t['profile.public.unknown'];

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between text-sm">
        <Link href="/" className="font-semibold">
          {t['brand.name']}
        </Link>
        <h1 className="text-base font-semibold">{t['profile.title']}</h1>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-neutral-200 text-lg font-semibold uppercase text-neutral-700">
            {displayName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{displayName}</p>
            {profile.is_pro ? (
              <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                Pro
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {!weeklyRow && !monthlyRow ? (
        <p className="text-center text-sm text-neutral-600">{t['profile.public.no_stats']}</p>
      ) : (
        <section className="grid grid-cols-2 gap-3">
          <PubStat
            label={t['profile.stats.weekly_rank']}
            rank={weeklyRow?.rank}
            score={weeklyRow?.total_score}
            plays={weeklyRow?.plays_count}
          />
          <PubStat
            label={t['profile.stats.monthly_rank']}
            rank={monthlyRow?.rank}
            score={monthlyRow?.total_score}
            plays={monthlyRow?.plays_count}
          />
        </section>
      )}
    </div>
  );
}

function PubStat({
  label,
  rank,
  score,
  plays,
}: {
  label: string;
  rank: number | undefined;
  score: number | undefined;
  plays: number | undefined;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
      {rank === undefined ? (
        <p className="mt-0.5 text-lg font-semibold tabular-nums">—</p>
      ) : (
        <>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">#{rank}</p>
          <p className="text-xs text-neutral-600">
            {formatScore(score ?? 0)} {t['leaderboard.col_score'].toLowerCase()} · {plays ?? 0}{' '}
            {t['leaderboard.col_plays'].toLowerCase()}
          </p>
        </>
      )}
    </div>
  );
}
