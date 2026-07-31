// App main - Router
const PAGES_ORDER = ['comprar', 'productos', 'precios'];

function getPage() {
  return (window.location.hash.slice(1) || 'comprar').split('?')[0];
}

async function navigate(page, direction = null) {
  const render = APP_Pages[page] || APP_Pages.comprar;
  const content = document.getElementById('app-content');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

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

// Mostrar fecha en el header
function initFecha() {
  const fechaEl = document.getElementById('header-fecha');
  if (!fechaEl) return;

  const ahora = new Date();
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  fechaEl.innerHTML = `
    <div class="header-fecha-dia">${ahora.getDate()}</div>
    <div class="header-fecha-mes">${dias[ahora.getDay()]} ${meses[ahora.getMonth()]}</div>
  `;
}

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
  initFecha();
  initUbicacion();

  APP_DB.detectarUbicacion().catch(() => {});

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

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.error("SW Error:", err));
  }
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
      const items = await APP_Sync.getListaFamiliar() || [];
      pendientes = items.filter(i => !i.comprado);
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

