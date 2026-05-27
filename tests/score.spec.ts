import { describe, expect, it } from 'vitest';
import { computeScore } from '@/lib/score';

// Fixture values were hand-derived from the formula and must equal the SQL
// `submit_guess` output. If the SQL changes, update both sides + this file.

describe('computeScore', () => {
  it('distance 0 km, instant submit (10s) → max possible', () => {
    const r = computeScore({ distanceKm: 0, secondsSinceOpened: 10 });
    expect(r.baseScore).toBe(5000);
    expect(r.speedBonus).toBe(500);
    expect(r.accuracyMultiplier).toBe(1.2);
    expect(r.totalScore).toBe(6600);
  });

  it('distance just under 10 km still gets accuracy multiplier', () => {
    const r = computeScore({ distanceKm: 9.99, secondsSinceOpened: 90 });
    expect(r.accuracyMultiplier).toBe(1.2);
    expect(r.speedBonus).toBe(200);
  });

  it('distance exactly 10 km loses the multiplier', () => {
    const r = computeScore({ distanceKm: 10, secondsSinceOpened: 90 });
    expect(r.accuracyMultiplier).toBe(1.0);
  });

  it('60s submit gets full speed bonus, 61s drops to 200', () => {
    const fast = computeScore({ distanceKm: 50, secondsSinceOpened: 60 });
    const slower = computeScore({ distanceKm: 50, secondsSinceOpened: 61 });
    expect(fast.speedBonus).toBe(500);
    expect(slower.speedBonus).toBe(200);
  });

  it('121s loses the speed bonus entirely', () => {
    const r = computeScore({ distanceKm: 50, secondsSinceOpened: 121 });
    expect(r.speedBonus).toBe(0);
  });

  it('distance 500 km, 5 min submit', () => {
    // base = round(5000 * exp(-500/1500)) = round(3583.039...) = 3583
    const r = computeScore({ distanceKm: 500, secondsSinceOpened: 300 });
    expect(r.baseScore).toBe(3583);
    expect(r.speedBonus).toBe(0);
    expect(r.accuracyMultiplier).toBe(1.0);
    expect(r.totalScore).toBe(3583);
  });

  it('distance 1500 km, very slow submit', () => {
    // base = round(5000 * exp(-1)) = round(1839.397...) = 1839
    const r = computeScore({ distanceKm: 1500, secondsSinceOpened: 3600 });
    expect(r.baseScore).toBe(1839);
    expect(r.totalScore).toBe(1839);
  });

  it('rejects negative seconds (clamped to 0)', () => {
    const r = computeScore({ distanceKm: 0, secondsSinceOpened: -5 });
    expect(r.speedBonus).toBe(500); // clamped 0 → still <= 60
  });

  it('rejects negative distance (clamped to 0)', () => {
    const r = computeScore({ distanceKm: -3, secondsSinceOpened: 30 });
    expect(r.baseScore).toBe(5000);
    expect(r.accuracyMultiplier).toBe(1.2);
  });
});
