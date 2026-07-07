/**
 * Ayush Medico – Service Worker
 * ──────────────────────────────────────────────────────────────────────────
 * Strategy:
 *   /assets/*          → cache-first  (Vite hashed bundles, safe to cache forever)
 *   /api/*             → network-only (never cache sensitive API data)
 *   navigate requests  → network-first → cached → offline.html
 *   everything else    → stale-while-revalidate
 *
 * Version bump SW_VERSION to force re-install on next deploy.
 */

const SW_VERSION = '1.0.0';
const STATIC_CACHE  = `ayush-medico-static-${SW_VERSION}`;
const RUNTIME_CACHE = `ayush-medico-runtime-${SW_VERSION}`;

/** Files pre-cached at install time so offline.html is always available. */
const PRECACHE = [
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // Activate immediately without waiting for old tabs to close
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Take control of all existing clients immediately
      self.clients.claim(),
      // Delete caches from previous SW versions
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept GET requests from our own origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // /api/* → always go to the network (no caching of pharmacy data)
  if (url.pathname.startsWith('/api/')) return;

  // Vite hashed assets (e.g. /assets/index-abc123.js, /assets/style-xyz.css)
  // These are content-addressed → cache-first is perfectly safe
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // HTML page navigations → network-first with offline.html fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Store a fresh copy of every page we navigate to
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          // Network failed → try cache → fall back to offline page
          caches.match(request).then((cached) =>
            cached ?? caches.match('/offline.html')
          )
        )
    );
    return;
  }

  // Icons, manifest, fonts, images → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── Caching helpers ──────────────────────────────────────────────────────────

/**
 * Cache-First: return cached response; fetch from network only on cache miss.
 * Ideal for versioned (hashed) static assets that never change at the same URL.
 */
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    // Nothing we can do for missing assets without a network
    throw err;
  }
}

/**
 * Stale-While-Revalidate: serve from cache immediately (low latency),
 * then silently refresh the cache entry in the background.
 */
async function staleWhileRevalidate(request) {
  const cache  = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  // Start network fetch in the background regardless
  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached); // If network fails and we have a cache, use it

  // Return cached immediately if available; otherwise wait for network
  return cached ?? networkFetch;
}

// ── Push Notifications (scaffold — ready for future backend integration) ─────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title ?? 'Ayush Medico', {
        body:  data.body  ?? '',
        icon:  '/icon-192.png',
        badge: '/icon-192.png',
        tag:   data.tag   ?? 'ayush-medico',
        data:  { url: data.url ?? '/' },
        actions: data.actions ?? [],
      })
    );
  } catch (err) {
    console.error('[SW] Push parse error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an already-open tab if possible
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) return client.focus();
        }
        // Otherwise open a new tab
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
