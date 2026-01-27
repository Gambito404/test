const CACHE_NAME = "mishi-v3.0.1"; // Actualizamos versión para incluir el GIF
const ASSETS = [
  "./images/logo.webp", // Solo cacheamos el logo para la pantalla de error
  "./images/dribbble_1.gif", // Cacheamos el GIF del cavernícola
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
                  background: #fff;
                  color: #2d3436;
                  font-family: 'Montserrat', sans-serif;
                  margin: 0;
                  padding: 0;
                  overflow-x: hidden;
                }
                .page_404 {
                  padding: 40px 0;
                  background: #fff;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  text-align: center;
                }
                .four_zero_four_bg {
                  background-image: url('./images/dribbble_1.gif');
                  height: 400px;
                  width: 100%;
                  max-width: 800px;
                  background-position: center;
                  background-repeat: no-repeat;
                }
                .four_zero_four_bg h1 {
                  font-size: 80px;
                  margin: 0;
                }
                .contant_box_404 { margin-top: -50px; }
                .h2 { font-size: 2rem; margin: 10px 0; }
                p { color: #636e72; font-size: 1.1rem; }
                .link_404 {
                  color: #fff !important;
                  padding: 12px 30px;
                  background: #39ac31;
                  margin: 20px 0;
                  display: inline-block;
                  text-decoration: none;
                  border: none;
                  border-radius: 5px;
                  font-size: 1rem;
                  cursor: pointer;
                  font-weight: bold;
                  box-shadow: 0 5px 15px rgba(57, 172, 49, 0.4);
                  transition: background 0.3s;
                }
                .link_404:hover { background: #2d8a26; }
                
                /* Botón Decorativo SVG */
                .btn--tl { position: absolute; top: 20px; left: 20px; width: 60px; height: 60px; background: none; border: none; cursor: pointer; }
                .logo-svg { width: 100%; height: 100%; fill: #1a365d; }
              </style>
            </head>
            <body>
              <section class="page_404">
                <div class="four_zero_four_bg">
                  <h1>!!!</h1>
                </div>
                <div class="contant_box_404">
                  <h3 class="h2">¡Sin Conexión!</h3>
                  <p>Parece que te perdiste en la edad de piedra digital.<br>El cavernícola mordió el cable de internet.</p>
                  <button onclick="window.location.reload()" class="link_404">Reintentar Conexión</button>
                </div>
              </section>
              
              <!-- Logo Decorativo -->
              <div class="btn--tl">
                 <svg class="logo-svg" viewBox="0 0 70 70">
                   <path d="M5.35 58.00Q2 57.50 1 54.92Q0 52.35 1.40 48.40L8 29.65Q8.90 27.05 10.07 25.20Q11.25 23.35 13.03 22.35Q14.80 21.35 17.45 21.35Q21.45 21.35 23.48 23.55Q25.50 25.75 26.85 29.65L33.40 48.40Q34.80 52.35 33.93 54.92Q33.05 57.50 29.65 58.00Q26.90 58.35 24.88 57.35Q22.85 56.35 22.45 54.10Q22.15 52.60 22.38 51.60Q22.60 50.60 22.80 50.00Q22.95 49.50 22.82 49.02Q22.70 48.55 22.05 48.55L12.75 48.55Q12.10 48.55 11.97 49.02Q11.85 49.50 12.05 50.00Q12.25 50.60 12.45 51.60Q12.65 52.60 12.40 54.10Q12 56.35 10.05 57.35Q8.10 58.35 5.35 58.00M21.10 41.55L18.50 33.40Q18.40 32.90 18.18 32.62Q17.95 32.35 17.45 32.35Q16.95 32.35 16.73 32.62Q16.50 32.90 16.35 33.40L13.80 41.55L21.10 41.55ZM49.45 58.30Q45.45 58.30 42.50 55.97Q39.55 53.65 37.95 49.57Q36.35 45.50 36.35 40.35Q36.35 35.55 37.78 31.92Q39.20 28.30 41.68 25.87Q44.15 23.45 47.43 22.22Q50.70 21.00 54.35 21.00Q61.05 21.00 64.28 22.87Q67.50 24.75 67.50 27.70Q67.50 30.00 66.33 31.75Q65.15 33.50 62.80 33.50Q61.20 33.50 59.78 33.20Q58.35 32.90 56.88 32.62Q55.40 32.35 53.60 32.35Q49.65 32.35 47.93 34.60Q46.20 36.85 46.20 40.25Q46.20 43.00 47.33 44.75Q48.45 46.50 50.33 47.32Q52.20 48.15 54.50 48.15Q56.40 48.15 58.05 47.30Q59.70 46.45 60.15 44.15L57.70 44.15Q55.95 44.15 55.00 43.07Q54.05 42.00 54.05 40.30Q54.05 38.60 55.00 37.55Q55.95 36.50 57.70 36.50L63.70 36.50Q66.95 36.50 68.28 38.22Q69.60 39.95 69.60 43.35L69.60 52.70Q69.60 55.30 68.20 56.65Q66.80 58.00 64.50 58.00Q62.05 58.00 60.65 56.65Q59.25 55.30 59.25 52.70L59.25 49.60L58.35 49.60Q58.35 54.15 56.05 56.22Q53.75 58.30 49.90 58.30L49.45 58.30Z"/>
                 </svg>
              </div>
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