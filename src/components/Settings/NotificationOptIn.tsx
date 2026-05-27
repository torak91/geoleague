'use client';

import { useCallback, useEffect, useState } from 'react';

type Status =
  | 'unsupported'
  | 'no_key'
  | 'loading'
  | 'denied'
  | 'idle'
  | 'subscribed'
  | 'error';

function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  // ArrayBuffer is satisfied by `applicationServerKey` (BufferSource).
  const buf = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buf;
}

export function NotificationOptIn({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<Status>('loading');
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        if (!cancelled) setStatus('unsupported');
        return;
      }
      if (!vapidPublicKey) {
        if (!cancelled) setStatus('no_key');
        return;
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) setStatus('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (existing) {
          setEndpoint(existing.endpoint);
          setStatus('subscribed');
        } else {
          setStatus('idle');
        }
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'sw_register_failed');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  const subscribe = useCallback(async () => {
    if (!vapidPublicKey) return;
    setErrorMsg(null);
    setStatus('loading');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'idle');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(vapidPublicKey),
      });
      const payload = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: payload.endpoint,
          keys: payload.keys,
        }),
      });
      if (!res.ok) throw new Error(`subscribe_failed_${res.status}`);
      setEndpoint(sub.endpoint);
      setStatus('subscribed');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'subscribe_failed');
      setStatus('error');
    }
  }, [vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    setErrorMsg(null);
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEndpoint(null);
      setStatus('idle');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'unsubscribe_failed');
      setStatus('error');
    }
  }, []);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
      <h2 className="mb-1 text-base font-semibold">Notifiche push</h2>
      <p className="mb-3 text-xs text-neutral-600">
        Ricevi una notifica appena la sfida quotidiana è disponibile.
      </p>

      {status === 'unsupported' ? (
        <p className="text-xs text-neutral-500">
          Il tuo browser non supporta le notifiche push.
        </p>
      ) : status === 'no_key' ? (
        <p className="text-xs text-neutral-500">
          Le notifiche push non sono ancora configurate sul server.
        </p>
      ) : status === 'denied' ? (
        <p className="text-xs text-red-600">
          Le notifiche sono bloccate dal browser. Sblocca dalle impostazioni del sito.
        </p>
      ) : status === 'loading' ? (
        <p className="text-xs text-neutral-500">Caricamento…</p>
      ) : status === 'subscribed' ? (
        <div className="space-y-2">
          <p className="text-xs text-green-700">Notifiche attive su questo dispositivo.</p>
          {endpoint ? (
            <p className="break-all font-mono text-[10px] text-neutral-400">
              {endpoint.slice(0, 80)}…
            </p>
          ) : null}
          <button
            type="button"
            onClick={unsubscribe}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
          >
            Disattiva
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={subscribe}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          Attiva notifiche
        </button>
      )}

      {errorMsg ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {errorMsg}
        </p>
      ) : null}
    </div>
  );
}
