// Utilidad de Long Press Menu - Compartida entre pantallas
window.APP_LongPress = {
  // Configurar long press en un elemento
  configurar(elemento, opciones) {
    let pressTimer = null;

    // Prevenir menú contextual del navegador
    elemento.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch events (móvil)
    elemento.addEventListener('touchstart', (e) => {
      if (e.target.closest('.btn-sin-longpress')) return;
      pressTimer = setTimeout(() => {
        this.mostrarMenu(opciones);
      }, 1800);
    });

    elemento.addEventListener('touchend', () => clearTimeout(pressTimer));
    elemento.addEventListener('touchmove', () => clearTimeout(pressTimer));

    // Mouse events (desktop)
    elemento.addEventListener('mousedown', (e) => {
      if (e.target.closest('.btn-sin-longpress')) return;
      pressTimer = setTimeout(() => {
        this.mostrarMenu(opciones);
      }, 1800);
    });

    elemento.addEventListener('mouseup', () => clearTimeout(pressTimer));
    elemento.addEventListener('mouseleave', () => clearTimeout(pressTimer));
  },

  // Mostrar menú de opciones
  mostrarMenu(opciones) {
    // Cerrar menús anteriores
    document.querySelectorAll('.longpress-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'longpress-menu';

    // Construir items del menú
    let menuHTML = '';

    if (opciones.editar) {
      menuHTML += `
        <button class="longpress-item longpress-editar" data-action="editar">
          <div class="longpress-icon longpress-icon-editar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          ${opciones.editar.texto || 'Editar'}
        </button>
      `;
    }

    if (opciones.borrar) {
      menuHTML += `
        <button class="longpress-item longpress-borrar" data-action="borrar">
          <div class="longpress-icon longpress-icon-borrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          ${opciones.borrar.texto || 'Borrar'}
        </button>
      `;
    }

    menu.innerHTML = menuHTML;

    // Posicionar en centro
    menu.style.position = 'fixed';
    menu.style.top = '50%';
    menu.style.left = '50%';
    menu.style.transform = 'translate(-50%, -50%)';

    document.body.appendChild(menu);

    // Cerrar al tocar fuera
    setTimeout(() => {
      const cerrarMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', cerrarMenu);
        }
      };
      document.addEventListener('click', cerrarMenu);
    }, 100);

    // Eventos de los items
    if (opciones.editar) {
      menu.querySelector('[data-action="editar"]').addEventListener('click', (e) => {
        e.stopPropagation();
        menu.remove();
        opciones.editar.accion();
      });
    }

    if (opciones.borrar) {
      menu.querySelector('[data-action="borrar"]').addEventListener('click', (e) => {
        e.stopPropagation();
        menu.remove();
        if (opciones.borrar.confirmar) {
          if (confirm(opciones.borrar.confirmar)) {
            opciones.borrar.accion();
          }
        } else {
          opciones.borrar.accion();
        }
      });
    }
  }
};
