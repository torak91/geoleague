'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HEADINGS, type Heading } from '@/lib/headings';

export { HEADINGS, type Heading };

/** Pixels of horizontal drag required to step one heading (15° per step). */
const DRAG_STEP_PX = 30;

type Props = {
  /** Public URLs of the 8 images in heading order: [0, 45, 90, 135, 180, 225, 270, 315]. */
  imageUrls: string[];
  /** Initial heading; defaults to 0°. */
  initialHeading?: Heading;
  /**
   * Fires exactly once after all 8 images have decoded. Used by the play
   * flow to record the speed-bonus anchor (calls markOpened server action).
   */
  onReady?: () => void;
};

function nextIndex(i: number, step: number): number {
  return (i + step + HEADINGS.length) % HEADINGS.length;
}

export function PanoViewer({ imageUrls, initialHeading = 0, onReady }: Props) {
  const [index, setIndex] = useState<number>(HEADINGS.indexOf(initialHeading));
  const [loaded, setLoaded] = useState<number>(0);
  const [errored, setErrored] = useState<boolean>(false);
  const onReadyFiredRef = useRef(false);
  const dragRef = useRef<{ startX: number; pointerId: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Preload + decode all 8 images. onReady fires once all complete.
  useEffect(() => {
    let cancelled = false;
    setLoaded(0);
    setErrored(false);
    onReadyFiredRef.current = false;

    let count = 0;
    imageUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
      const finish = (ok: boolean) => {
        if (cancelled) return;
        if (!ok) {
          setErrored(true);
          return;
        }
        count += 1;
        setLoaded(count);
      };
      // decode() falls back to onload when not supported.
      if (typeof img.decode === 'function') {
        img.decode().then(
          () => finish(true),
          () => {
            // decode can reject in some browsers even when the image will display.
            // Fall back to onload.
            if (img.complete && img.naturalWidth > 0) finish(true);
            else img.onload = () => finish(true);
            img.onerror = () => finish(false);
          },
        );
      } else {
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrls]);

  // Fire onReady exactly once when all 8 are loaded.
  useEffect(() => {
    if (loaded >= HEADINGS.length && !onReadyFiredRef.current) {
      onReadyFiredRef.current = true;
      onReady?.();
    }
  }, [loaded, onReady]);

  const step = useCallback((delta: number) => {
    setIndex((i) => nextIndex(i, delta));
  }, []);

  // Keyboard: left/right arrows. Container must be focused (tabIndex=0).
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(+1);
      }
    },
    [step],
  );

  // Pointer drag: each DRAG_STEP_PX of horizontal movement = one heading.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, pointerId: e.pointerId };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      if (Math.abs(delta) >= DRAG_STEP_PX) {
        // Dragging RIGHT = look LEFT (heading decreases) — matches a panorama
        // metaphor where dragging the image pulls the world with it.
        step(delta > 0 ? -1 : +1);
        dragRef.current.startX = e.clientX;
      }
    },
    [step],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  }, []);

  const heading = HEADINGS[index];
  const ready = loaded >= HEADINGS.length;

  // Compass tick positions (N E S W) as { label, angle }.
  const compass = useMemo(
    () => [
      { label: 'N', angle: 0 },
      { label: 'E', angle: 90 },
      { label: 'S', angle: 180 },
      { label: 'O', angle: 270 },
    ],
    [],
  );

  return (
    <div className="relative aspect-video w-full select-none overflow-hidden rounded-xl bg-neutral-900">
      <div
        ref={containerRef}
        role="region"
        aria-label="Visore panoramico"
        aria-roledescription="Trascina o usa le frecce per ruotare"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="absolute inset-0 cursor-grab touch-none focus:outline-none active:cursor-grabbing"
      >
        {imageUrls.map((url, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={url}
            src={url}
            alt={`Heading ${HEADINGS[i]}°`}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ))}

        {!ready && !errored ? (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center bg-neutral-900/70 text-sm text-white"
          >
            Caricamento immagini… {loaded}/{HEADINGS.length}
          </div>
        ) : null}

        {errored ? (
          <div
            role="alert"
            className="absolute inset-0 flex items-center justify-center bg-red-900/80 text-sm text-white"
          >
            Impossibile caricare le immagini. Ricarica la pagina.
          </div>
        ) : null}
      </div>

      {/* On-screen rotation buttons */}
      <button
        type="button"
        aria-label="Ruota a sinistra"
        onClick={() => step(-1)}
        disabled={!ready}
        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white backdrop-blur disabled:opacity-30"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Ruota a destra"
        onClick={() => step(+1)}
        disabled={!ready}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white backdrop-blur disabled:opacity-30"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Compass */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-center gap-1 rounded-lg bg-black/60 px-2 py-1.5 text-xs font-medium text-white backdrop-blur">
        <div className="relative h-8 w-8 rounded-full border border-white/40">
          {compass.map((c) => {
            const rad = ((c.angle - heading) * Math.PI) / 180;
            const x = 50 + 38 * Math.sin(rad);
            const y = 50 - 38 * Math.cos(rad);
            return (
              <span
                key={c.label}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] leading-none text-white/80"
              >
                {c.label}
              </span>
            );
          })}
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-400" />
        </div>
        <span aria-live="polite">{heading}°</span>
      </div>
    </div>
  );
}
