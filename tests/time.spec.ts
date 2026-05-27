import { describe, expect, it } from 'vitest';
import { weeklyPeriodStart, monthlyPeriodStart } from '@/lib/time';

// Reference dates use ISO UTC strings; helpers convert through Europe/Rome
// before truncating, so summer (CEST = UTC+2) and winter (CET = UTC+1)
// transitions are exercised.

describe('weeklyPeriodStart', () => {
  it('returns Monday for a midweek date in CET', () => {
    // 2026-01-14 is a Wednesday in Europe/Rome.
    expect(weeklyPeriodStart(new Date('2026-01-14T12:00:00Z'))).toBe('2026-01-12');
  });

  it('returns the same Monday for the Monday itself', () => {
    expect(weeklyPeriodStart(new Date('2026-01-12T12:00:00Z'))).toBe('2026-01-12');
  });

  it('returns the previous Monday for a Sunday', () => {
    // 2026-01-18 is a Sunday.
    expect(weeklyPeriodStart(new Date('2026-01-18T12:00:00Z'))).toBe('2026-01-12');
  });

  it('handles month rollover (week spans two months)', () => {
    // 2026-02-01 is a Sunday → previous Monday is 2026-01-26.
    expect(weeklyPeriodStart(new Date('2026-02-01T12:00:00Z'))).toBe('2026-01-26');
  });

  it('uses Europe/Rome calendar, not UTC, around midnight', () => {
    // 2026-01-12T00:30:00+01:00 = 2026-01-11T23:30:00Z. In UTC that is
    // Sunday, but in Rome it is Monday — should return Monday 2026-01-12.
    expect(weeklyPeriodStart(new Date('2026-01-11T23:30:00Z'))).toBe('2026-01-12');
  });

  it('handles DST transition (March 29, 2026 CET→CEST)', () => {
    // 2026-03-29 is a Sunday in Rome (DST starts that morning at 02:00).
    // Previous Monday is 2026-03-23.
    expect(weeklyPeriodStart(new Date('2026-03-29T10:00:00Z'))).toBe('2026-03-23');
  });
});

describe('monthlyPeriodStart', () => {
  it('returns the 1st of the current month', () => {
    expect(monthlyPeriodStart(new Date('2026-05-26T12:00:00Z'))).toBe('2026-05-01');
  });

  it('uses Rome calendar at midnight', () => {
    // 2026-02-01T00:30:00+01:00 = 2026-01-31T23:30:00Z. UTC says January;
    // Rome says February.
    expect(monthlyPeriodStart(new Date('2026-01-31T23:30:00Z'))).toBe('2026-02-01');
  });

  it('handles year rollover', () => {
    expect(monthlyPeriodStart(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-01');
  });
});
