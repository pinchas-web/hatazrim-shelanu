// שומר את קבצי המערכת בטלפון, כדי שהיא תיפתח מהר גם עם קליטה חלשה.
// הנתונים עצמם תמיד מגיעים מהענן.
const CACHE = 'tazrim-v1';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'blueprint.js', 'config.js', 'custom.js', 'custom.css', 'icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // קודם הרשת, ואם אין קליטה, מהזיכרון
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
