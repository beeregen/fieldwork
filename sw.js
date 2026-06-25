// Forager service worker — gives the app real, persistent offline support.
// Forager is a single, self-contained index.html (no external CDN dependencies),
// so we cache the app shell and serve it when there is no network.
// Strategy: network-first for same-origin GETs (so every online load refreshes the
// cache and the app self-heals), falling back to the cached app when offline.
// Cross-origin calls (Microsoft sign-in, OneDrive/Graph upload, Tempest weather) and
// non-GET requests are left to the network — they are online-only by nature.

const CACHE = 'forager-shell-v1';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                  // uploads / API writes -> network only
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Microsoft / Tempest / etc. -> network only
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
