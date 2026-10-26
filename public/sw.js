/* Offline shell + immutable assets. Keep one previous build so an open shift survives an update. */
const BASE = new URL('./', self.location.href);
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const PREFIX = `moshi-${encodeURIComponent(BASE.pathname)}-`;
const CACHE = `${PREFIX}${VERSION}`;
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const home = BASE.href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch(new URL('bundle-manifest.json', BASE), { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline bundle manifest is unavailable');
    const manifest = await response.json();
    if (!manifest.files || typeof manifest.files !== 'object') throw new Error('Invalid offline bundle manifest');
    const assets = Object.keys(manifest.files).filter((name) => !['version.json', 'sw.js'].includes(name));
    if (!assets.length || assets.some((name) => name.startsWith('/') || !scoped(name))) throw new Error('Invalid offline asset scope');
    const urls = [...new Set([...SHELL, './bundle-manifest.json', ...assets].map((name) => new URL(name, BASE).href))];
    // Cache the complete build before activation, so a dropped connection cannot install a half-ready shell.
    await (await caches.open(CACHE)).addAll(urls);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const old = (await caches.keys()).filter((key) => key.startsWith(PREFIX) && key !== CACHE);
    await Promise.all(old.slice(0, -1).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
function scoped(value) {
  try {
    const url = new URL(value, BASE);
    return url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname)
      && !url.pathname.endsWith('/version.json') ? url.href : undefined;
  } catch { return undefined; }
}
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'cache' || !Array.isArray(data.urls)) return;
  if (data.version && data.version !== VERSION) return;
  const urls = [...new Set(data.urls.filter((value) => typeof value === 'string').map(scoped).filter(Boolean))];
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(urls.map(async (url) => {
    try { if (!(await cache.match(url))) await cache.add(url); } catch { /* An offline asset stays uncached. */ }
  }))));
});
async function cached(request) {
  return await (await caches.open(CACHE)).match(request) || await caches.match(request);
}
async function keep(request, response) {
  if (response?.ok && response.type === 'basic') {
    try { await (await caches.open(CACHE)).put(request, response.clone()); } catch { /* Quota must not prevent play. */ }
  }
  return response;
}
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !scoped(request.url)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        return response.ok ? await keep(home, response) : await cached(home) || response;
      } catch {
        return await cached(home) || Response.error();
      }
    })());
  } else {
    event.respondWith(cached(request).then((hit) => hit || fetch(request).then((response) => keep(request, response))));
  }
});
