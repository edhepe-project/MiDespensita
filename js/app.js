// App main - Router
function getPage() {
  return (window.location.hash.slice(1) || 'comprar').split('?')[0];
}

async function navigate(page) {
  const render = APP_Pages[page] || APP_Pages.comprar;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  await render();
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

window.addEventListener('hashchange', () => navigate(getPage()));

document.addEventListener('DOMContentLoaded', () => {
  // Mostrar fecha y ubicación inmediatamente
  initFecha();
  initUbicacion();

  // Detectar ubicación (en segundo plano, sin bloquear)
  APP_DB.detectarUbicacion().catch(() => {});

  // Sync cuando hay internet
  if (navigator.onLine) {
    if (APP_Sync) APP_Sync.syncAutomatico();
  }

  // Intentar sync cuando vuelve la conexión
  window.addEventListener('online', () => {
    if (APP_Sync) APP_Sync.syncPrecios();
  });

  // Iniciar notificaciones
  if (APP_Notifications) {
    APP_Notifications.iniciar();
  }

  navigate(getPage());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
