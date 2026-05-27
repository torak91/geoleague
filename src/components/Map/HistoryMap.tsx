'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import L, { type LatLngExpression } from 'leaflet';
import { MapContainer, CircleMarker, Popup, TileLayer, useMap } from 'react-leaflet';

export type HistoryPoint = {
  playId: string;
  challengeId: string;
  scheduledFor: string;
  totalScore: number;
  distanceKm: number;
  actualLat: number;
  actualLng: number;
  locationLabel: string | null;
};

// Five-band colour ramp on total_score. Score ranges roughly 0–6000.
function colourFor(score: number): string {
  if (score >= 5000) return '#15803d'; // green-700
  if (score >= 3500) return '#65a30d'; // lime-600
  if (score >= 2000) return '#ca8a04'; // yellow-600
  if (score >= 800) return '#ea580c'; // orange-600
  return '#dc2626'; // red-600
}

function FitAll({ points }: { points: HistoryPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].actualLat, points[0].actualLng], 6);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.actualLat, p.actualLng] as LatLngExpression));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 9 });
  }, [points, map]);
  return null;
}

type Props = {
  points: HistoryPoint[];
};

export function HistoryMap({ points }: Props) {
  const center = useMemo<LatLngExpression>(() => {
    if (points.length === 0) return [42.5, 12.5]; // Italy centre
    return [points[0].actualLat, points[0].actualLng];
  }, [points]);

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-neutral-200">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
        style={{ minHeight: 320 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <CircleMarker
            key={p.playId}
            center={[p.actualLat, p.actualLng]}
            radius={7}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: colourFor(p.totalScore),
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{p.scheduledFor}</div>
                {p.locationLabel ? <div className="text-neutral-700">{p.locationLabel}</div> : null}
                <div className="mt-1">
                  <span className="font-medium">{p.totalScore.toLocaleString('it-IT')}</span>{' '}
                  <span className="text-neutral-500">punti</span>
                </div>
                <div className="text-neutral-600">
                  {p.distanceKm < 1
                    ? `${Math.round(p.distanceKm * 1000)} m`
                    : `${p.distanceKm.toFixed(1)} km`}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
        <FitAll points={points} />
      </MapContainer>
    </div>
  );
}
