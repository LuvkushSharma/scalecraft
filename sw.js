// Offline support: network first (always fresh), cache as the offline fallback.
// The "Save offline" button fills this same cache with every lesson.
const CACHE = 'ztu-v17';
const CORE = ['./', 'index.html', 'assets/css/style.css?v=17', 'assets/js/curriculum.js?v=17',
  'assets/js/components.js?v=17', 'assets/js/app.js?v=17', 'assets/icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // fonts etc. go to network
  // Network first, so a new version always shows up; the cache is only the offline fallback.
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html')))
  );
});
