const CACHE_NAME = "mishi-v1.0.1";
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
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
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
  // Estrategia: Network Only (Solo red). Si falla, mensaje de error personalizado.
  e.respondWith(
    fetch(e.request).catch(() => {
      // Si falla la conexión y es una navegación (el usuario intenta entrar a la página)
      if (e.request.mode === 'navigate') {
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
                font-family: sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                text-align: center;
                padding: 20px;
              }
              h1 { color: rgb(238, 159, 196); margin-bottom: 15px; }
              p { color: #ccc; margin-bottom: 30px; line-height: 1.6; max-width: 400px; }
              button {
                background: rgb(146, 97, 131);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 30px;
                font-size: 1rem;
                cursor: pointer;
                font-weight: bold;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
              }
            </style>
          </head>
          <body>
            <h1>⚠️ Sin Conexión</h1>
            <p>No pudimos conectar con el servidor.<br>Esta aplicación necesita internet para mostrarte el catálogo actualizado.</p>
            <button onclick="window.location.reload()">🔄 Reintentar</button>
          </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      // Para otros recursos (imágenes, css), devolvemos error si no hay red
      return new Response("Sin conexión", { status: 503, statusText: "Service Unavailable" });
    })
  );
});