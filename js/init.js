// Inicialización - debe cargarse primero
window.APP_Pages = {};
window.APP_DB = {};
window.APP_CATEGORIAS = {};
window.APP_UNIDADES = [];
window.APP_LISTA_BASE = [];
window.APP_Format = {};

// Prevenir menú contextual del navegador en toda la app
document.addEventListener('contextmenu', (e) => {
  // Permitir en inputs y textareas
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  e.preventDefault();
});
