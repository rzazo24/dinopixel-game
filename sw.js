// Bump this on every release: it is what makes browsers see a "new version".
const CACHE = 'dinopixel-v28';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'game.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'fonts/press-start-2p.woff2',
];

// Safari (and Chrome) refuse to serve a response whose `redirected` flag is set to a navigation
// ("Response served by service worker has redirections"). Re-wrap such responses so they are plain.
async function clean(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', (e) => {
  // No skipWaiting here: the page asks the user first (see SKIP_WAITING below).
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map(async (url) => {
        const res = await fetch(url, { cache: 'reload' });   // bypass the HTTP cache so we store fresh files
        if (!res.ok) throw new Error(url + ' -> ' + res.status);
        await cache.put(url, await clean(res));
      }))
    )
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first (files are versioned through CACHE), network as fallback.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/_vercel/') || url.pathname.startsWith('/api/')) return; // analytics + ranking API: never cache
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // the start URL may be "/", "/index.html" or have a query string: all map to the cached page
    let hit = await cache.match(req, { ignoreSearch: true });
    if (!hit && req.mode === 'navigate') hit = await cache.match('./');
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && url.origin === location.origin) cache.put(req, (await clean(res)).clone());
      return res;
    } catch {
      return req.mode === 'navigate' ? (await cache.match('./')) || Response.error() : Response.error();
    }
  })());
});
