const CACHE_NAME = "mishi-v3.0.0"; // Versión mayor para aplicar el cambio estricto
const ASSETS = [
  "./images/logo.webp", // Solo cacheamos el logo para la pantalla de error
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

  // 1. NAVEGACIÓN (HTML): Network Only -> Pantalla de Error "Cavernícola"
  // Si no hay internet, mostramos el HTML de error en lugar de la app cacheada.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request.url, { cache: 'reload' }) // Forzar red ignorando caché HTTP del navegador
        .catch(() => {
          // AQUÍ ESTÁ EL CÓDIGO "CAVERNÍCOLA" (PANTALLA DE ERROR OFFLINE)
          return new Response(
            `<!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Sin Conexión - Mishi Studio</title>
              <style>
                body {
                  background: #0f0c29;
                  color: #fff;
                  font-family: 'Montserrat', sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  text-align: center;
                  padding: 20px;
                }
                h1 { color: rgb(238, 159, 196); margin-bottom: 15px; font-size: 2rem; }
                p { color: #ccc; margin-bottom: 30px; line-height: 1.6; max-width: 400px; }
                .btn {
                  background: rgb(146, 97, 131);
                  color: white;
                  border: none;
                  padding: 12px 30px;
                  border-radius: 30px;
                  font-size: 1rem;
                  cursor: pointer;
                  font-weight: bold;
                  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                  text-decoration: none;
                }
                .btn:hover { background: rgb(238, 159, 196); }
                .logo { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 20px; object-fit: cover; border: 2px solid rgb(238, 159, 196); }
              </style>
            </head>
            <body>
              <img src="./images/logo.webp" class="logo" alt="Mishi Logo">
              <h1>⚠️ ¡Ups! Sin Internet</h1>
              <p>Parece que estás en la edad de piedra digital (sin conexión).<br>Conéctate a internet para ver nuestro catálogo actualizado.</p>
              <button class="btn" onclick="window.location.reload()">🔄 Reintentar Conexión</button>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. ARCHIVOS CRÍTICOS (JS, CSS, DATA): Network Only
  // Si fallan, no devolvemos caché para evitar inconsistencias.
  if (url.pathname.endsWith('data.js') || url.pathname.endsWith('style.css') || url.pathname.endsWith('app.js')) {
    e.respondWith(
      fetch(e.request.url, { cache: 'reload' })
    );
    return;
  }

  // 3. IMÁGENES Y OTROS RECURSOS: Cache First
  // Para que las imágenes carguen rápido si ya se vieron, pero el contenido principal exige red.
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