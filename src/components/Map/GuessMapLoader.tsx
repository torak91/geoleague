'use client';

import dynamic from 'next/dynamic';

/**
 * Leaflet touches `window` at import time, so it must be loaded only on the
 * client. Parents import this loader instead of GuessMap.tsx directly.
 */
export const GuessMap = dynamic(() => import('./GuessMap').then((m) => m.GuessMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[280px] w-full items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-sm text-neutral-500">
      Caricamento mappa…
    </div>
  ),
});
