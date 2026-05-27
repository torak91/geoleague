'use client';

import dynamic from 'next/dynamic';

export const HistoryMap = dynamic(() => import('./HistoryMap').then((m) => m.HistoryMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-sm text-neutral-500">
      Caricamento mappa…
    </div>
  ),
});

export type { HistoryPoint } from './HistoryMap';
