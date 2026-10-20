/* Service worker : l'app s'ouvre hors ligne, les actus sont toujours redemandées au réseau d'abord. */
const CACHE = 'veille-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // news.json et pages : réseau d'abord, cache en secours
  if (url.pathname.endsWith('news.json') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          const key = url.pathname.endsWith('news.json') ? 'news.json' : e.request;
          caches.open(CACHE).then((c) => c.put(key, copy));
          return res;
        })
        .catch(() => caches.match(url.pathname.endsWith('news.json') ? 'news.json' : e.request)
          .then((r) => r || caches.match('index.html')))
    );
    return;
  }

  // reste de l'app : cache d'abord, mis à jour en arrière-plan
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
