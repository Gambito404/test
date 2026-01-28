# 🐱 Mishi Studio - Catálogo Digital PWA

Catálogo interactivo y progresivo (PWA) para productos personalizados: pins, stickers, llaveros y más. Gestionado 100% desde Google Sheets.

## ✨ Características Técnicas

- 🛍️ **Catálogo Dinámico** - Sincronizado en tiempo real con Google Sheets.
- 📊 **Gestión Fácil** - Administra productos, precios y fotos desde Excel sin tocar código.
- 🛒 **Carrito de Compras** - Cotización automática y envío de pedidos a WhatsApp.
- ❤️ **Favoritos** - Guarda tus productos preferidos localmente.
- 📱 **Diseño Responsive** - Optimizado para móviles y escritorio.
- ⚡ **PWA Instalable** - Funciona como una app nativa, incluso sin conexión (modo offline básico).
- 🔄 **Auto-Actualización** - Detecta cambios en precios/productos cada 10s y avisa al usuario.
- 🖼️ **Soporte Drive** - Carga imágenes directamente desde enlaces de Google Drive.

## 🚀 Cómo comprar (Para Clientes)

1. Explora el catálogo por categorías.
2. Haz clic en "Cotizar" o agrega al carrito 🛒.
3. Revisa tu pedido y selecciona las cantidades.
4. Haz clic en "Finalizar Pedido" para enviar el detalle automáticamente por WhatsApp.

## 🛠️ Guía de Administración (Para el Dueño)

El catálogo se controla desde una Hoja de Cálculo de Google.

### Estructura del Excel (3 Hojas Obligatorias)

#### 1. Hoja `Productos`
- **Categoria**: ID de la categoría (ej: `pins`).
- **Titulo**: Título visible de la sección.
- **Subtitulo**: Descripción corta de la sección.
- **Id_producto**: ID único del producto (ej: `pin1`).
- **Nombre_Producto**: Nombre del ítem.
- **Descripcion**: Detalles del producto.

#### 2. Hoja `Imagenes`
- **Id_producto**: El mismo ID usado en la hoja Productos.
- **Imagenes**: Enlace de la imagen (Google Drive o URL directa).
  - *Tip:* Deja el ID vacío en filas siguientes para agregar más fotos al mismo producto (Galería).

#### 3. Hoja `Precios`
- **Id_producto**: El mismo ID usado en la hoja Productos.
- **Cantidades**: Cantidad mínima (ej: 1, 12, 50).
- **Precios**: Precio total para esa cantidad.

### 📸 Imágenes desde Google Drive
1. Sube la foto a Drive.
2. Clic derecho > Compartir > **"Cualquier persona con el enlace"**.
3. Copia el enlace y pégalo en la hoja `Imagenes`.

## 📞 Contacto

- **WhatsApp**: +591 77424842
- **Email**: gabrielberriosmendoza@gmail.com

---

Hecho con ❤️ por **Gambito404** | © 2026 Mishi Studio