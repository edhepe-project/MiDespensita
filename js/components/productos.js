// Mis Productos component - Catálogo personal
APP_Pages.productos = async function() {
  const container = document.getElementById('app-content');
  const productos = await APP_DB.getAllProductos();

  // Si no hay productos, cargar la lista base
  if (productos.length === 0) {
    for (const item of APP_LISTA_BASE) {
      await APP_DB.addProducto({ ...item, activo: 1 });
    }
  }

  const todosProductos = await APP_DB.getAllProductos();

  // Obtener IDs de productos ya en la lista activa
  const lista = await APP_DB.getListaActiva();
  const itemsEnLista = await APP_DB.getItemsByLista(lista.id);
  const idsEnLista = new Set(
    itemsEnLista.filter(i => !i.comprado).map(i => i.productoId)
  );

  // Agrupar por categoría
  const porCategoria = {};
  for (const prod of todosProductos) {
    const cat = prod.categoria || 'otros';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(prod);
  }

  container.innerHTML = `
    <div class="card" id="search-card" style="position: sticky; top: 60px; z-index: 40; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); margin-bottom: 15px;">
      <div class="card-header">
        <span class="card-title">Mis Productos</span>
        <span class="text-secondary">${todosProductos.length}</span>
      </div>
      <div style="position: relative;">
        <input type="text" class="form-input" id="buscar-producto" placeholder="Buscar producto..." style="padding-right: 35px;">
        <span id="clear-search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer; display: none; padding: 5px; font-weight: bold; font-size: 16px; user-select: none;">✕</span>
      </div>
    </div>

    <div id="lista-productos">
      ${Object.entries(porCategoria).map(([cat, prods]) => `
        <div class="categoria-seccion">
          <div class="categoria-header">
            ${APP_CATEGORIAS[cat]?.icono || '📦'} ${APP_CATEGORIAS[cat]?.nombre || cat}
          </div>
          ${prods.map(p => renderProductoItem(p, idsEnLista.has(p.id))).join('')}
        </div>
      `).join('')}
    </div>

    <button class="fab" id="btn-nuevo">+</button>
  `;

  bindProductosEvents();
};

function renderProductoItem(producto, yaEnLista = false) {
  return `
    <div class="item-producto" data-id="${producto.id}" data-nombre="${producto.nombre.toLowerCase()}" data-producto-id="${producto.id}" data-producto-nombre="${producto.nombre}">
      <div class="item-info">
        <div class="item-nombre">${producto.nombre}</div>
        <div class="item-detalle" id="detalle-prod-${producto.id}">...</div>
      </div>
      <div class="item-acciones">
        <button class="btn btn-small ${yaEnLista ? 'btn-secondary' : 'btn-primary'} btn-agregar-lista btn-sin-longpress"
          data-id="${producto.id}" data-nombre="${producto.nombre}" data-unidad="${producto.unidad || 'pzas'}"
          style="${yaEnLista ? 'color: var(--green-600, #16a34a); font-weight: 700;' : ''}">
          ${yaEnLista ? '✓ En lista' : '+ Lista'}
        </button>
      </div>
    </div>
  `;
}

async function cargarDetallesProductos() {
  const items = document.querySelectorAll('.item-producto');
  for (const item of items) {
    const id = parseInt(item.dataset.id);
    const rango = await APP_DB.getRangoPrecios(id);
    const detalle = document.getElementById(`detalle-prod-${id}`);

    if (detalle && rango) {
      detalle.innerHTML = `
        <span class="marca-info">Marca: ${rango.ultimo.marca || '-'}</span>
        <span class="precio-info">Último: $${rango.ultimo.precio} ${rango.ultimo.tienda}</span>
      `;
    } else if (detalle) {
      detalle.innerHTML = '<span class="sin-precios">Sin compras aún</span>';
    }
  }
}

