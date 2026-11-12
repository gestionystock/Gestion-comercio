
"use strict";

const CACHE_NAME = "mi-comercio-v4";
const CACHE_PREFIX = "mi-comercio-";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key =>
              key.startsWith(CACHE_PREFIX) &&
              key !== CACHE_NAME
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const indexURL = new URL(
    "./index.html",
    self.registration.scope
  ).href;

  /* NAVEGACIÓN: PRIMERO INTERNET, LUEGO CACHÉ */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copia = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(indexURL, copia))
              .catch(error => console.warn(
                "No se pudo actualizar la caché:",
                error
              ));
          }

          return response;
        })
        .catch(async () => {
          const guardado = await caches.match(indexURL);

          return guardado || new Response(
            "Mi Comercio Integral no está disponible sin conexión. Abrí la aplicación nuevamente cuando haya conexión.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        })
    );

    return;
  }

  /* RECURSOS: CACHÉ PRIMERO, RED COMO ALTERNATIVA */

  event.respondWith(
    (async () => {
      const guardado = await caches.match(request);

      if (guardado) return guardado;

      try {
        const response = await fetch(request);

        if (response.ok) {
          const copia = response.clone();

          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, copia);
        }

        return response;

      } catch (error) {
        return new Response("Recurso no disponible sin conexión.", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      }
    })()
  );
});
