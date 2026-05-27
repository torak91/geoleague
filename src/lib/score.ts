/**
 * Mirror of the SQL `submit_guess` formula. Used for live previews in the
 * UI; the SQL function in migration 20260526134509_rpc_submit_guess.sql is
 * the source of truth — never trust this for awarding points.
 *
 * Keep the two implementations in lockstep: any change here MUST be made in
 * the SQL function as well, and tests/score.spec.ts must continue to pass.
 */

export type ScoreInput = {
  distanceKm: number;
  /** Seconds between challenge_opens.opened_at and submission time. */
  secondsSinceOpened: number;
};

export type ScoreBreakdown = {
  baseScore: number;
  speedBonus: number;
  accuracyMultiplier: number;
  totalScore: number;
};

const DECAY_KM = 1500;
const PEAK_SCORE = 5000;

function speedBonus(secondsSinceOpened: number): number {
  const s = Math.max(0, Math.round(secondsSinceOpened));
  if (s <= 60) return 500;
  if (s <= 120) return 200;
  return 0;
}

function accuracyMultiplier(distanceKm: number): number {
  return distanceKm < 10 ? 1.2 : 1.0;
}

/** Bankers' rounding is NOT used — we match Postgres' default round() which is half-away-from-zero. */
function halfAwayFromZero(x: number): number {
  return x >= 0 ? Math.floor(x + 0.5) : -Math.floor(-x + 0.5);
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const distanceKm = Math.max(0, input.distanceKm);
  const baseScore = halfAwayFromZero(PEAK_SCORE * Math.exp(-distanceKm / DECAY_KM));
  const sb = speedBonus(input.secondsSinceOpened);
  const mult = accuracyMultiplier(distanceKm);
  const totalScore = halfAwayFromZero((baseScore + sb) * mult);
  return {
    baseScore,
    speedBonus: sb,
    accuracyMultiplier: mult,
    totalScore,
  };
}
