// GeoLeague service worker.
//
// Single responsibility for now: handle incoming Web Push events and
// surface a notification. Offline/asset caching can be added in step 22
// (PWA polish).

self.addEventListener('install', (event) => {
  // Activate immediately on first install.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'GeoLeague', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'GeoLeague';
  const body = data.body || 'Nuova sfida disponibile!';
  const url = data.url || '/';
  const tag = data.tag || 'geoleague';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      badge: '/icon.svg',
      icon: '/icon.svg',
      data: { url },
      // Replace previous notification with the same tag so a launch +
      // last-call do not stack.
      renotify: false,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if (client.url.endsWith(target) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })(),
  );
});
