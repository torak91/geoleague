'use client';

import { useEffect, useState } from 'react';

type Props = {
  /** ISO timestamp of when the window closes. Anchored on the server. */
  deadlineIso: string;
  /** Optional callback fired the first time the deadline elapses client-side. */
  onExpire?: () => void;
};

function format(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function Countdown({ deadlineIso, onExpire }: Props) {
  const deadline = new Date(deadlineIso).getTime();
  const [now, setNow] = useState<number>(() => Date.now());
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!fired && now >= deadline) {
      setFired(true);
      onExpire?.();
    }
  }, [now, deadline, fired, onExpire]);

  const remaining = (deadline - now) / 1000;
  const expired = remaining <= 0;

  return (
    <span
      aria-live="polite"
      className={
        expired
          ? 'font-mono text-red-600 tabular-nums'
          : remaining < 600
            ? 'font-mono text-amber-600 tabular-nums'
            : 'font-mono tabular-nums'
      }
    >
      {format(remaining)}
    </span>
  );
}