function bindProductosEvents() {
  // Cargar detalles en background
  cargarDetallesProductos();

  // Buscar
  const buscarInput = document.getElementById('buscar-producto');
  const clearBtn = document.getElementById('clear-search');

  buscarInput.addEventListener('input', (e) => {
    // Normalizar query (quitar acentos)
    const query = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Mostrar/ocultar la X
    clearBtn.style.display = query.length > 0 ? 'block' : 'none';
    
    // Filtrar productos
    document.querySelectorAll('.item-producto').forEach(el => {
      // Normalizar nombre del producto
      const nombre = el.dataset.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const mostrar = nombre.includes(query);
      
      const contenedor = el.parentElement.classList.contains('swipe-wrapper') ? el.parentElement : el;
      contenedor.style.display = mostrar ? '' : 'none';
    });

    // Ocultar categorías vacías
    document.querySelectorAll('.categoria-seccion').forEach(seccion => {
      const tieneVisibles = Array.from(seccion.querySelectorAll('.item-producto'))
                                 .some(el => {
                                   const contenedor = el.parentElement.classList.contains('swipe-wrapper') ? el.parentElement : el;
                                   return contenedor.style.display !== 'none';
                                 });
      seccion.style.display = tieneVisibles ? '' : 'none';
    });
  });

  // Limpiar búsqueda
  clearBtn.addEventListener('click', () => {
    buscarInput.value = '';
    buscarInput.dispatchEvent(new Event('input'));
    buscarInput.focus();
  });

  // Lógica de scroll para ocultar/mostrar búsqueda (Headroom)
  let lastScrollY = window.scrollY;
  const searchCard = document.getElementById('search-card');
  
  if (window.productosScrollHandler) {
    window.removeEventListener('scroll', window.productosScrollHandler);
  }
  
  window.productosScrollHandler = () => {
    if (!document.getElementById('search-card')) return;
    const currentScrollY = window.scrollY;
    
    if (currentScrollY > lastScrollY && currentScrollY > 120) {
      searchCard.style.transform = 'translateY(-150%)';
    } else {
      searchCard.style.transform = 'translateY(0)';
    }
    lastScrollY = currentScrollY;
  };
  
  window.addEventListener('scroll', window.productosScrollHandler);

  // Botones + Lista
  document.querySelectorAll('.btn-agregar-lista').forEach(btn => {
    btn.addEventListener('click', () => {
      const productoId = parseInt(btn.dataset.id);
      const nombre = btn.dataset.nombre;
      const unidad = btn.dataset.unidad || 'pzas';
      mostrarModalCantidad(productoId, nombre, btn, unidad);
    });
  });

  // Swipe actions en productos
  document.querySelectorAll('.item-producto').forEach(item => {
    APP_Swipe.configurar(item, {
      editar: {
        texto: 'Editar',
        accion: async () => {
          const productoId = parseInt(item.dataset.productoId);
          const producto = await APP_DB.getProducto(productoId);
          mostrarModalEditarProducto(producto);
        }
      },
      borrar: {
        texto: 'Borrar',
        confirmar: `¿Borrar "${item.dataset.productoNombre}" de tu lista local?`,
        accion: async () => {
          const productoId = parseInt(item.dataset.productoId);
          await APP_DB.updateProducto(productoId, { activo: 0 });
          APP_Pages.productos();
        }
      }
    });
  });

  // Nuevo producto
  document.getElementById('btn-nuevo').addEventListener('click', () => {
    mostrarModalNuevoProducto();
  });
}

