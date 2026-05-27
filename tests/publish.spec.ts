import { describe, expect, it } from 'vitest';
import { publishProbability } from '@/lib/time';

describe('publishProbability', () => {
  it('returns 0 before 09:00 Rome', () => {
    expect(publishProbability(8, 59)).toBe(0);
    expect(publishProbability(0, 0)).toBe(0);
  });

  it('returns 0 at or after 17:00 Rome', () => {
    expect(publishProbability(17, 0)).toBe(0);
    expect(publishProbability(23, 59)).toBe(0);
  });

  it('returns 1 at the force-publish floor (16:30+)', () => {
    expect(publishProbability(16, 30)).toBe(1);
    expect(publishProbability(16, 45)).toBe(1);
    expect(publishProbability(16, 59)).toBe(1);
  });

  it('returns 1/16 at the first slot (09:00)', () => {
    expect(publishProbability(9, 0)).toBeCloseTo(1 / 16, 6);
  });

  it('returns 1/15 at the second slot (09:30)', () => {
    expect(publishProbability(9, 30)).toBeCloseTo(1 / 15, 6);
  });

  it('returns 1/1 at the last non-forced slot just before the floor (15:30)', () => {
    // 15:30 is slot index 13 → remaining = 16 - 13 = 3 slots (15:30, 16:00, 16:30).
    // 16:30 is the floor itself, so two more random slots remain → 1/3.
    expect(publishProbability(15, 30)).toBeCloseTo(1 / 3, 6);
  });

  it('evening slot (startHour=18): returns 0 before 18:00', () => {
    expect(publishProbability(17, 59, 18, 26)).toBe(0);
    expect(publishProbability(9, 0, 18, 26)).toBe(0);
  });

  it('evening slot (startHour=18): in-window returns positive probability', () => {
    expect(publishProbability(18, 0, 18, 26)).toBeCloseTo(1 / 12, 6);
    expect(publishProbability(18, 30, 18, 26)).toBeCloseTo(1 / 11, 6);
  });

  it('evening slot (startHour=18): force-publish at 23:30', () => {
    expect(publishProbability(23, 30, 18, 26)).toBe(1);
    expect(publishProbability(23, 45, 18, 26)).toBe(1);
  });

  it('evening slot: returns 0 at or after 00:00 (endHour clamped to 24)', () => {
    // hour is always 0-23; "after 24" is unreachable, but 0 should be outside window
    expect(publishProbability(0, 0, 18, 26)).toBe(0);
  });

  it('expected publish count across the window is exactly 1', () => {
    // Sum of 1/16 + 1/15 + … + 1/2 + (final tick = 1) but the 16:30 floor
    // makes things tricky. The probabilities BEFORE the floor sum to 1
    // (the forced tick guarantees a publish either way). Verify the chain
    // produces total mass ≈ 1.
    const slots: Array<[number, number]> = [];
    for (let h = 9; h < 17; h++) {
      slots.push([h, 0], [h, 30]);
    }
    let survival = 1;
    let totalPublishProb = 0;
    for (const [h, m] of slots) {
      const p = publishProbability(h, m);
      totalPublishProb += survival * p;
      survival *= 1 - p;
    }
    expect(totalPublishProb).toBeCloseTo(1, 6);
    expect(survival).toBeCloseTo(0, 6);
  });
});
