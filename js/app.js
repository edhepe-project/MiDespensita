// App main - Router
const PAGES_ORDER = ['comprar', 'productos', 'precios', 'tiendas'];

function getPage() {
  return (window.location.hash.slice(1) || 'comprar').split('?')[0];
}

async function navigate(page, direction = null) {
  const render = APP_Pages[page] || APP_Pages.comprar;
  const content = document.getElementById('app-content');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Marcar/desmarcar botón de cuenta cuando se navega a config
  const btnCuenta = document.getElementById('btn-cuenta');
  if (btnCuenta) {
    btnCuenta.classList.toggle('activo', page === 'config');
  }

  // Animación de transición
  if (direction) {
    const enterFrom  = direction === 'left'  ? 'translateX(100%)' : 'translateX(-100%)';
    const exitTo     = direction === 'left'  ? 'translateX(-100%)' : 'translateX(100%)';

    content.style.transition = 'none';
    content.style.transform  = exitTo;
    content.style.opacity    = '0';

    await render();

    requestAnimationFrame(() => {
      content.style.transition = 'none';
      content.style.transform  = enterFrom;
      content.style.opacity    = '0';

      requestAnimationFrame(() => {
        content.style.transition = 'transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease';
        content.style.transform  = 'translateX(0)';
        content.style.opacity    = '1';
      });
    });
  } else {
    await render();
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// ── Swipe de navegación entre páginas ─────────────────────────────────────────
function initPageSwipe() {
  const content = document.getElementById('app-content');
  let startX = 0, startY = 0;
  let isTracking = false, isScrolling = false;

  content.addEventListener('touchstart', (e) => {
    // No iniciar si el toque viene de un elemento con swipe de ítem
    if (e.target.closest('.swipe-item-content') || e.target.closest('.swipe-wrapper')) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isTracking = true;
    isScrolling = false;
  }, { passive: true });

  content.addEventListener('touchmove', (e) => {
    if (!isTracking) return;
    const dx = e.touches[0].clientX - startX;
    const dy = Math.abs(e.touches[0].clientY - startY);

    // Si el movimiento es más vertical que horizontal → scroll, ignorar
    if (dy > Math.abs(dx) + 10) {
      isScrolling = true;
      isTracking = false;
    }
  }, { passive: true });

  content.addEventListener('touchend', (e) => {
    if (!isTracking || isScrolling) return;
    isTracking = false;

    const dx = e.changedTouches[0].clientX - startX;
    const THRESHOLD = 80; // px mínimos para cambiar de pantalla

    if (Math.abs(dx) < THRESHOLD) return;

    const currentPage  = getPage();
    const currentIndex = PAGES_ORDER.indexOf(currentPage);
    if (currentIndex === -1) return;

    if (dx < 0 && currentIndex < PAGES_ORDER.length - 1) {
      // Swipe izquierda → siguiente página
      window.location.hash = '#' + PAGES_ORDER[currentIndex + 1];
    } else if (dx > 0 && currentIndex > 0) {
      // Swipe derecha → página anterior
      window.location.hash = '#' + PAGES_ORDER[currentIndex - 1];
    }
  }, { passive: true });
}

// Función global para botón de regresar
window.volverAPrecios = function() {
  window.location.hash = '#precios';
};

// Inicializar ubicación en el header
async function initUbicacion() {
  const ubicacion = await APP_DB.getUbicacion();
  const header = document.getElementById('ubicacion-header');
  if (header) {
    header.textContent = ubicacion?.ciudad || 'Tu lista de compras';
  }
}

window.addEventListener('hashchange', () => {
  const page = getPage();
  const prev = window._lastPage;
  const prevIndex = PAGES_ORDER.indexOf(prev);
  const currIndex = PAGES_ORDER.indexOf(page);
  let dir = null;
  if (prevIndex !== -1 && currIndex !== -1) {
    dir = currIndex > prevIndex ? 'left' : 'right';
  }
  window._lastPage = page;
  // Las páginas fuera del orden (historial, config, etc.) nav sin animación
  navigate(page, dir);
});

document.addEventListener('DOMContentLoaded', () => {
  initUbicacion();

  // detectarUbicacion() es llamada por comprar.js al renderizar,
  // no es necesario llamarla aquí también (evita doble petición GPS/IP al inicio)

  if (navigator.onLine) {
    if (APP_Sync) APP_Sync.syncAutomatico();
  }

  window.addEventListener('online', () => {
    if (APP_Sync) APP_Sync.syncPrecios();
    ocultarBannerOffline();
  });

  window.addEventListener('offline', () => {
    mostrarBannerOffline();
  });

  // Mostrar si ya está offline al iniciar
  if (!navigator.onLine) mostrarBannerOffline();

  if (APP_Notifications) {
    APP_Notifications.iniciar();
  }

  window._lastPage = getPage();
  navigate(getPage());
  initPageSwipe();
  initPwaInstallPrompt();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.error("SW Error:", err));
  }

  // ── Bloqueo de scroll global para modales ────────────────────────────────────
  const observer = new MutationObserver(() => {
    const hayModales = document.querySelectorAll('.modal-overlay').length > 0;
    document.body.style.overflow = hayModales ? 'hidden' : '';
  });
  observer.observe(document.body, { childList: true });
});

