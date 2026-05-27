// Europe/Rome week and month boundary helpers.
//
// Must match the Postgres trigger `apply_play_to_leaderboards`:
//   weekly  = date_trunc('week',  ts AT TIME ZONE 'Europe/Rome')::date   (Monday)
//   monthly = date_trunc('month', ts AT TIME ZONE 'Europe/Rome')::date   (1st)
//
// Implemented without Luxon to avoid a dependency. The trick is to use
// Intl.DateTimeFormat with `timeZone: 'Europe/Rome'` to extract the local
// Y/M/D, then do plain date arithmetic on a UTC-anchored Date.

const ROME_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function romeYmd(d: Date): { y: number; m: number; d: number } {
  // en-CA → YYYY-MM-DD
  const iso = ROME_PARTS.format(d);
  const [ys, ms, ds] = iso.split('-');
  return { y: Number(ys), m: Number(ms), d: Number(ds) };
}

function fmt(y: number, m: number, d: number): string {
  return (
    `${y.toString().padStart(4, '0')}-` +
    `${m.toString().padStart(2, '0')}-` +
    `${d.toString().padStart(2, '0')}`
  );
}

/** Monday of the week containing `now`, expressed in Europe/Rome. ISO date. */
export function weeklyPeriodStart(now: Date = new Date()): string {
  const { y, m, d } = romeYmd(now);
  // UTC-anchored Date for arithmetic. Day-of-week is stable for any zone
  // since we treat (y,m,d) as a local calendar tuple.
  const anchor = new Date(Date.UTC(y, m - 1, d));
  const dow = anchor.getUTCDay(); // 0=Sun … 6=Sat
  const offsetToMonday = (dow + 6) % 7; // Mon→0, Tue→1, … Sun→6
  anchor.setUTCDate(anchor.getUTCDate() - offsetToMonday);
  return fmt(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, anchor.getUTCDate());
}

/** 1st of the month containing `now`, expressed in Europe/Rome. ISO date. */
export function monthlyPeriodStart(now: Date = new Date()): string {
  const { y, m } = romeYmd(now);
  return fmt(y, m, 1);
}

/** Today's date in Europe/Rome as YYYY-MM-DD. */
export function romeDateIso(now: Date = new Date()): string {
  const { y, m, d } = romeYmd(now);
  return fmt(y, m, d);
}

const ROME_HM = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Rome wall-clock hour + minute. Hour is 0-23. */
export function romeHourMinute(now: Date = new Date()): { hour: number; minute: number } {
  // en-GB → "HH:mm"
  const [h, m] = ROME_HM.format(now).split(':').map(Number);
  return { hour: h, minute: m };
}

/**
 * Probability of publishing on this cron firing.
 *
 * Cron runs every 30 minutes between 09:00 and 17:00 Rome. Each tick has a
 * `1 / remaining_slots` chance, where remaining_slots counts the future
 * (and current) ticks up to 17:00. This yields a uniform random publish
 * time across the window. At 16:30+ the gate returns 1.0 — guaranteed
 * publish if still unpublished.
 *
 * Returns 0 outside the window.
 */
export function publishProbability(hour: number, minute: number): number {
  if (hour < 9 || hour >= 17) return 0;
  if (hour >= 16 && minute >= 30) return 1; // force-publish floor

  // Total half-hour slots in [hour:minute .. 17:00).
  const slotIndex = (hour - 9) * 2 + (minute >= 30 ? 1 : 0); // 0..15
  const totalSlots = 16; // 8 hours × 2 ticks
  const remaining = totalSlots - slotIndex;
  if (remaining <= 0) return 0;
  return 1 / remaining;
}
