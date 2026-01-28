
const CACHE_NAME = "mishi-v3.3.21";
const ASSETS = [
  "./images/logo.webp",
  "./images/dribbble_1.gif",
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap"
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
      fetch(e.request.url, { cache: 'reload' }) 
        .catch(() => {
          return new Response(
            `<!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Sin Conexión - Mishi Studio</title>
              <style>
                body {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #fff;
                  font-family: 'Montserrat', sans-serif;
                  text-align: center;
                  color: #2d3436;
                }
                img {
                  max-width: 100%;
                  height: auto;
                  max-height: 400px;
                }
                h3 { font-size: 2rem; margin: 20px 0 10px; }
                p { font-size: 1.2rem; color: #636e72; margin-bottom: 30px; }
                button {
                  padding: 12px 30px;
                  background: #39ac31;
                  color: white;
                  border: none;
                  border-radius: 5px;
                  font-size: 1rem;
                  cursor: pointer;
                  font-weight: bold;
                  box-shadow: 0 5px 15px rgba(57, 172, 49, 0.4);
                }
              </style>
            </head>
            <body>
              <img src="./images/dribbble_1.gif" alt="Cavernícola">
              <h3>¡Sin Conexión!</h3>
              <p>El cavernícola mordió el cable de internet.</p>
              <button onclick="window.location.reload()">Reintentar</button>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  if (url.pathname.endsWith('data.js') || url.pathname.endsWith('style.css') || url.pathname.endsWith('app.js')) {
    e.respondWith(
      // Intentamos recargar, pero si falla (offline), usamos el caché
      fetch(e.request.url, { cache: 'reload' }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Estrategia Network First para la API (Google Sheets)
  // Esto obliga a la app a buscar datos nuevos en internet primero.
  if (url.hostname.includes('opensheet.elk.sh')) {
    // TRUCO: Creamos una nueva petición forzando 'reload' para saltar el caché interno del navegador móvil
    const networkRequest = new Request(e.request, { cache: 'reload' });

    e.respondWith(
      fetch(networkRequest).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // OPTIMIZACIÓN: Guardamos en caché usando la URL "limpia" (sin el ?t=...)
          // Así evitamos llenar la memoria con múltiples copias del mismo archivo.
          const cleanUrl = new URL(e.request.url);
          cleanUrl.search = ''; 
          cache.put(cleanUrl.toString(), networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Si falla internet, buscamos la versión limpia en el caché
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