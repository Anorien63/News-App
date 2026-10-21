/* Service worker : l'app s'ouvre hors ligne, les actus sont toujours redemandées au réseau d'abord. */
const CACHE = 'veille-v7';
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

  // reste de l'app (HTML, CSS, JS, icônes) : réseau d'abord, pour que chaque nouvelle version
  // s'affiche dès l'ouverture suivante ; la copie locale ne sert que hors connexion.
  // cache: 'no-cache' revalide auprès de GitHub Pages au lieu de réutiliser une copie HTTP de 10 min.
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
