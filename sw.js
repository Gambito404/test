const CACHE_NAME = "mishi-v2.0.4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles/style.css",
  "./scripts/app.js",
  "./scripts/data.js",
  "./images/logo.webp",
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap",
  "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // 1. ESTRATEGIA "NETWORK FIRST" (Primero Internet)
  // Para archivos críticos: HTML (navegación) y data.js (precios).
  // Intentamos obtener lo más nuevo. Si falla (offline), usamos lo guardado.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('data.js')) {
    e.respondWith(
      fetch(e.request.url, { cache: 'reload' }) // Forzar red ignorando caché HTTP del navegador
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => caches.match(e.request)) // Fallback al caché
    );
    return;
  }

  // 2. ESTRATEGIA "CACHE FIRST" (Primero Caché)
  // Para imágenes, estilos, scripts estáticos. Ahorra datos y carga rápido.
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(e.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});