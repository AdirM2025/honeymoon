const CACHE = "honeymoon-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Network-first for navigation (so updates show), cache-first for other assets, with offline fallback
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put("./index.html", res.clone()));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Cache-first for same-origin assets; pass through (with cache fallback) for fonts/CDN
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (url.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
