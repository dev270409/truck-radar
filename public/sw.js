const CACHE_NAME = "logiflow-v1";
const PRECACHE_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const origin = new URL(event.request.url).origin;
      const sameOrigin = origin === self.location.origin;

      if (sameOrigin && event.request.mode === "navigate") {
        try {
          const res = await fetch(event.request);
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, res.clone());
          }
          return res;
        } catch {
          const cached = await caches.match(event.request);
          return cached || Response.error();
        }
      }

      const cached = await caches.match(event.request);
      return cached || fetch(event.request);
    })()
  );
});