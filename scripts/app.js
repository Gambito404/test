document.addEventListener("DOMContentLoaded", async () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  const mainContent = document.querySelector('main');
  const footer = document.querySelector('footer');

  /* ===== PWA INSTALL EVENT (Capturar inmediatamente) ===== */
  let deferredPrompt; // Variable global para guardar el evento
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Si el botón ya existe (se creó tarde), lo mostramos ahora
    const installLi = document.getElementById("pwa-install-li");
    if (installLi) installLi.style.display = "block";
  });

  if (mainContent) mainContent.style.opacity = 0;
  if (footer) footer.style.opacity = 0;

  const hideLoader = () => {
    if (!loadingOverlay) return;
    loadingOverlay.style.opacity = 0;
    loadingOverlay.addEventListener('transitionend', () => {
      loadingOverlay.remove();
    }, { once: true });

    if (mainContent) mainContent.style.transition = 'opacity 0.5s ease-in';
    if (footer) footer.style.transition = 'opacity 0.5s ease-in';
    if (mainContent) mainContent.style.opacity = 1;
    if (footer) footer.style.opacity = 1;
  };

  /* ===== FUNCIÓN HELPER: TOAST NOTIFICATION ===== */
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

  /* ===== CARGAR DATOS DE GOOGLE SHEETS ===== */
  let catalog = [];

  const loadCatalogData = async () => {
    const SHEET_ID = "19AIPO8SiAsRgC16cM37sIWKME3VPxefgFyUskJXX5z8";
    const PRODUCTS_SHEET = "Productos";
    const IMAGES_SHEET = "Imagenes";
    const PRICES_SHEET = "Precios";

    try {
      const fetchOptions = { cache: 'reload' };

      const [productsRes, imagesRes, pricesRes] = await Promise.all([
        fetch(`https://opensheet.elk.sh/${SHEET_ID}/${PRODUCTS_SHEET}`, fetchOptions),
        fetch(`https://opensheet.elk.sh/${SHEET_ID}/${IMAGES_SHEET}`, fetchOptions),
        fetch(`https://opensheet.elk.sh/${SHEET_ID}/${PRICES_SHEET}`, fetchOptions)
      ]);

      if (!productsRes.ok || !imagesRes.ok || !pricesRes.ok) {
        throw new Error("Falló la conexión con una o más hojas de Google Sheets.");
      }

      const productsData = await productsRes.json();
      const imagesData = await imagesRes.json();
      const pricesData = await pricesRes.json();

      const imagesMap = new Map();
      let currentImgId = null;

      imagesData.forEach(row => {
        const rawId = row.id_producto || row.Id_producto;
        if (rawId && String(rawId).trim() !== "") {
            currentImgId = String(rawId).trim();
        }

        if (!currentImgId) return;

        if (!imagesMap.has(currentImgId)) {
          imagesMap.set(currentImgId, []);
        }
        
        let imageUrl = row.url_imagen || row.Imagenes || "";
        
        if (imageUrl && String(imageUrl).trim() !== "") {
            imageUrl = String(imageUrl).trim();
            if (imageUrl.includes('drive.google.com') && imageUrl.includes('/file/d/')) {
                try {
                    const driveId = imageUrl.split('/file/d/')[1].split('/')[0];
                    imageUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
                } catch(e) {}
            }
            imagesMap.get(currentImgId).push(imageUrl);
        }
      });

      const pricesMap = new Map();
      let currentPriceId = null;

      pricesData.forEach(row => {
        const rawId = row.id_producto || row.Id_producto;
        if (rawId && String(rawId).trim() !== "") {
            currentPriceId = String(rawId).trim();
        }

        if (!currentPriceId) return;

        if (!pricesMap.has(currentPriceId)) {
          pricesMap.set(currentPriceId, []);
        }
        
        const quantity = parseInt(row.cantidad || row.Cantidad || row.Cantidades);
        const price = parseFloat(row.precio || row.Precio || row.Precios);
        
        if (!isNaN(quantity) && !isNaN(price)) {
            pricesMap.get(currentPriceId).push({ quantity, price });
        }
      });

      const newCatalog = [];
      let currentSection = null;

      productsData.forEach(row => {
        const catId = row.Categoria;
        if (catId && String(catId).trim() !== "") {
          currentSection = {
            id: String(catId).toLowerCase().trim(),
            title: row.Titulo || catId,
            subtitle: row.Subtitulo || "",
            items: []
          };
          newCatalog.push(currentSection);
        }

        const prodName = row.Nombre_Producto;
        const prodId = row.Id_producto;
        if (prodName && prodId && String(prodName).trim() !== "") {
          
          const productImages = imagesMap.get(prodId) || [];
          const productPrices = pricesMap.get(prodId) || [];
          
          productPrices.sort((a, b) => a.quantity - b.quantity);

          const mainImage = productImages.length > 0 ? productImages[0] : "";

          if (currentSection) {
            currentSection.items.push({
              name: prodName,
              description: row.Descripcion || "",
              image: mainImage,
              images: productImages,
              prices: productPrices
            });
          }
        }
      });

      if (newCatalog.length > 0) {
        return newCatalog;
      }
      return [];

    } catch (error) {
      console.error("❌ Error crítico al cargar el catálogo desde Excel. La tienda no mostrará productos.", error);
      return [];
    }
  };

  const initialData = await loadCatalogData();
  if (initialData.length > 0) catalog = initialData;

  const preloadResources = async () => {
    const imageUrls = [];
    if (catalog.length > 0) {
      catalog.forEach(section => {
        section.items.forEach(item => {
          if (item.image) imageUrls.push(item.image);
          if (item.images) imageUrls.push(...item.images);
        });
      });
    }

    const totalResources = imageUrls.length;
    if (totalResources === 0) {
      hideLoader();
      return;
    }

    let loadedCount = 0;
    const progressCircle = document.querySelector('.loader-progress');
    const circumference = progressCircle ? 2 * Math.PI * progressCircle.r.baseVal.value : 0;
    
    if (progressCircle) {
      progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
      progressCircle.style.strokeDashoffset = circumference;
    }

    const updateProgress = () => {
      loadedCount++;
      const progress = loadedCount / totalResources;
      if (progressCircle) {
        const offset = circumference * (1 - progress);
        progressCircle.style.strokeDashoffset = offset;
      }
    };

    const promises = imageUrls.map(url => new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = () => { updateProgress(); resolve(); };
      img.src = url;
    }));

    await Promise.all(promises);
    setTimeout(hideLoader, 500);
  };

  /* ===== PARTICULAS ===== */
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

  preloadResources().then(() => {
    if (window.innerWidth > 768) {
      setTimeout(loadParticles, 500);
    }

    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      setTimeout(() => {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  });

  const componentsHtml = `
    <!-- LIGHTBOX -->
    <div class="lightbox-overlay" id="lightbox">
      <div class="lightbox-content">
        <button class="lightbox-close">&times;</button>
        <button class="lightbox-btn prev">❮</button>
        <img src="" class="lightbox-img" id="lightboxImg" alt="Vista previa" width="1080" height="1080">
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
  let favorites = JSON.parse(localStorage.getItem("mishiFavorites")) || [];

  const cartFab = document.getElementById("cartFab");
  const cartCount = document.getElementById("cartCount");
  const cartModal = document.getElementById("cartModal");
  const cartItemsContainer = document.getElementById("cartItems");
  const closeCartBtn = document.getElementById("closeCart");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const validateCartPrices = () => {
    if (!cart.length || !catalog.length) return;
    
    let cartUpdated = false;

    cart.forEach(item => {
      let product = null;
      for (const section of catalog) {
        const found = section.items.find(p => p.name === item.name);
        if (found) {
          product = found;
          break;
        }
      }

      if (!product || !product.prices) return;

      let currentPriceTier = null;

      if (item.priceIndex !== undefined && item.priceIndex !== 'custom') {
        currentPriceTier = product.prices[item.priceIndex];
      } else if (!item.priceIndex && item.price > 0) {
        const match = item.desc.match(/^(\d+)\s+Unidad/);
        if (match) {
          const qty = parseInt(match[1]);
          currentPriceTier = product.prices.find(p => p.quantity === qty);
        }
      }

      if (currentPriceTier) {
        if (item.price !== currentPriceTier.price) {
          item.price = currentPriceTier.price;
          item.desc = `${currentPriceTier.quantity} ${currentPriceTier.quantity === 1 ? "Unidad" : "Unidades"} (${currentPriceTier.price} Bs)`;
          
          const unitPriceObj = product.prices.find(p => p.quantity === 1);
          if (unitPriceObj && currentPriceTier.quantity > 1) {
             item.originalPrice = unitPriceObj.price * currentPriceTier.quantity;
             item.saving = item.originalPrice - currentPriceTier.price;
          }
          cartUpdated = true;
        }
      }
    });

    if (cartUpdated) {
      saveCart();
      showToast("⚠️ Precios del carrito actualizados");
    }
  };

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

  validateCartPrices();
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
        saveCart();
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
      message += `- ${i + 1}. *${item.name}* \n   Detalle: ${item.desc}\n`;
      total += item.price || 0;
      if (!item.price) hasCustom = true;
    });

    let totalText = "";
    if (total === 0 && hasCustom) {
      totalText = "Por Cotizar";
    } else {
      totalText = `${total} Bs${hasCustom ? " + Cotización" : ""}`;
    }
    message += `\n*Total Estimado: ${totalText}*`;
    message += "\nEspero su confirmación. ¡Gracias!";

    const url = `https://wa.me/59176904748?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    cart = [];
    saveCart();
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

  addToCartBtn.addEventListener("click", () => {
    const option = getSelectedOption();
    if (!option) return;

    const images =
      currentProduct.images ||
      (currentProduct.image ? [currentProduct.image] : []);

    let originalPrice = 0;
    let saving = 0;
    let selectedIdx = 'custom';

    if (option.price > 0 && currentProduct.prices) {
      selectedIdx = document.querySelector(
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
      priceIndex: selectedIdx
    });

    saveCart();
    closeModal();

    cartFab.style.transform = "scale(1.3)";
    setTimeout(() => (cartFab.style.transform = "scale(1)"), 200);
    showToast(`¡${currentProduct.name} agregado al carrito!`);
  });

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

  /* ===== FILTRO DE PRODUCTOS (DROPDOWN) ===== */
  let filterHtml = `
    <div class="filter-container fade-in-up">
      <div class="dropdown">
        <button class="dropdown-btn" id="filterDropdownBtn">
          Viendo: Todo <span>▼</span>
        </button>
        <div class="dropdown-content" id="filterDropdownContent">
          <label class="filter-option">
            <input type="checkbox" value="all" checked>
            <span>Seleccionar Todos</span>
          </label>
  `;

  if (catalog.length > 0) {
    catalog.forEach((section) => {
      filterHtml += `
        <label class="filter-option">
          <input type="checkbox" value="${section.id}" checked>
          <span>${section.title}</span>
        </label>
      `;
    });
  }
  filterHtml += `</div></div></div>`;
  container.insertAdjacentHTML("afterbegin", filterHtml);

  const dropdownBtn = document.getElementById("filterDropdownBtn");
  const dropdownContent = document.getElementById("filterDropdownContent");
  const allCheckbox = container.querySelector('input[value="all"]');
  const categoryCheckboxes = container.querySelectorAll('.filter-option input:not([value="all"])');

  dropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownContent.classList.toggle("show");
    dropdownBtn.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
      dropdownContent.classList.remove("show");
      dropdownBtn.classList.remove("active");
    }
  });

  const updateFilterState = () => {
    const checkedBoxes = Array.from(categoryCheckboxes).filter(cb => cb.checked);
    const isAllSelected = checkedBoxes.length === categoryCheckboxes.length;
    
    allCheckbox.checked = isAllSelected;

    if (isAllSelected) {
      dropdownBtn.innerHTML = 'Viendo: Todo <span>▼</span>';
    } else if (checkedBoxes.length === 0) {
      dropdownBtn.innerHTML = '⚠️ Selecciona una <span>▼</span>';
    } else {
      const names = checkedBoxes.map(cb => cb.nextElementSibling.textContent).join(', ');
      dropdownBtn.innerHTML = `Viendo: ${names} <span>▼</span>`;
    }

    categoryCheckboxes.forEach(cb => {
      const sectionId = cb.value;
      const sectionEl = document.getElementById(sectionId);
      const navLink = document.querySelector(`.nav-links a[href="#${sectionId}"]`);
      const navLi = navLink ? navLink.parentElement : null;

      if (cb.checked) {
        if (sectionEl) sectionEl.style.display = "block";
        if (navLi) navLi.style.display = "block";
      } else {
        if (sectionEl) sectionEl.style.display = "none";
        if (navLi) navLi.style.display = "none";
      }
    });
  };

  allCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      categoryCheckboxes.forEach(cb => cb.checked = true);
    } else {
      e.target.checked = true;
    }
    updateFilterState();
  });

  categoryCheckboxes.forEach(cb => {
    cb.addEventListener("change", (e) => {
      const activeCount = Array.from(categoryCheckboxes).filter(c => c.checked).length;
      if (activeCount === 0) {
        e.target.checked = true;
      }
      updateFilterState();
    });
  });

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

    const onScroll = () => {
      const scrollY = window.scrollY || document.body.scrollTop || document.documentElement.scrollTop;
      navbar.classList.toggle("scrolled", scrollY > 50);
    };
    window.addEventListener("scroll", onScroll);
    document.body.addEventListener("scroll", onScroll);

    navbar.insertBefore(toggleBtn, navLinks);
  }

  let globalImageCounter = 0;

  /* ===== FUNCIÓN HELPER: GENERAR HTML DE PRECIOS ===== */
  const generatePriceTableHtml = (pricesList) => {
    if (!pricesList || pricesList.length === 0) return "";
    
    return `
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
      `;
  };

  /* ===== FUNCIÓN HELPER: CREAR TARJETA DE PRODUCTO ===== */
  const createProductCard = (item, forceEager = false) => {
      const card = document.createElement("article");
      card.className = "product-card";
      
      const productId = item.name.toLowerCase().trim().replace(/[\s\W-]+/g, '-').replace(/^-+|-+$/g, '');
      card.id = productId;

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
      
      const isFav = favorites.includes(item.name);

      const isLCP = forceEager || globalImageCounter < 4;
      const loadingAttr = isLCP ? 'loading="eager"' : 'loading="lazy"';
      const priorityAttr = isLCP ? 'fetchpriority="high"' : '';
      globalImageCounter++;

      const pricesList = item.prices || [];

      const pricesHtml = generatePriceTableHtml(pricesList);

      card.innerHTML = `
        <div class="card-image-container">
          <img src="${mainImage}" class="card-image" alt="${item.name}" width="280" height="220" ${loadingAttr} ${priorityAttr} decoding="async">
          ${controlsHtml}
          ${imageBadge}
          <button class="share-btn" aria-label="Compartir en WhatsApp">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
            </svg>
          </button>
          <button class="fav-btn ${isFav ? 'active' : ''}" aria-label="Añadir a favoritos">♥</button>
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

      const shareBtn = card.querySelector(".share-btn");
      shareBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        
        const pageUrl = "https://gambito404.github.io/MishiStudio/"; 
        const text = `Mira este producto de Mishi Studio: *${item.name}*\n${pageUrl}#${productId}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      });

      const favBtn = card.querySelector(".fav-btn");
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = favorites.indexOf(item.name);
        
        if (index === -1) {
          favorites.push(item.name);
          favBtn.classList.add("active");
          showToast(`❤️ ${item.name} guardado en favoritos`);
        } else {
          favorites.splice(index, 1);
          favBtn.classList.remove("active");
          showToast(`💔 ${item.name} eliminado de favoritos`);
        }
        localStorage.setItem("mishiFavorites", JSON.stringify(favorites));
        updateFavBadge(true);
        renderFavorites();
      });

      const contactBtn = card.querySelector(".btn-contact");
      contactBtn.addEventListener("click", () => openModal(item));

      let currentIndex = 0;

      if (images.length > 1) {
        const imgEl = card.querySelector("img.card-image");
        const badgeEl = card.querySelector(".image-badge");
        const prevBtn = card.querySelector(".prev");
        const nextBtn = card.querySelector(".next");

        const updateView = () => {
          imgEl.style.opacity = 0;

          setTimeout(() => {
            imgEl.src = images[currentIndex];
            badgeEl.textContent = `${currentIndex + 1} / ${images.length}`;
            imgEl.style.opacity = 1;
          }, 300); 
        };

        prevBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          currentIndex = (currentIndex - 1 + images.length) % images.length;
          updateView();
        });

        nextBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          currentIndex = (currentIndex + 1) % images.length;
          updateView();
        });
      }

      const imgContainer = card.querySelector(".card-image");
      imgContainer.addEventListener("click", () => {
        openLightbox(images, currentIndex);
      });

      return card;
  };

  /* ===== FUNCIÓN HELPER: RENDERIZAR SECCIÓN ===== */
  const renderSection = (section) => {
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
      const card = createProductCard(item);
      card.classList.add("floating");
      grid.appendChild(card);
    });

    container.appendChild(sectionEl);
  };

  catalog.forEach((section) => renderSection(section));

  /* ===== SECCIÓN FAVORITOS (NUEVA) ===== */
  const favSection = document.createElement("section");
  favSection.className = "catalog-section";
  favSection.id = "favorites";
  favSection.innerHTML = `
    <header class="section-header fade-in-up">
      <h2>Mis Favoritos ❤️</h2>
      <p>Tus productos guardados</p>
    </header>
    <div class="products-grid" id="favorites-grid"></div>
    <div id="fav-empty" style="text-align:center; width:100%; display:none; color:#ccc; margin-top:20px;">
      <p style="font-size: 1.2rem;">No tienes favoritos aún.</p>
      <p style="font-size: 0.9rem; opacity: 0.7;">¡Dale amor a los productos que te gusten!</p>
      <button class="btn-contact" style="max-width:200px; margin:30px auto;" id="btn-back-catalog">Ir al inicio</button>
    </div>
  `;
  container.appendChild(favSection);

  function renderFavorites() {
    const grid = document.getElementById("favorites-grid");
    const emptyMsg = document.getElementById("fav-empty");
    grid.innerHTML = "";

    favorites = JSON.parse(localStorage.getItem("mishiFavorites")) || [];

    if (favorites.length === 0) {
      emptyMsg.style.display = "block";
      return;
    }
    emptyMsg.style.display = "none";

    const favItems = [];
    if (catalog.length > 0) {
      catalog.forEach(section => {
        section.items.forEach(item => {
          if (favorites.includes(item.name)) {
            favItems.push({ item, sectionId: section.id });
          }
        });
      });
    }

    favItems.forEach(({ item, sectionId }) => {
      const card = document.createElement("article");
      card.className = "product-card floating";
      
      const images = item.images || (item.image ? [item.image] : []);
      const mainImage = images.length > 0 ? images[0] : "";

      card.innerHTML = `
        <div class="card-image-container">
          <img src="${mainImage}" class="card-image" alt="${item.name}" width="280" height="220" loading="lazy">
          <button class="share-btn" aria-label="Compartir en WhatsApp">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
            </svg>
          </button>
          <button class="fav-btn active" aria-label="Quitar de favoritos">♥</button>
        </div>
        <div class="card-body">
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <button class="btn-contact">Cotizar</button>
        </div>
      `;

      const shareBtn = card.querySelector(".share-btn");
      shareBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const productId = item.name.toLowerCase().trim().replace(/[\s\W-]+/g, '-').replace(/^-+|-+$/g, '');
        
        const pageUrl = "https://gambito404.github.io/MishiStudio/";
        const text = `Mira este producto de Mishi Studio: *${item.name}*\n${pageUrl}#${productId}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      });

      const favBtn = card.querySelector(".fav-btn");
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = favorites.indexOf(item.name);
        if (index > -1) {
          favorites.splice(index, 1);
          localStorage.setItem("mishiFavorites", JSON.stringify(favorites));
          card.style.opacity = "0";
          card.style.transform = "scale(0.8)";
          setTimeout(() => renderFavorites(), 300);
          showToast(`💔 ${item.name} eliminado`);
          updateFavBadge(true);
        }
      });

      card.querySelector(".btn-contact").addEventListener("click", () => openModal(item));
      
      card.querySelector(".card-image").addEventListener("click", () => openLightbox(images, 0));

      grid.appendChild(card);
    });
  }

  const favLi = document.createElement("li");
  const favLink = document.createElement("a");
  favLink.href = "#favorites";
  favLink.innerHTML = 'Favoritos <span id="favCount" class="nav-badge">0</span>';
  favLi.appendChild(favLink);
  navLinks.appendChild(favLi);

  /* ===== SONIDO POP ===== */
  const playPopSound = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  const updateFavBadge = (playSound = false) => {
    const badge = document.getElementById("favCount");
    if (badge) {
      badge.textContent = favorites.length;
      badge.style.display = favorites.length > 0 ? "inline-flex" : "none";
      
      if (favorites.length > 0) {
        if (playSound) playPopSound();
      }
    }
  };
  updateFavBadge(false);
  renderFavorites();

  favLink.addEventListener("click", (e) => {
    navLinks.classList.remove("active");
    const toggleBtn = document.querySelector(".menu-toggle");
    if (toggleBtn) toggleBtn.innerHTML = "☰";
  });

  document.getElementById("btn-back-catalog").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ===== BOTÓN DE INSTALACIÓN PWA ===== */
  const setupInstallButton = () => {
    const installLi = document.createElement("li");
    installLi.id = "pwa-install-li"; // ID para encontrarlo desde el evento global
    const installBtn = document.createElement("a");
    installBtn.href = "#";
    installBtn.innerHTML = "📲 INSTALAR APP";
    installBtn.style.color = "#4cd137";
    installLi.style.display = "none";
    installLi.appendChild(installBtn);
    navLinks.appendChild(installLi);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isStandalone) {
      return;
    }

    if (isIos) {
      installLi.style.display = "block";
    }

    // Si el evento ocurrió antes de llegar aquí, mostramos el botón ahora
    if (deferredPrompt) {
      installLi.style.display = "block";
    }

    installBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          installLi.style.display = "none";
          deferredPrompt = null;
        });
      } else if (isIos) {
        alert("Para instalar en iPhone/iPad:\n1. Toca el botón 'Compartir' (cuadrado con flecha hacia arriba) en la barra inferior.\n2. Busca y selecciona la opción 'Agregar al inicio'.");
      }
    });

    window.addEventListener('appinstalled', () => {
      installLi.style.display = "none";
      deferredPrompt = null;
      console.log("✅ App instalada correctamente");
    });
  };
  setupInstallButton();

  /* ===== SCROLL ANIMATIONS ===== */
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

  /* ===== SCROLL SPY ===== */
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

  /* ===== AUTO RELOAD ===== */
  let refreshing = false;
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  /* ===== CUSTOM SCROLLBAR (LA TRAMPITA JS) ===== */
  const scrollTrack = document.createElement('div');
  scrollTrack.id = 'custom-scrollbar-track';
  const scrollThumb = document.createElement('div');
  scrollThumb.id = 'custom-scrollbar-thumb';
  scrollTrack.appendChild(scrollThumb);
  document.body.appendChild(scrollTrack);

  const updateScrollThumb = () => {
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    let thumbHeight = Math.max((winHeight / docHeight) * winHeight, 50); 
    
    const maxScrollTop = docHeight - winHeight;
    const maxThumbTop = winHeight - thumbHeight;
    
    let thumbTop = 0;
    if (maxScrollTop > 0) {
        thumbTop = (scrollTop / maxScrollTop) * maxThumbTop;
    }

    scrollThumb.style.height = `${thumbHeight}px`;
    scrollThumb.style.transform = `translateY(${thumbTop}px)`;
    
    scrollTrack.style.display = docHeight <= winHeight ? 'none' : 'block';
  };

  window.addEventListener('scroll', updateScrollThumb);
  window.addEventListener('resize', updateScrollThumb);
  
  const resizeObserver = new ResizeObserver(() => updateScrollThumb());
  resizeObserver.observe(document.body);

  let isDragging = false;
  let startY = 0;
  let startScrollTop = 0;

  const startDrag = (clientY) => {
    isDragging = true;
    startY = clientY;
    startScrollTop = window.scrollY || document.documentElement.scrollTop;
    document.body.style.userSelect = 'none';
  };

  const onDrag = (clientY) => {
    if (!isDragging) return;
    const winHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const thumbHeight = scrollThumb.offsetHeight;
    const maxThumbTop = winHeight - thumbHeight;
    const maxScrollTop = docHeight - winHeight;

    const deltaY = clientY - startY;
    const scrollDelta = (deltaY / maxThumbTop) * maxScrollTop;
    
    window.scrollTo(0, startScrollTop + scrollDelta);
  };

  const stopDrag = () => {
    isDragging = false;
    document.body.style.userSelect = '';
  };

  scrollThumb.addEventListener('mousedown', (e) => startDrag(e.clientY));
  document.addEventListener('mousemove', (e) => onDrag(e.clientY));
  document.addEventListener('mouseup', stopDrag);

  scrollThumb.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrag(e.touches[0].clientY);
  }, { passive: false });
  
  document.addEventListener('touchmove', (e) => {
    if(isDragging) e.preventDefault();
    onDrag(e.touches[0].clientY);
  }, { passive: false });
  
  document.addEventListener('touchend', stopDrag);

  /* ===== AUTO UPDATE (POLLING 10s) ===== */
  let updateNotificationShown = false;

  const checkForUpdates = async () => {
    if (updateNotificationShown) return;

    const newCatalog = await loadCatalogData();
    
    if (!newCatalog || newCatalog.length === 0) return;

    const currentData = JSON.stringify(catalog);
    const newData = JSON.stringify(newCatalog);

    if (currentData !== newData) {
        updateNotificationShown = true;
        showUpdateNotification();
    }
  };

  const showUpdateNotification = () => {
    const notification = document.createElement("div");
    notification.className = "update-notification";
    notification.innerHTML = `
      <span>🔄 Hay nuevos productos o precios disponibles.</span>
      <button onclick="window.location.reload()">Actualizar</button>
    `;
    document.body.appendChild(notification);
  };

  setInterval(checkForUpdates, 10000);

  /* ===== DETECCIÓN OFFLINE/ONLINE ===== */
  const offlineOverlay = document.getElementById('offline-overlay');

  const updateOnlineStatus = () => {
    if (!offlineOverlay) return;
    if (navigator.onLine) {
      offlineOverlay.classList.remove('active');
    } else {
      offlineOverlay.classList.add('active');
    }
  };

  window.addEventListener('online', () => { updateOnlineStatus(); showToast("✅ Conexión restaurada"); });
  window.addEventListener('offline', () => { updateOnlineStatus(); });
  
  updateOnlineStatus(); // Verificar estado inicial al cargar
});
