const CACHE_NAME = 'cineverse-v1';
const PRECACHE = ['/','/index.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (!res || res.status !== 200 || res.type !== 'basic') return res; const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, clone)); return res; }))); });
// Offline poster cache extension — stores TMDB images for watchlist
const POSTER_CACHE = 'cineverse-posters-v1';
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('image.tmdb.org')) {
    e.respondWith(
      caches.open(POSTER_CACHE).then(cache =>
        cache.match(e.request).then(response =>
          response || fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res; })
        )
      )
    );
  }
});
