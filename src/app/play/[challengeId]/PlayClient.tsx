'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PanoViewer } from '@/components/Pano/PanoViewer';
import { GuessMap } from '@/components/Map/GuessMapLoader';
import { Countdown } from '@/components/Countdown';
import { t, type TranslationKey } from '@/lib/i18n';
import { markOpenedAction, submitGuessAction } from './actions';

const submitErrorMap: Record<string, TranslationKey> = {
  window_closed: 'play.error.window_closed',
  already_submitted: 'play.error.already_submitted',
  not_opened: 'play.error.not_opened',
  invalid_guess: 'play.error.invalid_guess',
};

type Props = {
  challengeId: string;
  imageUrls: string[];
  windowClosesAt: string;
};

export function PlayClient({ challengeId, imageUrls, windowClosesAt }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();
  const markedRef = useRef(false);

  const handlePanoReady = useCallback(async () => {
    if (markedRef.current) return;
    markedRef.current = true;
    const res = await markOpenedAction(challengeId);
    if (!res.ok) {
      // Non-fatal — the score will fall back to 0 speed-bonus on the server.
      console.warn('markOpened failed', res.error);
    }
  }, [challengeId]);

  const handlePinChange = useCallback((p: { lat: number; lng: number } | null) => {
    setPin(p);
  }, []);

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
        setConfirmOpen(false);
      }
    });
  }, [challengeId, pin, router]);

  const canSubmit = pin !== null && !expired && !isSubmitting;

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 text-sm">
        <span className="font-semibold">{t['brand.name']}</span>
        <span className="flex items-center gap-2 text-neutral-700">
          <span>{t['play.window_label']}:</span>
          <Countdown deadlineIso={windowClosesAt} onExpire={() => setExpired(true)} />
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-3 pb-28">
        <PanoViewer imageUrls={imageUrls} onReady={handlePanoReady} />

        <div className="h-[44vh] min-h-[280px]">
          <GuessMap onChange={handlePinChange} disabled={expired} />
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-xs text-neutral-600">
            {pin
              ? `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`
              : t['play.no_pin']}
          </span>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {expired ? t['play.error.window_closed'] : t['play.submit']}
          </button>
        </div>
      </footer>

      {confirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t['play.confirm']}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">{t['play.confirm']}</h2>
            {pin ? (
              <p className="mb-4 text-sm text-neutral-700">
                {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
              </p>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm"
              >
                {t['play.confirm_no']}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {t['play.confirm_yes']}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
