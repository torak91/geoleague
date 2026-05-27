import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { weeklyPeriodStart } from '@/lib/time';
import { fetchLeaderboardTop, fetchOwnLeaderboardRow } from '@/lib/leaderboard';
import { AtlasBackdrop } from '@/components/atlas-backdrop';
import { WebHeader } from '@/components/web-header';
import { DailyCard } from '@/components/daily-card';
import { Tabular } from '@/components/brand';
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { user, supabase } = await getCurrentUser();

  // Active challenge
  const { data: challenge } = await supabase
    .from('active_challenge_public')
    .select('id, window_closes_at, scheduled_for')
    .maybeSingle();

  let existingPlayId: string | null = null;
  let profile: { streak_count: number; longest_streak: number; display_name: string | null; } | null = null;
  let weeklyRows: any[] = [];
  let ownWeeklyRow: any = null;
  let yesterdayPlay: any = null;
  let last28: boolean[] = Array(28).fill(false);

  if (user) {
    const periodStart = weeklyPeriodStart();
    const [playRes, profileRes, topRows, ownRow, recentPlays] = await Promise.all([
      challenge?.id
        ? supabase.from('plays').select('id').eq('user_id', user.id).eq('challenge_id', challenge.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('profiles').select('streak_count, longest_streak, display_name').eq('id', user.id).maybeSingle(),
      fetchLeaderboardTop(supabase, 'weekly', periodStart, 10),
      fetchOwnLeaderboardRow(supabase, 'weekly', periodStart, user.id),
      supabase.from('plays').select('id, total_score, submitted_at, challenge_id, distance_km').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(30),
    ]);

    existingPlayId = (playRes as any).data?.id ?? null;
    profile = profileRes.data ?? null;
    weeklyRows = topRows;
    ownWeeklyRow = ownRow;

    const plays = (recentPlays as any).data ?? [];

    // Yesterday's play (second most recent if today is played, or most recent if today not played yet)
    const yesterdayCandidate = plays.find((p: any) => {
      if (!challenge?.id) return true;
      return p.challenge_id !== challenge.id;
    });
    if (yesterdayCandidate) {
      // Fetch closed challenge for it
      const { data: closedChallenge } = await supabase
        .from('closed_challenge_public')
        .select('location_label, scheduled_for')
        .eq('id', yesterdayCandidate.challenge_id)
        .maybeSingle();
      yesterdayPlay = closedChallenge ? { ...yesterdayCandidate, location_label: closedChallenge.location_label, scheduled_for: closedChallenge.scheduled_for } : null;
    }

    // Last 28 days sparkline
    const now = new Date();
    for (let i = 0; i < 28; i++) {
      const dayAgo = new Date(now);
      dayAgo.setDate(dayAgo.getDate() - (27 - i));
      const iso = dayAgo.toISOString().slice(0, 10);
      last28[i] = plays.some((p: any) => p.submitted_at?.slice(0, 10) === iso);
    }
  }

  // Compute windowState
  type WindowState = 'pre' | 'live' | 'played' | 'closed';
  let windowState: WindowState = 'pre';
  let countdown = '';
  let windowStart = '';
  let windowEnd = '';

  if (challenge) {
    const now = Date.now();
    const closes = challenge.window_closes_at ? new Date(challenge.window_closes_at).getTime() : 0;
    const remainingSec = Math.max(0, Math.floor((closes - now) / 1000));

    if (existingPlayId) {
      windowState = 'played';
    } else if (remainingSec > 0) {
      windowState = 'live';
      const h = Math.floor(remainingSec / 3600);
      const m = Math.floor((remainingSec % 3600) / 60);
      const s = remainingSec % 60;
      countdown = h > 0
        ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        : `${m}:${String(s).padStart(2,'0')}`;
    } else {
      windowState = 'closed';
    }

    if (challenge.window_closes_at) {
      const pub = new Date(new Date(challenge.window_closes_at).getTime() - 2 * 60 * 60 * 1000);
      windowStart = pub.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
      windowEnd = new Date(challenge.window_closes_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
    }
  }

  // Date header
  const now = new Date();
  const dateHeader = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' });
  const dayOfYear = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const weekNum = Math.ceil(dayOfYear / 7);
  const todayShort = now.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' }).replace(',', ' ·');

  const userInitials = profile?.display_name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? 'tu';
  const bestScore = ownWeeklyRow?.total_score ?? null;
  const weeklyRank = ownWeeklyRow?.rank ?? null;
  const totalWeeklyPlayers = weeklyRows.length > 0 ? Math.max(...weeklyRows.map((r: any) => r.rank ?? 0)) : 0;

  const challengeDay = dayOfYear; // approximate

  return (
    <main className="relative min-h-dvh bg-paper text-ink">
      <AtlasBackdrop />
      <WebHeader active="today" todayShort={todayShort} userInitials={userInitials} />

      <div className="relative z-10 px-12 pb-16 pt-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left col */}
          <section className="col-span-7">
            <p className="mb-6 text-[11px] uppercase tracking-widest text-subink">
              {dateHeader} · Settimana <Tabular>{weekNum}</Tabular>
            </p>
            {user ? (
              <>
                <DailyCard
                  day={challengeDay}
                  windowState={windowState}
                  countdown={countdown}
                  windowStart={windowStart || '09:00'}
                  windowEnd={windowEnd || '17:00'}
                  avgPlayMinutes={3}
                  playersToday={weeklyRows.length}
                  challengeHref={challenge ? `/play/${challenge.id}` : '#'}
                  resultHref={existingPlayId ? `/result/${existingPlayId}` : '#'}
                />
                <p className="mt-4 text-[12px] text-subink">
                  Posizione esatta visibile solo dopo la chiusura della finestra ↗
                </p>
              </>
            ) : (
              <div className="rounded-3xl border border-black/8 bg-cream p-7 shadow-cardLg">
                <h2 className="font-display text-[42px] font-medium leading-[0.95] tracking-tightish">
                  Una via.<br />Un panorama.<br /><span className="text-subink">Due ore.</span>
                </h2>
                <div className="mt-7 flex gap-3">
                  <Link href="/login" className="flex items-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-[14px] font-semibold text-cream">
                    Accedi
                  </Link>
                  <Link href="/signup" className="rounded-2xl border border-black/8 px-5 py-3.5 text-[13px] font-medium text-ink">
                    Registrati
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Right col — stats + leaderboard */}
          {user && (
            <aside className="col-span-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: 'Striscia', v: String(profile?.streak_count ?? 0), u: 'giorni' },
                  { k: 'Migliore', v: bestScore ? bestScore.toLocaleString('it') : '—', u: 'punti' },
                  { k: 'Posizione', v: weeklyRank ? `${weeklyRank}ª` : '—', u: totalWeeklyPlayers ? `su ${totalWeeklyPlayers}` : '' },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl border border-black/8 bg-cream px-4 py-4">
                    <p className="text-[10px] uppercase tracking-wider text-subink">{s.k}</p>
                    <p className="mt-1.5 font-display text-[30px] font-medium leading-none tracking-tight tabular-nums">{s.v}</p>
                    <p className="mt-1.5 text-[11px] text-subink">{s.u}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-black/8 bg-cream">
                <header className="flex items-center justify-between px-5 pt-4 pb-2">
                  <p className="text-[11px] uppercase tracking-wider text-subink">Classifica settimanale</p>
                  <Link href="/leaderboard" className="text-[11px] text-subink underline-offset-4 hover:underline">Vedi tutto →</Link>
                </header>
                <ul>
                  {weeklyRows.slice(0, 5).map((row: any) => {
                    const isMe = row.user_id === user.id;
                    return (
                      <li key={row.user_id} className={`flex items-center gap-3 border-t border-black/8 px-5 py-2.5 ${isMe ? 'bg-flame-soft' : ''}`}>
                        <span className={`w-7 text-[12px] tabular-nums ${isMe ? 'font-semibold text-flame' : 'text-subink'}`}>{row.rank}</span>
                        <span className={`flex-1 truncate text-[13px] ${isMe ? 'font-semibold' : ''}`}>{row.display_name ?? 'Anonimo'}</span>
                        <Tabular className="w-14 text-right text-[13px]">{row.total_score?.toLocaleString('it')}</Tabular>
                      </li>
                    );
                  })}
                  {ownWeeklyRow && !weeklyRows.slice(0, 5).find((r: any) => r.user_id === user.id) && (
                    <li className="flex items-center gap-3 border-t border-black/8 bg-flame-soft px-5 py-2.5">
                      <span className="w-7 text-[12px] tabular-nums font-semibold text-flame">{ownWeeklyRow.rank}</span>
                      <span className="flex-1 truncate text-[13px] font-semibold">{ownWeeklyRow.display_name ?? 'Tu'}</span>
                      <Tabular className="w-14 text-right text-[13px]">{ownWeeklyRow.total_score?.toLocaleString('it')}</Tabular>
                    </li>
                  )}
                </ul>
              </div>
            </aside>
          )}
        </div>

        {/* Yesterday + sparkline */}
        {user && (
          <section className="mt-14 grid grid-cols-12 items-end gap-8">
            <div className="col-span-5">
              {yesterdayPlay ? (
                <>
                  <p className="text-[11px] uppercase tracking-widest text-subink">
                    Ieri · {yesterdayPlay.scheduled_for ?? ''}
                  </p>
                  <h3 className="mt-2 font-display text-[28px] font-medium tracking-tight">
                    <Tabular>{yesterdayPlay.total_score?.toLocaleString('it')}</Tabular> punti
                    {yesterdayPlay.location_label ? ` da ${yesterdayPlay.location_label}` : ''}.
                  </h3>
                  <p className="mt-2 text-[13px] text-subink">
                    A <Tabular>{yesterdayPlay.distance_km?.toFixed(0)} km</Tabular>
                    {yesterdayPlay.location_label ? ` da ${yesterdayPlay.location_label}` : ''}.
                  </p>
                  <Link href={`/result/${yesterdayPlay.id}`} className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium underline-offset-4 hover:underline">
                    Rivedi risultato →
                  </Link>
                </>
              ) : (
                <p className="text-[13px] text-subink">Nessuna partita recente.</p>
              )}
            </div>
            <div className="col-span-7">
              <div className="flex items-end justify-between gap-1">
                {last28.map((played, i) => {
                  const isToday = i === 27;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-[2px]"
                      style={{
                        height: isToday ? 36 : played ? 24 : 12,
                        background: isToday ? 'transparent' : played ? 'rgba(20,20,15,0.65)' : 'rgba(0,0,0,0.10)',
                        border: isToday ? '1px dashed #DA5520' : 'none',
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] tabular-nums text-subink">
                <span>28 giorni fa</span><span>Ultimi 28 giorni</span><span>oggi</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
