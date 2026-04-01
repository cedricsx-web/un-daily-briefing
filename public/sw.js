const CACHE = "un-briefing-v1";
const ASSETS = ["/un-daily-briefing/", "/un-daily-briefing/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy: always fetch fresh, fall back to cache
self.addEventListener("fetch", e => {
  if (!e.request.url.startsWith("http")) return;

  // For API calls (Anthropic), always go network only
  if (e.request.url.includes("anthropic.com")) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
