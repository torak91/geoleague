'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import L, { type LatLngExpression, type LatLngLiteral, type LeafletMouseEvent } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

const ITALY_CENTER: LatLngExpression = [42.5, 12.5];
const DEFAULT_ZOOM = 5;

// SVG-based marker — avoids the well-known broken default-icon URLs in
// react-leaflet + bundler setups.
const pinIcon = L.divIcon({
  className: 'gl-pin',
  html: `
    <svg viewBox="0 0 24 32" width="28" height="36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 12 20 12 20s12-11.4 12-20C24 5.4 18.6 0 12 0z" fill="#DA5520"/>
      <circle cx="12" cy="12" r="4" fill="#FBF8F2"/>
    </svg>
  `,
  iconSize: [28, 36],
  iconAnchor: [14, 34],
});

type Props = {
  /** Fires whenever the user places or drags the pin. null = pin cleared. */
  onChange?: (position: LatLngLiteral | null) => void;
  /** Initial pin position; if absent, no pin until the user clicks. */
  initial?: LatLngLiteral | null;
  /** Disables interaction (e.g. after submission). */
  disabled?: boolean;
};

function ClickHandler({
  onClick,
  disabled,
}: {
  onClick: (latlng: LatLngLiteral) => void;
  disabled: boolean;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (disabled) return;
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function GuessMap({ onChange, initial = null, disabled = false }: Props) {
  const [pin, setPin] = useState<LatLngLiteral | null>(initial);

  useEffect(() => {
    setPin(initial ?? null);
  }, [initial]);

  const handleSet = (next: LatLngLiteral | null) => {
    setPin(next);
    onChange?.(next);
  };

  const dragHandlers = useMemo(
    () => ({
      dragend(e: L.LeafletEvent) {
        const marker = e.target as L.Marker;
        const p = marker.getLatLng();
        handleSet({ lat: p.lat, lng: p.lng });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange],
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-neutral-200">
      <MapContainer
        center={ITALY_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={4}
        maxZoom={12}
        scrollWheelZoom
        className="h-full w-full"
        style={{ minHeight: 280 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={handleSet} disabled={disabled} />
        {pin ? (
          <Marker
            position={pin}
            icon={pinIcon}
            draggable={!disabled}
            eventHandlers={dragHandlers}
          />
        ) : null}
      </MapContainer>
      {!pin ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-black/70 px-3 py-1.5 text-xs text-white">
          Tocca la mappa per piazzare il pin
        </div>
      ) : null}
    </div>
  );
}
