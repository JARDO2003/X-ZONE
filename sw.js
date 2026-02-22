// ============================================================
//  X-ZONE — Service Worker v2.0
//  Notifications programmées toutes les 2h + son unique
// ============================================================

const CACHE_NAME = 'xzone-v2';
const ASSETS = ['/'];

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ─── ACTIVATE ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();

  // Démarrer le planificateur dès activation
  scheduleNextNotification();
});

// ─── FETCH (cache-first) ────────────────────────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request)).catch(() => caches.match('/'))
  );
});

// ─── NOTIFICATION CLICK ─────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();

  const action = e.action;
  let url = '/?section=flux';

  if (action === 'open_msgs') url = '/?section=msgs&tab=inbox';
  else if (action === 'open_flux') url = '/?section=flux';
  else if (e.notification.data?.url) url = e.notification.data.url;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Ouvrir ou focus la fenêtre existante
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// ─── NOTIFICATION CLOSE ─────────────────────────────────────
self.addEventListener('notificationclose', () => {
  // rien à faire
});


// ============================================================
//  SCHEDULER — Notifications toutes les 2h
// ============================================================

// Banque de messages variés pour ne pas lasser
const NOTIF_POOL = [
  {
    tag: 'new-post',
    title: '⚡ Nouveaux posts sur X-ZONE',
    body: 'Le flux s\'embrase — des membres postent en ce moment.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    actions: [
      { action: 'open_flux', title: '🔥 Voir le Flux' },
      { action: 'open_msgs', title: '💬 Messages' }
    ],
    data: { url: '/?section=flux' }
  },
  {
    tag: 'new-message',
    title: '💬 Messages non lus',
    body: 'Quelqu\'un t\'a envoyé un message privé sur X-ZONE.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    actions: [
      { action: 'open_msgs', title: '💬 Lire les messages' },
      { action: 'open_flux', title: '⚡ Voir le Flux' }
    ],
    data: { url: '/?section=msgs' }
  },
  {
    tag: 'faction-activity',
    title: '🏴 Activité dans vos Factions',
    body: 'Vos factions sont actives — nouveaux posts et discussions.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    actions: [
      { action: 'open_flux', title: '🏴 Voir les Factions' },
      { action: 'open_msgs', title: '💬 Messages' }
    ],
    data: { url: '/?section=factions' }
  },
  {
    tag: 'market-alert',
    title: '🛒 Nouvelles annonces sur le Market',
    body: 'Des membres proposent des offres exclusives en crypto.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    actions: [
      { action: 'open_flux', title: '🛒 Voir le Market' },
      { action: 'open_msgs', title: '💬 Messages' }
    ],
    data: { url: '/?section=market' }
  },
  {
    tag: 'anon-room',
    title: '🌐 Salon Anonyme en feu',
    body: 'Le salon global est actif — rejoins la conversation.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    actions: [
      { action: 'open_msgs', title: '🌐 Rejoindre le Salon' },
      { action: 'open_flux', title: '⚡ Flux' }
    ],
    data: { url: '/?section=msgs&tab=room' }
  },
  {
    tag: 'night-mode',
    title: '🌙 X-ZONE ne dort jamais',
    body: 'La zone est active 24h/24 — que se passe-t-il en ce moment ?',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    actions: [
      { action: 'open_flux', title: '⚡ Voir le Flux' },
      { action: 'open_msgs', title: '💬 Messages' }
    ],
    data: { url: '/?section=flux' }
  }
];

// Index tournant pour varier les messages
let notifIndex = 0;

// ─── PLANIFICATEUR PRINCIPAL ─────────────────────────────────
function scheduleNextNotification() {
  const now = new Date();
  const ms = getDelayToNext2h(now);

  // Utiliser setTimeout (limité à ~24h en SW, mais le SW se réactive)
  setTimeout(() => {
    fireScheduledNotification();
    scheduleNextNotification(); // Reboucle
  }, ms);

  console.log(`[X-ZONE SW] Prochaine notif dans ${Math.round(ms / 60000)} min`);
}

// Calcule le délai en ms jusqu'au prochain créneau pair (00h, 02h, 04h… 22h)
function getDelayToNext2h(now) {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();

  // Prochain créneau pair
  const nextHour = h % 2 === 0 ? h + 2 : h + 1;
  const clampedHour = nextHour >= 24 ? nextHour - 24 : nextHour;

  const next = new Date(now);
  next.setHours(clampedHour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  return next.getTime() - now.getTime();
}

// ─── AFFICHER LA NOTIFICATION ─────────────────────────────────
async function fireScheduledNotification() {
  // Vérifier que la permission est accordée
  if (self.Notification && self.Notification.permission !== 'granted') return;

  const notif = NOTIF_POOL[notifIndex % NOTIF_POOL.length];
  notifIndex++;

  const now = new Date();
  const hour = now.getHours();

  // Message spécial à 22h
  const isNightTime = hour === 22;
  const body = isNightTime
    ? '🌙 22h sur X-ZONE — la zone s\'embrase, des secrets circulent.'
    : notif.body;

  const title = isNightTime
    ? '🔥 X-ZONE — La Nuit Commence'
    : notif.title;

  try {
    await self.registration.showNotification(title, {
      body,
      icon:    notif.icon,
      badge:   notif.badge,
      tag:     notif.tag,
      silent:  false,           // ← son système activé
      vibrate: [200, 100, 200, 100, 400], // pattern de vibration unique
      renotify: true,
      requireInteraction: false,
      actions: notif.actions,
      data:    notif.data,
      timestamp: Date.now(),
      // Image de fond (Chrome desktop uniquement)
      image: undefined
    });

    // Envoyer le son aux clients ouverts
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'PLAY_NOTIF_SOUND' });
    }

  } catch(err) {
    console.error('[X-ZONE SW] Erreur notification:', err);
  }
}

// ─── MESSAGES DU CLIENT ─────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'PING') {
    e.source.postMessage({ type: 'PONG' });
  }
  if (e.data?.type === 'FORCE_NOTIF') {
    // Permet de tester depuis la console : navigator.serviceWorker.controller.postMessage({type:'FORCE_NOTIF'})
    fireScheduledNotification();
  }
  if (e.data?.type === 'NAVIGATE') {
    // handled in notificationclick
  }
});

// ─── PUSH EXTERNE (FCM / serveur) ───────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload = {};
  try { payload = e.data.json(); } catch { payload = { title: 'X-ZONE', body: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(payload.title || 'X-ZONE', {
      body:    payload.body || '',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/badge-72.png',
      tag:     payload.tag || 'push',
      vibrate: [200, 100, 200],
      data:    payload.data || {}
    })
  );
});
