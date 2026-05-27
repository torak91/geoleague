/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { formatDistance } from '@/lib/geo';

// Node runtime: service-role client needs a Node fetch with the @supabase
// libraries. ImageResponse runs fine here.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: { playId: string } }) {
  const { playId } = params;
  if (!UUID_RE.test(playId)) {
    return new Response('not found', { status: 404 });
  }

  const svc = createSupabaseServiceClient();

  // Service-role read: share images are publicly viewable, the playId UUID is
  // opaque enough to act as the access control here.
  const { data: play } = await svc
    .from('plays')
    .select('id, user_id, challenge_id, distance_km, total_score')
    .eq('id', playId)
    .maybeSingle();

  if (!play) {
    return new Response('not found', { status: 404 });
  }

  const [{ data: challenge }, { data: profile }] = await Promise.all([
    svc
      .from('challenges')
      .select('scheduled_for, location_label, window_closes_at')
      .eq('id', play.challenge_id)
      .maybeSingle(),
    svc.from('profiles_public').select('display_name').eq('id', play.user_id).maybeSingle(),
  ]);

  const playerName = profile?.display_name ?? 'Giocatore';
  const scheduledFor = challenge?.scheduled_for ?? '';
  const windowClosed =
    !!challenge?.window_closes_at &&
    new Date(challenge.window_closes_at).getTime() <= Date.now();
  const locationLabel = windowClosed ? challenge?.location_label ?? null : null;

  const formattedDate = formatItalianDate(scheduledFor);
  const distanceText = formatDistance(play.distance_km);
  const scoreText = play.total_score.toLocaleString('it-IT');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          color: '#fafafa',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#a3a3a3',
              fontWeight: 700,
            }}
          >
            GeoLeague
          </div>
          <div style={{ fontSize: 22, color: '#a3a3a3' }}>{formattedDate}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 30, color: '#d4d4d4', fontWeight: 500 }}>{playerName}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
            <div style={{ fontSize: 168, fontWeight: 800, lineHeight: 1, color: '#fafafa' }}>
              {scoreText}
            </div>
            <div style={{ fontSize: 28, color: '#a3a3a3' }}>punti</div>
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 8 }}>
            <Stat label="Distanza" value={distanceText} />
            {locationLabel ? <Stat label="Luogo" value={locationLabel} /> : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #262626',
            paddingTop: 24,
          }}
        >
          <div style={{ fontSize: 22, color: '#a3a3a3' }}>La sfida quotidiana di geo-guessing</div>
          <div style={{ fontSize: 22, color: '#fafafa', fontWeight: 600 }}>geoleague.it</div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    },
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 18, color: '#737373', textTransform: 'uppercase', letterSpacing: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, color: '#fafafa', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const MONTHS_IT = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

function formatItalianDate(isoDate: string): string {
  // isoDate is `YYYY-MM-DD`. Build manually to avoid the OG runtime pulling in
  // a heavy Intl ICU dataset just for one Italian formatter.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const [, y, mm, dd] = m;
  const monthIdx = Number(mm) - 1;
  if (monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${Number(dd)} ${MONTHS_IT[monthIdx]} ${y}`;
}
