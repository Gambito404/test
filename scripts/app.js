document.addEventListener("DOMContentLoaded", () => {
  // Inyectar librería de Partículas
  const loadParticles = () => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
    script.onload = () => {
      const particlesDiv = document.createElement("div");
      particlesDiv.id = "particles-js";
      document.body.prepend(particlesDiv);

      particlesJS("particles-js", {
        particles: {
          number: { value: 60, density: { enable: true, value_area: 800 } },
          color: { value: "#ffffff" },
          shape: { type: "circle" },
          opacity: { value: 0.3, random: true },
          size: { value: 3, random: true },
          line_linked: {
            enable: true,
            distance: 150,
            color: "#ffffff",
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            speed: 2,
            direction: "none",
            random: false,
            out_mode: "out",
          },
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: { enable: true, mode: "grab" },
            onclick: { enable: true, mode: "push" },
          },
          modes: {
            grab: { distance: 140, line_linked: { opacity: 0.6 } },
          },
        },
        retina_detect: true,
      });
    };
    document.body.appendChild(script);
  };

  if (document.readyState === "complete") {
    setTimeout(loadParticles, 1500);
  } else {
    window.addEventListener("load", () => setTimeout(loadParticles, 1500));
  }

  // Inyectar HTML de Componentes
  const componentsHtml = `
    <!-- LIGHTBOX -->
    <div class="lightbox-overlay" id="lightbox">
      <div class="lightbox-content">
        <button class="lightbox-close">&times;</button>
        <button class="lightbox-btn prev">❮</button>
        <img src="" class="lightbox-img" id="lightboxImg" alt="Vista previa" width="600" height="600">
        <button class="lightbox-btn next">❯</button>
      </div>
    </div>

    <!-- CARRITO FAB -->
    <button class="cart-fab hidden" id="cartFab">
      🛒
      <div class="cart-badge" id="cartCount">0</div>
    </button>

    <!-- MODAL CARRITO -->
    <div class="modal-overlay" id="cartModal">
      <div class="modal-content">
        <button class="modal-close" id="closeCart">&times;</button>
        <h3 class="modal-title">Tu Carrito 🛒</h3>
        <div class="cart-items-container" id="cartItems">
          <!-- Items del carrito -->
        </div>
        <div class="cart-total" id="cartTotal">Total: 0 Bs</div>
        <button class="btn-whatsapp" id="checkoutBtn">
          Finalizar Pedido en WhatsApp <span>➤</span>
        </button>
      </div>
    </div>

    <!-- MODAL COTIZACIÓN (Modificado) -->
    <div class="modal-overlay" id="quoteModal">
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        <h3 class="modal-title" id="modalTitle">Cotizar Producto</h3>
        
        <div id="modalOptions"></div>
        
        <label class="modal-option" for="opt-custom">
          <input type="radio" name="priceOption" id="opt-custom" value="custom">
          <span>Otra cantidad (Cotización especial)</span>
        </label>
        <input type="number" id="customQty" class="custom-qty-input" placeholder="Ingresa la cantidad deseada (ej. 500)">
        
        <div class="modal-actions">
          <button class="btn-whatsapp" id="addToCartBtn">Agregar al Carrito 🛒</button>
        </div>
      </div>
    </div>

    <!-- MODAL DETALLE ITEM CARRITO -->
    <div class="modal-overlay" id="itemDetailModal">
      <div class="modal-content" style="text-align: center;">
        <button class="modal-close" id="closeDetail">&times;</button>
        <h3 class="modal-title" id="detailTitle"></h3>
        <img src="" id="detailImage" style="max-width: 100%; border-radius: 10px; margin-bottom: 15px; object-fit: cover; max-height: 300px;" alt="Detalle del producto" width="300" height="300">
        <p id="detailDesc" style="color: #666; margin-bottom: 10px;"></p>
        <p id="detailOption" style="font-weight: bold; color: var(--primary);"></p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", componentsHtml);

  /* ===== LÓGICA DEL CARRITO ===== */
  let cart = JSON.parse(localStorage.getItem("mishiCart")) || [];

  const cartFab = document.getElementById("cartFab");
  const cartCount = document.getElementById("cartCount");
  const cartModal = document.getElementById("cartModal");
  const cartItemsContainer = document.getElementById("cartItems");
  const closeCartBtn = document.getElementById("closeCart");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const saveCart = () => {
    localStorage.setItem("mishiCart", JSON.stringify(cart));
    updateCartUI();
  };

  const updateCartUI = () => {
    cartCount.textContent = cart.length;
    if (cart.length > 0) {
      cartFab.classList.remove("hidden");
    } else {
      cartFab.classList.add("hidden");
      cartModal.classList.remove("active");
    }
  };

  updateCartUI();

  const showItemDetail = (item) => {
    const detailModal = document.getElementById("itemDetailModal");
    const closeDetail = document.getElementById("closeDetail");

    document.getElementById("detailTitle").textContent = item.name;
    document.getElementById("detailImage").src = item.image;
    document.getElementById("detailImage").alt = item.name;
    document.getElementById("detailDesc").textContent = item.fullDesc;
    document.getElementById("detailOption").textContent =
      `Opción: ${item.desc}`;

    detailModal.classList.add("active");

    const close = () => detailModal.classList.remove("active");
    closeDetail.onclick = close;
    detailModal.onclick = (e) => {
      if (e.target === detailModal) close();
    };
  };

  const renderCart = () => {
    cartItemsContainer.innerHTML = "";
    let total = 0;
    let hasCustom = false;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML =
        '<p style="text-align:center; color:#888;">El carrito está vacío</p>';
      document.getElementById("cartTotal").innerHTML = "Total: 0 Bs";
      return;
    }

    cart.forEach((item, index) => {
      total += item.price || 0;
      if (!item.price) hasCustom = true;

      const div = document.createElement("div");
      div.className = "cart-item";
      div.onclick = (e) => {
        if (!e.target.classList.contains("cart-remove")) showItemDetail(item);
      };

      let priceDisplay = "";
      if (item.price > 0) {
        if (item.saving > 0) {
          priceDisplay = `
             <div class="cart-price-details">
               <span class="old-price">${item.originalPrice} Bs</span>
               <span class="new-price">${item.price} Bs</span>
             </div>
           `;
        } else {
          priceDisplay = `<div class="cart-price-details"><span class="new-price">${item.price} Bs</span></div>`;
        }
      }

      div.innerHTML = `
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>${item.desc}</p>
          ${priceDisplay}
        </div>
        <button class="cart-remove" data-index="${index}">🗑️</button>
      `;
      cartItemsContainer.appendChild(div);
    });

    let totalText = "";
    if (total === 0 && hasCustom) {
      totalText = "Por Cotizar";
    } else {
      totalText = `${total} Bs${hasCustom ? " + Cotización" : ""}`;
    }
    document.getElementById("cartTotal").innerHTML =
      `Total: <strong>${totalText}</strong>`;

    document.querySelectorAll(".cart-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.dataset.index);
        cart.splice(idx, 1);
        saveCart(); // Guardar cambios
        renderCart();
      });
    });
  };

  cartFab.addEventListener("click", () => {
    renderCart();
    cartModal.classList.add("active");
  });

  closeCartBtn.addEventListener("click", () =>
    cartModal.classList.remove("active"),
  );

  checkoutBtn.addEventListener("click", () => {
    if (cart.length === 0) return;

    let total = 0;
    let hasCustom = false;
    let message =
      "Hola Mishi Studio 🐱, quiero realizar el siguiente pedido:\n\n";

    cart.forEach((item, i) => {
      message += `- ${i + 1}. ${item.name} \n   Detalle: ${item.desc}\n`;
      total += item.price || 0;
      if (!item.price) hasCustom = true;
    });

    let totalText = "";
    if (total === 0 && hasCustom) {
      totalText = "Por Cotizar";
    } else {
      totalText = `${total} Bs${hasCustom ? " + Cotización" : ""}`;
    }
    message += `\nTotal Estimado: ${totalText}`;
    message += "\nEspero su confirmación. ¡Gracias!";

    const url = `https://wa.me/59176904748?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    cart = []; // Limpiar carrito tras enviar
    saveCart(); // Guardar carrito vacío
  });

  /* ===== LÓGICA LIGHTBOX ===== */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lbClose = lightbox.querySelector(".lightbox-close");
  const lbPrev = lightbox.querySelector(".prev");
  const lbNext = lightbox.querySelector(".next");
  let lbImages = [];
  let lbIndex = 0;

  const openLightbox = (images, index) => {
    lbImages = images;
    lbIndex = index;
    updateLightboxImage();
    lightbox.classList.add("active");
  };

  const updateLightboxImage = () => {
    lightboxImg.src = lbImages[lbIndex];
    lightboxImg.alt = "Imagen ampliada " + (lbIndex + 1);
    lbPrev.style.display = lbImages.length > 1 ? "block" : "none";
    lbNext.style.display = lbImages.length > 1 ? "block" : "none";
  };

  lbClose.addEventListener("click", () => lightbox.classList.remove("active"));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.classList.remove("active");
  });

  lbPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length;
    updateLightboxImage();
  });

  lbNext.addEventListener("click", (e) => {
    e.stopPropagation();
    lbIndex = (lbIndex + 1) % lbImages.length;
    updateLightboxImage();
  });

  const modal = document.getElementById("quoteModal");
  const closeBtn = modal.querySelector(".modal-close");
  const addToCartBtn = document.getElementById("addToCartBtn");
  const customRadio = document.getElementById("opt-custom");
  const customInput = document.getElementById("customQty");
  const optionsContainer = document.getElementById("modalOptions");
  let currentProduct = null;

  const closeModal = () => {
    modal.classList.remove("active");
    customInput.style.display = "none";
    customInput.value = "";
  };

  const openModal = (product) => {
    currentProduct = product;
    document.getElementById("modalTitle").textContent =
      `Cotizar: ${product.name}`;
    optionsContainer.innerHTML = "";

    if (product.prices) {
      const unitPriceObj = product.prices.find((p) => p.quantity === 1);
      const unitPrice = unitPriceObj ? unitPriceObj.price : 0;

      product.prices.forEach((p, index) => {
        const id = `opt-${index}`;
        let savingHtml = "";

        if (unitPrice > 0 && p.quantity > 1) {
          const expectedPrice = unitPrice * p.quantity;
          const saving = expectedPrice - p.price;
          if (saving > 0) {
            savingHtml = `<span class="saving-tag" style="margin-left: 10px;">Ahorra ${parseFloat(saving.toFixed(2))} Bs</span>`;
          }
        }

        const html = `
          <label class="modal-option" for="${id}">
            <input type="radio" name="priceOption" id="${id}" value="${index}">
            <span>
              <strong>${p.quantity} ${p.quantity === 1 ? "Unidad" : "Unidades"}</strong> - ${p.price} Bs
            </span>
            ${savingHtml}
          </label>
        `;
        optionsContainer.insertAdjacentHTML("beforeend", html);
      });
    }

    const firstOpt = optionsContainer.querySelector("input");
    if (firstOpt) firstOpt.checked = true;

    modal.classList.add("active");
  };

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  optionsContainer.addEventListener("change", () => {
    customInput.style.display = "none";
  });
  customRadio.addEventListener("change", () => {
    customInput.style.display = "block";
    customInput.focus();
  });

  const getSelectedOption = () => {
    if (!currentProduct) return;
    const selected = document.querySelector(
      'input[name="priceOption"]:checked',
    );
    if (!selected) return null;

    let result = { text: "", price: 0 };

    if (selected.value === "custom") {
      const qty = customInput.value;
      if (!qty) {
        alert("Por favor ingresa una cantidad");
        return null;
      }
      result.text = `Cotización especial: ${qty} unidades`;
      result.price = 0;
    } else {
      const priceData = currentProduct.prices[selected.value];
      result.text = `${priceData.quantity} ${priceData.quantity === 1 ? "Unidad" : "Unidades"} (${priceData.price} Bs)`;
      result.price = priceData.price;
    }
    return result;
  };

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `✅ ${message}`;
    document.body.appendChild(toast);

    // Forzar reflow para la animación
    toast.offsetHeight; 
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  };

  addToCartBtn.addEventListener("click", () => {
    const option = getSelectedOption();
    if (!option) return;

    const images =
      currentProduct.images ||
      (currentProduct.image ? [currentProduct.image] : []);

    let originalPrice = 0;
    let saving = 0;

    if (option.price > 0 && currentProduct.prices) {
      const selectedIdx = document.querySelector(
        'input[name="priceOption"]:checked',
      ).value;
      const priceData = currentProduct.prices[selectedIdx];
      const unitPriceObj = currentProduct.prices.find((p) => p.quantity === 1);

      if (unitPriceObj && priceData.quantity > 1) {
        originalPrice = unitPriceObj.price * priceData.quantity;
        saving = originalPrice - priceData.price;
      }
    }

    cart.push({
      name: currentProduct.name,
      desc: option.text,
      price: option.price,
      image: images[0] || "",
      fullDesc: currentProduct.description,
      originalPrice: originalPrice,
      saving: saving,
    });

    saveCart();
    closeModal();

    cartFab.style.transform = "scale(1.3)";
    setTimeout(() => (cartFab.style.transform = "scale(1)"), 200);
    showToast(`¡${currentProduct.name} agregado al carrito!`);
  });

  // Actualizar Nombre de Marca
  const brand = document.querySelector(".nav-brand");
  if (brand) {
    brand.innerHTML = `
      <img src="images/logo.webp" class="brand-logo" alt="Mishi Logo" width="60" height="60">
      <span>MISHI STUDIO</span>
    `;
  }

  const container = document.getElementById("catalog");
  const navLinks = document.getElementById("nav-links");

  if (!container || !navLinks) return;

  /* ===== LÓGICA DEL MENÚ MÓVIL ===== */
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "menu-toggle";
    toggleBtn.innerHTML = "☰";
    toggleBtn.ariaLabel = "Abrir menú";

    toggleBtn.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      toggleBtn.innerHTML = navLinks.classList.contains("active") ? "✕" : "☰";
    });

    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 50);
    });

    navbar.insertBefore(toggleBtn, navLinks);
  }

  let globalImageCounter = 0;

  catalog.forEach((section) => {
    /* ===== NAVBAR ===== */
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${section.id}`;
    link.textContent = section.title;

    link.addEventListener("click", () => {
      navLinks.classList.remove("active");
      const toggleBtn = document.querySelector(".menu-toggle");
      if (toggleBtn) toggleBtn.innerHTML = "☰";
    });

    li.appendChild(link);
    navLinks.appendChild(li);

    /* ===== SECCIÓN ===== */
    const sectionEl = document.createElement("section");
    sectionEl.className = "catalog-section";
    sectionEl.id = section.id;

    sectionEl.innerHTML = `
      <header class="section-header fade-in-up">
        <h2>${section.title}</h2>
        <p>${section.subtitle}</p>
      </header>
      <div class="products-grid"></div>
    `;

    const grid = sectionEl.querySelector(".products-grid");

    section.items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "product-card fade-in-up";

      const images = item.images || (item.image ? [item.image] : []);
      const mainImage = images.length > 0 ? images[0] : "";

      const controlsHtml =
        images.length > 1
          ? `
        <button class="img-btn prev">❮</button>
        <button class="img-btn next">❯</button>`
          : "";

      const imageBadge =
        images.length > 1
          ? `<div class="image-badge">1 / ${images.length}</div>`
          : "";

      const isLCP = globalImageCounter < 4;
      const loadingAttr = isLCP ? 'loading="eager"' : 'loading="lazy"';
      const priorityAttr = isLCP ? 'fetchpriority="high"' : '';
      globalImageCounter++;

      const pricesList = item.prices || [];

      const pricesHtml =
        pricesList.length > 0
          ? `
        <table class="price-table">
          <thead>
            <tr>
              <th>Cant.</th>
              <th>P. Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${pricesList
              .map((p) => {
                const unitVal = parseFloat((p.price / p.quantity).toFixed(2));
                return `
              <tr>
                <td>${p.quantity}</td>
                <td>${unitVal} Bs</td>
                <td>${p.price} Bs</td>
              </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      `
          : "";

      card.innerHTML = `
        <div class="card-image-container">
          <img src="${mainImage}" class="card-image" alt="${item.name}" width="280" height="220" ${loadingAttr} ${priorityAttr} decoding="async">
          ${controlsHtml}
          ${imageBadge}
        </div>
        <div class="card-body">
          <h3>${item.name}</h3>
          <p>${item.description}</p>

          <div class="pricing-container">
            ${pricesHtml}
          </div>
          <button class="btn-contact">Cotizar</button>
        </div>
      `;

      const contactBtn = card.querySelector(".btn-contact");
      contactBtn.addEventListener("click", () => openModal(item));

      let currentIndex = 0;

      if (images.length > 1) {
        const imgEl = card.querySelector("img.card-image");
        const badgeEl = card.querySelector(".image-badge");
        const prevBtn = card.querySelector(".prev");
        const nextBtn = card.querySelector(".next");

        const updateView = () => {
          imgEl.src = images[currentIndex];
          badgeEl.textContent = `${currentIndex + 1} / ${images.length}`;
        };

        prevBtn.addEventListener("click", () => {
          currentIndex = (currentIndex - 1 + images.length) % images.length;
          updateView();
        });

        nextBtn.addEventListener("click", () => {
          currentIndex = (currentIndex + 1) % images.length;
          updateView();
        });
      }

      const imgContainer = card.querySelector(".card-image");
      imgContainer.addEventListener("click", () => {
        openLightbox(images, currentIndex);
      });

      grid.appendChild(card);
    });

    container.appendChild(sectionEl);
  });

  /* ===== BOTÓN DE INSTALACIÓN PWA ===== */
  let deferredPrompt;
  const installLi = document.createElement("li");
  const installBtn = document.createElement("a");
  installBtn.href = "#";
  installBtn.innerHTML = "📲 INSTALAR APP";
  installBtn.style.color = "#4cd137"; // Verde brillante para destacar
  installBtn.style.fontWeight = "800";
  installLi.style.display = "none";
  installLi.appendChild(installBtn);
  navLinks.appendChild(installLi);

  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    installLi.style.display = "none";
  }

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installLi.style.display = "block";
    console.log("✅ PWA lista para instalar");
  });

  installBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        installLi.style.display = "none";
        deferredPrompt = null; 
      });
    } else if (isIos) {
      alert("Para instalar en iPhone/iPad:\n1. Toca el botón 'Compartir' (cuadrado con flecha hacia arriba) en la barra inferior.\n2. Busca y selecciona la opción 'Agregar al inicio'.");
    } else {
      alert("⚠️ Error de PWA detectado:\nTu imagen 'logo.webp' no tiene el tamaño correcto.\n\nSolución:\nUsa una imagen cuadrada exacta (ej. 512x512) o el navegador bloqueará la instalación.");
    }
  });

  window.addEventListener('appinstalled', () => {
    installLi.style.display = "none";
    deferredPrompt = null;
    console.log("✅ App instalada correctamente");
  });

  // Observer para animaciones al hacer scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        
        if (entry.target.classList.contains('product-card')) {
          setTimeout(() => {
            entry.target.classList.remove('fade-in-up', 'is-visible');
            entry.target.classList.add('floating');
          }, 800);
        }
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

  // Scroll Spy: Detectar sección activa
  const sections = document.querySelectorAll("section.catalog-section");
  const navItems = document.querySelectorAll(".nav-links a");

  const spyOptions = {
    root: null,
    rootMargin: "-30% 0px -70% 0px",
    threshold: 0
  };

  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute("id");
        navItems.forEach((link) => link.classList.remove("active"));
        const activeLink = document.querySelector(`.nav-links a[href="#${id}"]`);
        if (activeLink) activeLink.classList.add("active");
      }
    });
  }, spyOptions);

  sections.forEach((section) => spyObserver.observe(section));
});
