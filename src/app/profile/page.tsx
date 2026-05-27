import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { fetchOwnLeaderboardRow } from '@/lib/leaderboard';
import { weeklyPeriodStart, monthlyPeriodStart } from '@/lib/time';
import { formatDistance } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { HistoryMap, type HistoryPoint } from '@/components/Map/HistoryMapLoader';

export const dynamic = 'force-dynamic';

function formatScore(n: number): string {
  return n.toLocaleString('it-IT');
}

export default async function ProfilePage() {
  const { user, supabase } = await requireUser();

  const [profileRes, playsRes, weeklyRow, monthlyRow] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, avatar_url, is_pro, streak_count, longest_streak')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('plays')
      .select('id, challenge_id, total_score, distance_km, submitted_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false }),
    fetchOwnLeaderboardRow(supabase, 'weekly', weeklyPeriodStart(), user.id),
    fetchOwnLeaderboardRow(supabase, 'monthly', monthlyPeriodStart(), user.id),
  ]);

  const profile = profileRes.data;
  const plays = playsRes.data ?? [];

  // Aggregate stats from own plays.
  const totalPlays = plays.length;
  const totalScore = plays.reduce((acc, p) => acc + p.total_score, 0);
  const avgScore = totalPlays === 0 ? 0 : Math.round(totalScore / totalPlays);
  const bestScore = totalPlays === 0 ? null : Math.max(...plays.map((p) => p.total_score));
  const bestDistance =
    totalPlays === 0 ? null : Math.min(...plays.map((p) => p.distance_km));

  // History map points — join with closed_challenge_public to fetch actual
  // coordinates. Only closed challenges appear (open ones would leak coords).
  let historyPoints: HistoryPoint[] = [];
  if (plays.length > 0) {
    const challengeIds = plays.map((p) => p.challenge_id);
    const { data: closed } = await supabase
      .from('closed_challenge_public')
      .select('id, lat, lng, location_label, scheduled_for')
      .in('id', challengeIds);
    const byId = new Map<string, NonNullable<typeof closed>[number]>();
    for (const c of closed ?? []) {
      if (c.id) byId.set(c.id, c);
    }
    historyPoints = plays.flatMap((p) => {
      const c = byId.get(p.challenge_id);
      if (!c || c.lat == null || c.lng == null || !c.scheduled_for) return [];
      return [
        {
          playId: p.id,
          challengeId: p.challenge_id,
          scheduledFor: c.scheduled_for,
          totalScore: p.total_score,
          distanceKm: p.distance_km,
          actualLat: c.lat,
          actualLng: c.lng,
          locationLabel: c.location_label,
        },
      ];
    });
  }

  const displayName = profile?.display_name?.trim() || user.email || '—';

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
            {profile?.is_pro ? (
              <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                Pro
              </span>
            ) : null}
          </div>
          <Link
            href="/settings"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
          >
            {t['nav.settings']}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t['profile.stats.total_plays']} value={String(totalPlays)} />
        <Stat label={t['profile.stats.total_score']} value={formatScore(totalScore)} />
        <Stat label={t['profile.stats.avg_score']} value={formatScore(avgScore)} />
        <Stat
          label={t['profile.stats.best_score']}
          value={bestScore === null ? '—' : formatScore(bestScore)}
        />
        <Stat
          label={t['profile.stats.best_distance']}
          value={bestDistance === null ? '—' : formatDistance(bestDistance)}
        />
        <Stat
          label={t['profile.stats.streak']}
          value={String(profile?.streak_count ?? 0)}
        />
        <Stat
          label={t['profile.stats.longest_streak']}
          value={String(profile?.longest_streak ?? 0)}
        />
        <Stat
          label={t['profile.stats.weekly_rank']}
          value={weeklyRow ? `#${weeklyRow.rank}` : '—'}
        />
        <Stat
          label={t['profile.stats.monthly_rank']}
          value={monthlyRow ? `#${monthlyRow.rank}` : '—'}
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">{t['profile.history.title']}</h2>
          <span className="text-[10px] text-neutral-500">{t['profile.history.legend']}</span>
        </div>
        {historyPoints.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-600">
            {t['profile.history.empty']}
          </div>
        ) : (
          <div className="h-[50vh] min-h-[320px]">
            <HistoryMap points={historyPoints} />
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
