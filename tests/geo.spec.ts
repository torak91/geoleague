import { describe, expect, it } from 'vitest';
import { haversineKm, formatDistance } from '@/lib/geo';

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    const p = { lat: 41.9028, lng: 12.4964 }; // Roma
    expect(haversineKm(p, p)).toBeCloseTo(0, 6);
  });

  it('matches known great-circle distance Rome → Milan', () => {
    const roma = { lat: 41.9028, lng: 12.4964 };
    const milano = { lat: 45.4642, lng: 9.19 };
    // Documented value ~478 km
    expect(haversineKm(roma, milano)).toBeGreaterThan(470);
    expect(haversineKm(roma, milano)).toBeLessThan(490);
  });

  it('is symmetric', () => {
    const a = { lat: 40.85, lng: 14.27 }; // Napoli
    const b = { lat: 45.07, lng: 7.69 }; // Torino
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe('formatDistance', () => {
  it('formats sub-km in metres', () => {
    expect(formatDistance(0.4)).toBe('400 m');
  });
  it('formats single-digit km with one decimal', () => {
    expect(formatDistance(2.34)).toBe('2.3 km');
  });
  it('rounds larger km to integer', () => {
    expect(formatDistance(238.6)).toBe('239 km');
  });
});