function mostrarModalCantidad(productoId, nombre, btnElement, unidad = 'pzas') {
  const esFamiliar = !!(APP_Sync?.getCodigoFamilia && APP_Sync.getCodigoFamilia());

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">${nombre}</span>
        <button class="modal-close" id="cerrar-modal">×</button>
      </div>

      <div class="form-group">
        <label class="form-label">¿Cuántas necesitas?</label>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="number" inputmode="numeric" pattern="[0-9]*" class="form-input input-precio" id="input-cantidad" value="1" min="1" style="flex: 1;">
          <span style="color: var(--text-muted); font-size: var(--text-sm); min-width: 40px;">${unidad}</span>
        </div>
      </div>

      <button class="btn btn-primary" style="width:100%" id="btn-guardar">
        ${esFamiliar ? '👨‍👩‍👦 Agregar a lista familiar' : 'Agregar a mi lista'}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#cerrar-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#btn-guardar').addEventListener('click', async () => {
    const cantidad = parseInt(modal.querySelector('#input-cantidad').value) || 1;
    
    if (esFamiliar) {
      // Agregar al servidor en modo familiar
      const result = await APP_Sync.agregarItemLista(nombre, cantidad);
      if (!result?.success) {
        alert('Error: ' + (result?.error || 'No se pudo agregar a la lista familiar'));
        return;
      }
    } else {
      // Agregar local
      const lista = await APP_DB.getListaActiva();
      await APP_DB.addItem(lista.id, productoId, cantidad);
    }

    modal.remove();
    btnElement.textContent = '✓';
    setTimeout(() => { btnElement.textContent = '+ Lista'; }, 1500);
  });

  // Enter para guardar
  modal.querySelector('#input-cantidad').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      modal.querySelector('#btn-guardar').click();
    }
  });
}

function mostrarModalNuevoProducto() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">Nuevo Producto</span>
        <button class="modal-close" id="cerrar-modal">×</button>
      </div>

      <div class="form-group">
        <label class="form-label">Nombre</label>
        <input type="text" class="form-input" id="input-nombre" placeholder="Ej: Leche entera">
      </div>

      <div class="form-group">
        <label class="form-label">Categoría</label>
        <select class="form-select" id="input-categoria">
          ${Object.entries(APP_CATEGORIAS).map(([key, cat]) =>
            `<option value="${key}">${cat.icono} ${cat.nombre}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Unidad</label>
        <select class="form-select" id="input-unidad">
          ${APP_UNIDADES.map(u => `<option value="${u}">${u}</option>`).join('')}
        </select>
      </div>

      <button class="btn btn-primary" style="width:100%" id="btn-guardar">
        Guardar
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#cerrar-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#btn-guardar').addEventListener('click', async () => {
    const nombre = modal.querySelector('#input-nombre').value.trim();
    const categoria = modal.querySelector('#input-categoria').value;
    const unidad = modal.querySelector('#input-unidad').value;

    if (!nombre) { alert('Escribe un nombre'); return; }

    await APP_DB.addProducto({ nombre, categoria, unidad, activo: 1 });
    modal.remove();
    APP_Pages.productos();
  });
}

function mostrarModalEditarProducto(producto) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">Editar Producto</span>
        <button class="modal-close" id="cerrar-modal">×</button>
      </div>

      <div class="form-group">
        <label class="form-label">Nombre</label>
        <input type="text" class="form-input" id="input-nombre" value="${producto.nombre}">
      </div>

      <div class="form-group">
        <label class="form-label">Categoría</label>
        <select class="form-select" id="input-categoria">
          ${Object.entries(APP_CATEGORIAS).map(([key, cat]) =>
            `<option value="${key}" ${producto.categoria === key ? 'selected' : ''}>${cat.icono} ${cat.nombre}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Unidad</label>
        <select class="form-select" id="input-unidad">
          ${APP_UNIDADES.map(u => `<option value="${u}" ${producto.unidad === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
      </div>

      <button class="btn btn-primary" style="width:100%" id="btn-guardar">
        Guardar cambios
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#cerrar-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#btn-guardar').addEventListener('click', async () => {
    const nombre = modal.querySelector('#input-nombre').value.trim();
    const categoria = modal.querySelector('#input-categoria').value;
    const unidad = modal.querySelector('#input-unidad').value;

    if (!nombre) { alert('Escribe un nombre'); return; }

    await APP_DB.updateProducto(producto.id, { nombre, categoria, unidad });
    modal.remove();
    APP_Pages.productos();
  });
}
