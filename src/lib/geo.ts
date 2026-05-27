/** Earth radius in kilometres (mean radius, used by all SQL haversine helpers too). */
export const EARTH_RADIUS_KM = 6371;

export type LatLng = { lat: number; lng: number };

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance in kilometres between two points. Mirrors the SQL
 * earthdistance formula used by submit_guess so client-side preview and
 * server scoring agree to within floating-point precision.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Returns a human-readable distance string: "12 m", "1.4 km", "238 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
