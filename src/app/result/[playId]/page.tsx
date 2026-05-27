import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { weeklyPeriodStart } from '@/lib/time';
import { fetchOwnLeaderboardRow } from '@/lib/leaderboard';
import { ResultMap } from '@/components/Map/ResultMapLoader';
import { ShareButton } from '@/components/Result/ShareButton';
import { WebHeader } from '@/components/web-header';
import { LogoMark, Tabular } from '@/components/brand';
import { CountUp } from '@/components/CountUp';

export default async function ResultPage({ params }: { params: { playId: string } }) {
  const { user, supabase } = await requireUser();

  // Step 1: Verify ownership via RLS (select-own). If the play does not
  // exist or belongs to another user, no row is returned.
  const { data: play } = await supabase
    .from('plays')
    .select(
      'id, challenge_id, guess_lat, guess_lng, distance_km, base_score, speed_bonus, accuracy_multiplier, total_score, submitted_at, time_to_submit_seconds',
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
    .select('lat, lng, location_label, window_closes_at, scheduled_for, region, difficulty')
    .eq('id', play.challenge_id)
    .maybeSingle();

  if (!challenge) {
    notFound();
  }

  // Weekly rank for the week containing this play's submission. The
  // leaderboard view is keyed by Europe/Rome calendar weeks; we anchor by
  // the play's submitted_at so old results still show the correct week.
  const periodStart = weeklyPeriodStart(new Date(play.submitted_at));
  const ownLb = await fetchOwnLeaderboardRow(supabase, 'weekly', periodStart, user.id);
  const ownRank = ownLb?.rank ?? null;

  const km = play.distance_km.toFixed(0);
  const place = challenge.location_label ?? 'posizione sconosciuta';
  const mapsUrl = `https://www.google.com/maps?q=${challenge.lat},${challenge.lng}`;

  function formatCoord(lat: number, lng: number): string {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}°${latDir} · ${Math.abs(lng).toFixed(4)}°${lngDir}`;
  }

  const todayShort = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' }).replace(',', ' ·');

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <WebHeader active="today" todayShort={todayShort} userInitials={user.email?.charAt(0)?.toUpperCase() ?? 'tu'} />

      {/* Editorial banner */}
      <section className="border-b border-black/8 px-10 pt-10 pb-8">
        <div className="grid grid-cols-12 items-end gap-8">
          <div className="col-span-7">
            <p className="text-[11px] uppercase tracking-widest text-subink">
              Risultato · {challenge.scheduled_for}
            </p>
            <h1 className="mt-3 font-display text-[64px] font-medium leading-[0.95] tracking-tightish">
              A <Tabular>{km} km</Tabular> da<br />
              <span className="text-subink">{place}.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[14px] leading-[1.55] text-subink">
              In <Tabular>{play.time_to_submit_seconds}s</Tabular>. La posizione è nella regione italiana.
            </p>
          </div>
          <div className="col-span-5 flex flex-col items-end">
            <span className="text-[11px] uppercase tracking-widest text-subink">Punteggio</span>
            <span className="font-display text-[120px] font-light leading-none tracking-tight tabular-nums">
              <CountUp to={play.total_score} />
            </span>
            {ownRank !== null && (
              <div className="mt-3 flex items-center gap-2 rounded-full bg-black/[0.05] px-3 py-1 text-[12px]">
                <span className="text-subink">Posizione settimanale:</span>
                <span className="font-semibold">#{ownRank}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Map + breakdown rail */}
      <section className="grid grid-cols-12 gap-px border-b border-black/8 bg-black/[0.08]">
        <div className="col-span-8 bg-paper">
          <div className="h-[520px] w-full">
            <ResultMap
              guess={{ lat: play.guess_lat, lng: play.guess_lng }}
              actual={{ lat: challenge.lat, lng: challenge.lng }}
            />
          </div>
        </div>
        <aside className="col-span-4 flex flex-col bg-paper px-7 py-7">
          <h3 className="text-[11px] uppercase tracking-wider text-subink">Dettaglio punteggio</h3>
          <ul className="mt-5 divide-y divide-black/8">
            <li className="flex items-baseline justify-between py-3">
              <span className="text-[14px]">Base</span>
              <Tabular className="text-[15px] font-medium">{play.base_score.toLocaleString('it')}</Tabular>
            </li>
            <li className="flex items-baseline justify-between py-3">
              <div>
                <div className="text-[14px]">Bonus velocità</div>
                <div className="text-[11px] text-subink"><Tabular>{play.time_to_submit_seconds}s</Tabular></div>
              </div>
              <Tabular className="text-[15px] font-medium">+{play.speed_bonus.toLocaleString('it')}</Tabular>
            </li>
            <li className="flex items-baseline justify-between py-3">
              <div>
                <div className="text-[14px]">Moltiplicatore</div>
                <div className="text-[11px] text-subink">accuratezza</div>
              </div>
              <Tabular className="text-[15px] font-medium">×{Number(play.accuracy_multiplier).toFixed(2)}</Tabular>
            </li>
            <li className="flex items-baseline justify-between py-3">
              <span className="text-[14px] font-semibold">Totale</span>
              <Tabular className="text-[18px] font-semibold">{play.total_score.toLocaleString('it')}</Tabular>
            </li>
          </ul>

          {ownRank !== null && (
            <>
              <h3 className="mt-7 text-[11px] uppercase tracking-wider text-subink">Settimana</h3>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-black/10 bg-cream px-4 py-3">
                <div>
                  <Tabular className="font-display text-[28px] font-medium leading-none">#{ownRank}</Tabular>
                </div>
              </div>
            </>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-6">
            <Link href="/leaderboard" className="flex items-center justify-center gap-2 rounded-xl bg-ink py-3 text-[14px] font-semibold text-cream">
              Vedi classifica completa
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </Link>
            <div className="flex gap-2">
              <div className="flex-1">
                <ShareButton playId={play.id} totalScore={play.total_score} />
              </div>
              <Link href="/" className="flex-1 rounded-xl border border-black/10 bg-cream py-2.5 text-center text-[13px] font-medium hover:bg-black/[0.03]">Torna alla home</Link>
            </div>
          </div>
        </aside>
      </section>

      {/* Reveal strip — only show when challenge data available */}
      {challenge.location_label && (
        <section className="border-b border-black/8 px-10 py-10">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-5">
              <p className="text-[10px] uppercase tracking-widest text-subink">Luogo rivelato</p>
              <h2 className="mt-2 font-display text-[36px] font-medium tracking-tight">{challenge.location_label}</h2>
              <p className="mt-1 text-[13px] text-subink">{challenge.region}</p>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                <dt className="text-subink">Coordinate</dt>
                <dd className="font-mono"><Tabular>{formatCoord(challenge.lat, challenge.lng)}</Tabular></dd>
                <dt className="text-subink">Distanza dal tuo tiro</dt>
                <dd><Tabular>{km} km</Tabular></dd>
                <dt className="text-subink">Tempo impiegato</dt>
                <dd><Tabular>{play.time_to_submit_seconds}s</Tabular></dd>
                <dt className="text-subink">Difficoltà</dt>
                <dd>{challenge.difficulty}</dd>
              </dl>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium underline-offset-4 hover:underline">
                Apri in Google Maps →
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="flex items-center justify-between px-10 py-6 text-[11px] text-subink">
        <div className="flex items-center gap-3">
          <LogoMark size={14} />
          <span>© 2026 geoleague · una sfida al giorno</span>
        </div>
        <div className="flex gap-5">
          <span>Regole</span>
          <span>Privacy</span>
          <span>Suggerisci una località</span>
        </div>
      </footer>
    </main>
  );
}
