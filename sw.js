
const CACHE_NAME = "mi-comercio-v1";
const ARCHIVOS = ["./", "./index.html"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached ||
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, copia)
            );
          }
          return response;
        })
        .catch(() =>
          event.request.mode === "navigate"
            ? caches.match("./index.html")
            : new Response("Sin conexión", { status: 503 })
        )
    )
  );
});
