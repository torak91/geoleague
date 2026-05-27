'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PanoViewer } from '@/components/Pano/PanoViewer';
import { GuessMap } from '@/components/Map/GuessMapLoader';
import { LogoLockup } from '@/components/brand';
import { markOpenedAction, submitGuessAction } from './actions';
import { t, type TranslationKey } from '@/lib/i18n';

const submitErrorMap: Record<string, TranslationKey> = {
  window_closed: 'play.error.window_closed',
  already_submitted: 'play.error.already_submitted',
  not_opened: 'play.error.not_opened',
  invalid_guess: 'play.error.invalid_guess',
};

type Props = { challengeId: string; imageUrls: string[]; windowClosesAt: string; day?: number };

function formatTimer(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PlayClient({ challengeId, imageUrls, windowClosesAt, day }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingSec, setRemainingSec] = useState(() =>
    Math.max(0, Math.floor((new Date(windowClosesAt).getTime() - Date.now()) / 1000))
  );
  const [, startTransition] = useTransition();
  const markedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const sec = Math.max(0, Math.floor((new Date(windowClosesAt).getTime() - Date.now()) / 1000));
      setRemainingSec(sec);
      if (sec === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [windowClosesAt]);

  const expired = remainingSec === 0;
  const canSubmit = pin !== null && !expired && !isSubmitting;

  const handlePanoReady = useCallback(async () => {
    if (markedRef.current) return;
    markedRef.current = true;
    await markOpenedAction(challengeId);
  }, [challengeId]);

  const handleSubmit = useCallback(async () => {
    if (!pin) return;
    setError(null);
    setIsSubmitting(true);
    startTransition(async () => {
      const res = await submitGuessAction(challengeId, pin.lat, pin.lng);
      if (res.ok) {
        router.push(`/result/${res.playId}`);
      } else {
        const k = submitErrorMap[res.error] ?? 'play.error.generic';
        setError(t[k]);
        setIsSubmitting(false);
      }
    });
  }, [challengeId, pin, router]);

  // Enter key submits
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && canSubmit) handleSubmit();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSubmit, handleSubmit]);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-ink text-cream">
      {/* Panorama fills viewport */}
      <div className="absolute inset-0">
        <PanoViewer imageUrls={imageUrls} onReady={handlePanoReady} />
      </div>

      {/* Floating glass header */}
      <header className="absolute inset-x-4 top-4 z-20 flex items-center justify-between rounded-2xl border border-white/10 bg-black/45 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <LogoLockup size={18} color="#FBF8F2" />
          <span className="h-5 w-px bg-white/15" />
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-wider text-cream/55">Giorno</span>
            <span className="font-display text-[16px] font-medium tabular-nums">{day ?? '—'}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-wider text-cream/55">Tempo rimasto</span>
          <motion.span
            className="font-display text-[32px] font-medium leading-none tracking-tight tabular-nums"
            animate={remainingSec < 300 ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
            transition={{ duration: 1.2, repeat: remainingSec < 300 ? Infinity : 0, ease: 'easeInOut' }}
            style={{ color: remainingSec < 300 ? '#DA5520' : '#F6EFE2' }}
          >
            {formatTimer(remainingSec)}
          </motion.span>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-xl border border-white/15 px-3 py-2 text-[12px] hover:bg-white/10">
            Pausa
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-xl bg-flame px-4 py-2 text-[13px] font-semibold text-cream transition active:scale-[0.99] disabled:opacity-40"
          >
            {isSubmitting ? 'Invio…' : 'Invia ipotesi'}
            {!isSubmitting && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Floating mini-map */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="absolute bottom-4 right-4 z-20 overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
        style={{ width: expanded ? 380 : 56, height: expanded ? 340 : 56 }}
      >
        {expanded ? (
          <div className="relative h-full w-full">
            <GuessMap onChange={setPin} disabled={expired} />

            {/* top strip */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/45 to-transparent px-3 pb-3 pt-2">
              <span className="text-[10px] uppercase tracking-wider text-white/85">
                {pin ? 'Pin posizionato' : 'Piazza il segnaposto'}
              </span>
              <button
                className="pointer-events-auto rounded-md bg-white/15 px-2 py-0.5 text-[10px] text-white hover:bg-white/25"
                onClick={() => setExpanded(false)}
              >
                ↕ riduci
              </button>
            </div>

            {/* bottom strip */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/55 to-transparent px-3 pb-3 pt-6 text-white">
              <div className="text-[11px]">
                {pin ? (
                  <p className="font-mono tabular-nums">
                    ≈ {pin.lat.toFixed(1)}°N · {pin.lng.toFixed(1)}°E
                  </p>
                ) : (
                  <p className="opacity-65">Piazza il segnaposto</p>
                )}
              </div>
              <button
                className="pointer-events-auto rounded-lg bg-flame px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                Conferma
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="flex h-full w-full items-center justify-center bg-black/55 text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l6 6M9 15l6-6" opacity="0.5"/>
            </svg>
          </button>
        )}
      </motion.div>

      {/* KB hint pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <div className="rounded-full bg-black/45 px-4 py-2 text-[11px] text-white/85 backdrop-blur-md">
          <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">drag</kbd>{' '}per esplorare ·{' '}
          <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">tap</kbd>{' '}sulla mappa per piazzare ·{' '}
          <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>{' '}per inviare
        </div>
      </div>

      {error && (
        <div className="absolute inset-x-4 top-20 z-30 rounded-xl bg-red-900/80 px-4 py-3 text-sm text-white backdrop-blur-sm">
          {error}
        </div>
      )}
    </main>
  );
}