// ── Banner offline ─────────────────────────────────────────────────────────────
function mostrarBannerOffline() {
  if (document.getElementById('offline-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.innerHTML = '📵 Sin conexión — trabajando sin internet';
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    background: #f59e0b; color: #fff; text-align: center;
    font-size: 13px; font-weight: 600; padding: 6px;
    animation: slideDown 0.3s ease;
  `;
  document.body.prepend(banner);
}

function ocultarBannerOffline() {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.remove();
}

// ── Compartir lista por WhatsApp ───────────────────────────────────────────────
window.compartirListaWhatsApp = async function() {
  try {
    const codigoFamilia = APP_Sync?.getCodigoFamilia?.();
    let pendientes = [];

    if (codigoFamilia && navigator.onLine) {
      const data = await APP_Sync.getListaFamiliar() || { items: [] };
      pendientes = (data.items || []).filter(i => !i.comprado);
    } else {
      const lista = await APP_DB.getListaActiva();
      const items = await APP_DB.getItemsByLista(lista.id);
      pendientes = items.filter(i => !i.comprado);
    }

    if (pendientes.length === 0) {
      alert('¡No hay productos pendientes en la lista!');
      return;
    }

    const lineas = pendientes.map(item => {
      const nombre = item.nombre_producto || item.producto?.nombre || 'Sin nombre';
      const cantidad = item.cantidad || 1;
      return `• ${nombre} x${cantidad}`;
    });

    const texto = `🛒 *Lista de compras*\n${lineas.join('\n')}`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  } catch(e) {
    alert('Error al generar la lista');
  }
};

// ── Modal de Imagen (Lightbox) ────────────────────────────────────────────────
window.openImageModal = function(src) {
  if (!src) return;
  let modal = document.getElementById('image-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85); z-index: 10000;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s ease;
    `;
    
    const img = document.createElement('img');
    img.id = 'image-modal-img';
    img.style.cssText = `
      max-width: 90vw; max-height: 80vh; object-fit: contain;
      border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      margin-top: 24px; width: 50px; height: 50px; border-radius: 25px;
      background: white; color: black; border: none; font-size: 24px; font-weight: bold;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3); cursor: pointer;
    `;
    closeBtn.onclick = closeImageModal;
    
    modal.appendChild(img);
    modal.appendChild(closeBtn);
    modal.onclick = (e) => { if(e.target === modal) closeImageModal(); };
    document.body.appendChild(modal);
  }
  
  document.getElementById('image-modal-img').src = src;
  modal.style.display = 'flex';
  // Forzar reflow para animación
  modal.offsetHeight;
  modal.style.opacity = '1';
};

window.closeImageModal = function() {
  const modal = document.getElementById('image-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
};

// ── PWA Install Prompt ────────────────────────────────────────────────────────
function initPwaInstallPrompt() {
  let deferredPrompt;

  // Si ya se instaló antes o el usuario lo descartó, no molestar más
  if (localStorage.getItem('pwa_prompt_dismissed') === 'true') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Evitar que el mini-infobar de Chrome (nativo) aparezca
    e.preventDefault();
    // Guardar el evento para dispararlo luego cuando el usuario acepte
    deferredPrompt = e;

    // Solo mostrar si no existe ya el modal
    if (document.getElementById('pwa-install-modal')) return;

    // Pequeño retraso de 2.5s para que el usuario primero vea la app antes del modal
    setTimeout(() => {
      // Doble check por si navegó rápido
      if (document.getElementById('pwa-install-modal')) return;

      const modal = document.createElement('div');
      modal.id = 'pwa-install-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-height: auto; text-align: center;">
          <div style="background: var(--coral-100); width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--coral-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <h3 style="margin-bottom: 8px; font-size: 1.25rem;">Instala MiDespensita</h3>
          <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem;">Agrega la app a tu pantalla de inicio para acceso rápido, guardar datos sin internet y una experiencia completa.</p>
          <div style="display: flex; gap: 12px;">
            <button class="btn btn-secondary" style="flex:1" id="pwa-btn-cancel">Ahora no</button>
            <button class="btn btn-primary" style="flex:1" id="pwa-btn-install">Instalar App</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#pwa-btn-cancel').addEventListener('click', () => {
        modal.remove();
        // Guardamos que lo canceló para no volver a insistir en futuras visitas
        localStorage.setItem('pwa_prompt_dismissed', 'true');
      });

      modal.querySelector('#pwa-btn-install').addEventListener('click', async () => {
        modal.remove();
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome !== 'accepted') {
            localStorage.setItem('pwa_prompt_dismissed', 'true');
          }
          deferredPrompt = null;
        }
      });
    }, 2500); 
  });

  window.addEventListener('appinstalled', () => {
    // Si la instala, ocultar el modal por si seguía abierto
    const modal = document.getElementById('pwa-install-modal');
    if (modal) modal.remove();
    console.log('App instalada con éxito');
  });
}
