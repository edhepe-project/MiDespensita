// Utilidad de Swipe to Action - Reemplaza a Long Press
window.APP_Swipe = {
  configurar(elemento, opciones) {
    if (elemento.dataset.swipeConfigured) return;
    elemento.dataset.swipeConfigured = 'true';

    // 1. Crear el wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'swipe-wrapper';

    // 2. Crear contenedor de acciones
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'swipe-actions';

    let actionWidth = 0;

    // Construir botones
    if (opciones.editar) {
      const btnEditar = document.createElement('button');
      btnEditar.className = 'swipe-btn swipe-editar';
      btnEditar.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      `;
      btnEditar.onclick = (e) => {
        e.stopPropagation();
        resetSwipe();
        opciones.editar.accion();
      };
      actionsContainer.appendChild(btnEditar);
      actionWidth += 65; // px de ancho
    }

    if (opciones.borrar) {
      const btnBorrar = document.createElement('button');
      btnBorrar.className = 'swipe-btn swipe-borrar';
      btnBorrar.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      `;
      btnBorrar.onclick = (e) => {
        e.stopPropagation();
        resetSwipe();
        if (opciones.borrar.confirmar) {
          if (confirm(opciones.borrar.confirmar)) {
            opciones.borrar.accion();
          }
        } else {
          opciones.borrar.accion();
        }
      };
      actionsContainer.appendChild(btnBorrar);
      actionWidth += 65;
    }

    // Envolver el elemento original
    elemento.parentNode.insertBefore(wrapper, elemento);
    wrapper.appendChild(actionsContainer);
    wrapper.appendChild(elemento);

    elemento.classList.add('swipe-item-content');

    // Lógica de deslizamiento
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let isScrolling = false;
    let isOpen = false;
    const maxSwipe = actionWidth;

    function resetSwipe() {
      isOpen = false;
      elemento.style.transform = 'translateX(0px)';
      elemento.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
    }

    function openSwipe() {
      isOpen = true;
      elemento.style.transform = `translateX(-${maxSwipe}px)`;
      elemento.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
    }

    // Touch events
    elemento.addEventListener('touchstart', (e) => {
      if (e.target.closest('.btn-sin-longpress') || e.target.closest('.btn')) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = true;
      isScrolling = false;
      elemento.style.transition = 'none';
    }, { passive: true });

    elemento.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = touchX - startX;
      const diffY = Math.abs(touchY - startY);

      // Si el movimiento es más vertical que horizontal, es un scroll de página
      if (diffY > 15 && Math.abs(diffX) < 15) {
        isScrolling = true;
      }

      if (isScrolling) return;

      currentX = isOpen ? diffX - maxSwipe : diffX;
      
      // Restringir movimiento
      if (currentX > 0) currentX = 0; // No deslizar a la derecha
      if (currentX < -maxSwipe - 20) currentX = -maxSwipe - 20; // Resistencia extra

      // Prevenir el scroll de página si está deslizando claramente en horizontal
      if (Math.abs(diffX) > 10 && e.cancelable) {
        e.preventDefault();
      }

      elemento.style.transform = `translateX(${currentX}px)`;
    }, { passive: false });

    elemento.addEventListener('touchend', (e) => {
      if (!isSwiping || isScrolling) return;
      isSwiping = false;

      // Si deslizó suficiente, abrir, si no, cerrar
      if (currentX < -(maxSwipe * 0.4)) {
        openSwipe();
      } else {
        resetSwipe();
      }
    });

    // Cerrar al tocar fuera del ítem
    document.addEventListener('touchstart', (e) => {
      if (isOpen && !wrapper.contains(e.target)) {
        resetSwipe();
      }
    }, { passive: true });
    
    // Desktop Mouse events para facilitar pruebas en PC
    let isMouseDown = false;
    elemento.addEventListener('mousedown', (e) => {
      if (e.target.closest('.btn-sin-longpress') || e.target.closest('.btn')) return;
      startX = e.clientX;
      isMouseDown = true;
      isSwiping = true;
      elemento.style.transition = 'none';
    });
    
    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      const diffX = e.clientX - startX;
      currentX = isOpen ? diffX - maxSwipe : diffX;
      if (currentX > 0) currentX = 0;
      if (currentX < -maxSwipe - 20) currentX = -maxSwipe - 20;
      elemento.style.transform = `translateX(${currentX}px)`;
    });
    
    window.addEventListener('mouseup', () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      isSwiping = false;
      if (currentX < -(maxSwipe * 0.4)) {
        openSwipe();
      } else {
        resetSwipe();
      }
    });
  }
};
