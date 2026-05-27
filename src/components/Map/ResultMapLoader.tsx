'use client';

import dynamic from 'next/dynamic';

export const ResultMap = dynamic(() => import('./ResultMap').then((m) => m.ResultMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[280px] w-full items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-sm text-neutral-500">
      Caricamento mappa…
    </div>
  ),
});
