const CACHE_NAME = 'xzone-v2';
const STATIC_ASSETS = ['/', '/index.html'];

// ─── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// ─── ACTIVATE ──────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── FETCH (cache-first for assets, network-first for API) ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('firestore') || e.request.url.includes('googleapis')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ─── PUSH RECEIVED ─────────────────────────────────────────
self.addEventListener('push', e => {
  let payload = {
    title: 'X—ZONE',
    body: 'Vous avez un nouveau message',
    type: 'general',
    url: '/',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };

  if (e.data) {
    try { Object.assign(payload, e.data.json()); }
    catch { payload.body = e.data.text(); }
  }

  // Rich notification icons per type
  const icons = {
    message:      '💬',
    post:         '⚡',
    mention:      '📢',
    vote:         '⭐',
    notification: '🔔',
    room:         '🌐'
  };

  const emoji = icons[payload.type] || '🔔';
  const title = `${emoji}  X—ZONE`;

  const options = {
    body:    payload.body,
    icon:    payload.icon || '/favicon.ico',
    badge:   payload.badge || '/favicon.ico',
    vibrate: [150, 80, 150],
    silent:  false,
    tag:     payload.type + '_' + (payload.id || Date.now()),
    renotify: true,
    requireInteraction: payload.type === 'message',
    data: {
      url:    payload.url || '/',
      type:   payload.type,
      id:     payload.id || null
    },
    actions: payload.type === 'message'
      ? [
          { action: 'reply',  title: 'Répondre' },
          { action: 'open',   title: 'Ouvrir'   }
        ]
      : [
          { action: 'open',   title: 'Voir'     },
          { action: 'close',  title: 'Ignorer'  }
        ]
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ─── NOTIFICATION CLICK ────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if (e.action === 'close') return;

  const targetUrl = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // If app already open, focus + navigate
      for (const client of list) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return;
        }
      }
      // Otherwise open new tab
      return clients.openWindow(targetUrl);
    })
  );
});

// ─── NOTIFICATION CLOSE ────────────────────────────────────
self.addEventListener('notificationclose', e => {
  // Analytics could go here
});

// ─── BACKGROUND SYNC ───────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-posts') {
    // Background sync for offline posts would go here
  }
});
