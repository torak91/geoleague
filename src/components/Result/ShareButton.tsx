'use client';

import { useCallback, useState } from 'react';
import { t } from '@/lib/i18n';

type Props = {
  playId: string;
  totalScore: number;
};

type Feedback = { kind: 'success' | 'error'; message: string } | null;

export function ShareButton({ playId, totalScore }: Props) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const handleShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);

    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/share/${playId}`
        : `/share/${playId}`;
    const title = t['result.share.title_template'].replace(
      '{{score}}',
      totalScore.toLocaleString('it-IT'),
    );

    try {
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      if (nav && typeof nav.share === 'function') {
        await nav.share({ title, url });
        setFeedback({ kind: 'success', message: t['result.share.copied'] });
      } else if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        setFeedback({ kind: 'success', message: t['result.share.copied'] });
      } else {
        throw new Error('share_unsupported');
      }
    } catch (err) {
      // User cancelling the system share sheet rejects with AbortError;
      // suppress that, surface anything else as an error toast.
      if (err instanceof DOMException && err.name === 'AbortError') {
        setFeedback(null);
      } else {
        setFeedback({ kind: 'error', message: t['result.share.failed'] });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, playId, totalScore]);

  return (
    <div className="flex flex-1 flex-col gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-center text-sm font-medium disabled:opacity-50"
      >
        {t['result.share']}
      </button>
      {feedback ? (
        <p
          role="status"
          className={`text-center text-xs ${
            feedback.kind === 'success' ? 'text-green-700' : 'text-red-600'
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
