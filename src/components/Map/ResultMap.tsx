'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L, { type LatLngExpression } from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';

const actualIcon = L.divIcon({
  className: 'gl-pin-actual',
  html: `
    <svg viewBox="0 0 24 32" width="28" height="36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 12 20 12 20s12-11.4 12-20C24 5.4 18.6 0 12 0z" fill="#16a34a"/>
      <circle cx="12" cy="12" r="4" fill="#ffffff"/>
    </svg>
  `,
  iconSize: [28, 36],
  iconAnchor: [14, 34],
});

const guessIcon = L.divIcon({
  className: 'gl-pin-guess',
  html: `
    <svg viewBox="0 0 24 32" width="28" height="36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 12 20 12 20s12-11.4 12-20C24 5.4 18.6 0 12 0z" fill="#dc2626"/>
      <circle cx="12" cy="12" r="4" fill="#ffffff"/>
    </svg>
  `,
  iconSize: [28, 36],
  iconAnchor: [14, 34],
});

function FitBounds({ a, b }: { a: LatLngExpression; b: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([a, b]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
  }, [a, b, map]);
  return null;
}

type Props = {
  guess: { lat: number; lng: number };
  actual: { lat: number; lng: number };
};

export function ResultMap({ guess, actual }: Props) {
  const a: LatLngExpression = [guess.lat, guess.lng];
  const b: LatLngExpression = [actual.lat, actual.lng];
  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-neutral-200">
      <MapContainer
        center={a}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
        style={{ minHeight: 280 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={a} icon={guessIcon} />
        <Marker position={b} icon={actualIcon} />
        <Polyline
          positions={[a, b]}
          pathOptions={{ color: '#737373', weight: 2, dashArray: '6 6' }}
        />
        <FitBounds a={a} b={b} />
      </MapContainer>
    </div>
  );
}
