import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { formatDistance } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { weeklyPeriodStart } from '@/lib/time';
import { fetchOwnLeaderboardRow } from '@/lib/leaderboard';
import { ResultMap } from '@/components/Map/ResultMapLoader';
import { ShareButton } from '@/components/Result/ShareButton';

export default async function ResultPage({ params }: { params: { playId: string } }) {
  const { user, supabase } = await requireUser();

  // Step 1: Verify ownership via RLS (select-own). If the play does not
  // exist or belongs to another user, no row is returned.
  const { data: play } = await supabase
    .from('plays')
    .select(
      'id, challenge_id, guess_lat, guess_lng, distance_km, base_score, speed_bonus, accuracy_multiplier, total_score, submitted_at',
    )
    .eq('id', params.playId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!play) {
    notFound();
  }

  // Step 2: Fetch the underlying challenge coordinates. We use the service
  // client because the public views only reveal lat/lng AFTER the global
  // window has closed — but the user is allowed to see them on their own
  // result page immediately after submitting. Ownership was already proven
  // in step 1.
  const svc = createSupabaseServiceClient();
  const { data: challenge } = await svc
    .from('challenges')
    .select('lat, lng, location_label, window_closes_at, scheduled_for')
    .eq('id', play.challenge_id)
    .maybeSingle();

  if (!challenge) {
    notFound();
  }

  const windowClosed =
    !!challenge.window_closes_at && new Date(challenge.window_closes_at).getTime() <= Date.now();

  // Weekly rank for the week containing this play's submission. The
  // leaderboard view is keyed by Europe/Rome calendar weeks; we anchor by
  // the play's submitted_at so old results still show the correct week.
  const periodStart = weeklyPeriodStart(new Date(play.submitted_at));
  const ownLb = await fetchOwnLeaderboardRow(supabase, 'weekly', periodStart, user.id);
  const ownRank = ownLb?.rank ?? null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between text-sm">
        <Link href="/" className="font-semibold">
          {t['brand.name']}
        </Link>
        <span className="text-neutral-600">{challenge.scheduled_for}</span>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h1 className="mb-1 text-sm font-medium uppercase tracking-wide text-neutral-500">
          {t['result.your_score']}
        </h1>
        <p className="text-4xl font-semibold tracking-tight">{play.total_score.toLocaleString('it-IT')}</p>
        <p className="mt-2 text-sm text-neutral-700">
          {t['result.distance']}: <span className="font-medium">{formatDistance(play.distance_km)}</span>
        </p>
        {windowClosed && challenge.location_label ? (
          <p className="mt-1 text-sm text-neutral-700">
            {t['result.actual_location']}:{' '}
            <span className="font-medium">{challenge.location_label}</span>
          </p>
        ) : null}
      </section>

      <section className="h-[42vh] min-h-[320px]">
        <ResultMap
          guess={{ lat: play.guess_lat, lng: play.guess_lng }}
          actual={{ lat: challenge.lat, lng: challenge.lng }}
        />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm">
        <dl className="grid grid-cols-2 gap-y-2">
          <dt className="text-neutral-600">{t['result.base']}</dt>
          <dd className="text-right font-medium">{play.base_score}</dd>
          <dt className="text-neutral-600">{t['result.speed_bonus']}</dt>
          <dd className="text-right font-medium">+{play.speed_bonus}</dd>
          <dt className="text-neutral-600">{t['result.multiplier']}</dt>
          <dd className="text-right font-medium">×{Number(play.accuracy_multiplier).toFixed(2)}</dd>
          {ownRank !== null ? (
            <>
              <dt className="text-neutral-600">{t['result.weekly_rank']}</dt>
              <dd className="text-right font-semibold">#{ownRank}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <div className="flex gap-3">
        <Link
          href="/"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-center text-sm font-medium"
        >
          {t['result.back_home']}
        </Link>
        <ShareButton playId={play.id} totalScore={play.total_score} />
        <Link
          href="/leaderboard"
          className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-center text-sm font-medium text-white"
        >
          {t['result.view_leaderboard']}
        </Link>
      </div>
    </div>
  );
}
