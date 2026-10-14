/*
 * Moshi and Pals offline support. Hand-written on purpose (no build plugin): small enough to read.
 * - The page (navigations): network first, so an online launch always gets the newest build;
 *   offline, the last copy we saw.
 * - Everything else from this site (the hashed game bundle, art, icons): cache first, filled as it's used.
 * - version.json: always the network (that's how the game notices an update).
 * Files the page loaded before this worker was running (the first visit) are sent over by the page
 * once it's ready ({ type: 'cache', urls }), so even the very next launch works offline.
 * The page registers this file as sw.js?v=<build>, so every deploy installs a fresh worker with its own
 * cache, and old caches are cleared out once it takes over.
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `moshi-${VERSION}`;
const SHELL = ['./', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('moshi-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'cache' || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((u) => typeof u === 'string' && new URL(u).origin === self.location.origin && !u.includes('version.json'));
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all(urls.map((u) => c.match(u).then((hit) => hit || c.add(u)).catch(() => undefined)))));
});

const keep = (request, response) => {
  if (response && response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // always ask the network

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((r) => keep('./', r))
        .catch(() => caches.match('./', { ignoreSearch: true }).then((r) => r || caches.match(request, { ignoreSearch: true }))),
    );
    return;
  }
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((r) => keep(request, r))));
});
