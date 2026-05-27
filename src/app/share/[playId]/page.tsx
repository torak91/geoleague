import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { formatDistance } from '@/lib/geo';
import { env } from '@/lib/env';

// Server-rendered so the og:image URL is always present in the initial HTML.
// Marked dynamic because share pages are infrequent and personalised per play.
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SharePayload = {
  scoreText: string;
  distanceText: string;
  playerName: string;
  dateLabel: string;
  locationLabel: string | null;
};

async function loadShare(playId: string): Promise<SharePayload | null> {
  if (!UUID_RE.test(playId)) return null;
  const svc = createSupabaseServiceClient();

  const { data: play } = await svc
    .from('plays')
    .select('id, user_id, challenge_id, distance_km, total_score')
    .eq('id', playId)
    .maybeSingle();
  if (!play) return null;

  const [{ data: challenge }, { data: profile }] = await Promise.all([
    svc
      .from('challenges')
      .select('scheduled_for, location_label, window_closes_at')
      .eq('id', play.challenge_id)
      .maybeSingle(),
    svc.from('profiles_public').select('display_name').eq('id', play.user_id).maybeSingle(),
  ]);

  const windowClosed =
    !!challenge?.window_closes_at &&
    new Date(challenge.window_closes_at).getTime() <= Date.now();

  return {
    scoreText: play.total_score.toLocaleString('it-IT'),
    distanceText: formatDistance(play.distance_km),
    playerName: profile?.display_name ?? 'Giocatore',
    dateLabel: challenge?.scheduled_for ?? '',
    locationLabel: windowClosed ? challenge?.location_label ?? null : null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: { playId: string };
}): Promise<Metadata> {
  const data = await loadShare(params.playId);
  const origin = env.NEXT_PUBLIC_APP_URL;
  const ogImage = `${origin}/api/share/${params.playId}`;
  const url = `${origin}/share/${params.playId}`;

  const title = data
    ? `${data.playerName} — ${data.scoreText} punti su GeoLeague`
    : 'GeoLeague';
  const description = data
    ? `Risultato della sfida del ${data.dateLabel}. Distanza: ${data.distanceText}.`
    : 'La sfida quotidiana di geo-guessing italiana.';

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'GeoLeague',
      locale: 'it_IT',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function SharePage({ params }: { params: { playId: string } }) {
  const data = await loadShare(params.playId);
  if (!data) notFound();

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
        GeoLeague
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-neutral-500">{data.dateLabel}</p>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{data.playerName}</h1>
        <p className="mt-4 text-6xl font-bold tracking-tight text-neutral-900">{data.scoreText}</p>
        <p className="text-sm text-neutral-500">punti</p>

        <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-neutral-500">Distanza</dt>
          <dd className="text-right font-medium">{data.distanceText}</dd>
          {data.locationLabel ? (
            <>
              <dt className="text-neutral-500">Luogo</dt>
              <dd className="text-right font-medium">{data.locationLabel}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <Link
        href="/"
        className="rounded-lg bg-neutral-900 px-5 py-3 text-center text-sm font-semibold text-white"
      >
        Gioca anche tu
      </Link>

      <p className="text-center text-xs text-neutral-500">
        La sfida quotidiana di geo-guessing italiana. Una sola location al giorno, finestra di 2 ore.
      </p>
    </div>
  );
}
