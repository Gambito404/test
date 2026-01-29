
const CACHE_NAME = "mishi-v3.4.5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./scripts/app.js",
  "./styles/style.css",
  "./images/logo.webp",
  "./images/icon.webp",
  "./images/cavernicola.gif",
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


  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  if (url.pathname.endsWith('data.js') || url.pathname.endsWith('style.css') || url.pathname.endsWith('app.js')) {
    e.respondWith(
      fetch(e.request.url, { cache: 'reload' }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Estrategia Network-First para los datos de Google Sheets (CSV)
  if (url.hostname.includes('docs.google.com') && url.pathname.includes('/gviz/tq')) {
    const networkRequest = new Request(e.request, { cache: 'reload' });

    e.respondWith(
      fetch(networkRequest).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          const cleanUrl = new URL(e.request.url);
          cleanUrl.search = ''; 
          cache.put(cleanUrl.toString(), networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        const cleanUrl = new URL(e.request.url);
        cleanUrl.search = '';
        return caches.match(cleanUrl.toString());
      })
    );
    return;
  }

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