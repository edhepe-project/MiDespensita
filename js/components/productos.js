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

  // Agrupar por categoría
  const porCategoria = {};
  for (const prod of todosProductos) {
    const cat = prod.categoria || 'otros';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(prod);
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Mis Productos</span>
        <span class="text-secondary">${todosProductos.length}</span>
      </div>
      <input type="text" class="form-input" id="buscar-producto" placeholder="Buscar producto...">
    </div>

    <div id="lista-productos">
      ${Object.entries(porCategoria).map(([cat, prods]) => `
        <div class="categoria-seccion">
          <div class="categoria-header">
            ${APP_CATEGORIAS[cat]?.icono || '📦'} ${APP_CATEGORIAS[cat]?.nombre || cat}
          </div>
          ${prods.map(p => renderProductoItem(p)).join('')}
        </div>
      `).join('')}
    </div>

    <button class="fab" id="btn-nuevo">+</button>
  `;

  bindProductosEvents();
};

function renderProductoItem(producto) {
  return `
    <div class="item-producto" data-id="${producto.id}" data-nombre="${producto.nombre.toLowerCase()}" data-producto-id="${producto.id}" data-producto-nombre="${producto.nombre}">
      <div class="item-info">
        <div class="item-nombre">${producto.nombre}</div>
        <div class="item-detalle" id="detalle-prod-${producto.id}">...</div>
      </div>
      <div class="item-acciones">
        <button class="btn btn-small btn-primary btn-agregar-lista btn-sin-longpress" data-id="${producto.id}" data-nombre="${producto.nombre}">
          + Lista
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
  document.getElementById('buscar-producto').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.item-producto').forEach(el => {
      const nombre = el.dataset.nombre;
      el.style.display = nombre.includes(query) ? '' : 'none';
    });
  });

  // Agregar a lista
  document.querySelectorAll('.btn-agregar-lista').forEach(btn => {
    btn.addEventListener('click', async () => {
      const productoId = parseInt(btn.dataset.id);
      const nombre = btn.dataset.nombre;
      mostrarModalCantidad(productoId, nombre, btn);
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

function mostrarModalCantidad(productoId, nombre, btnElement) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content modal-compact">
      <div class="modal-header">
        <span class="modal-title">${nombre}</span>
        <button class="modal-close" id="cerrar-modal">×</button>
      </div>

      <div class="form-group">
        <label class="form-label">¿Cuántas necesitas?</label>
        <input type="number" inputmode="numeric" pattern="[0-9]*" class="form-input input-precio" id="input-cantidad" value="1" min="1">
      </div>

      <button class="btn btn-primary" style="width:100%" id="btn-guardar">
        Agregar a mi lista
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#cerrar-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#btn-guardar').addEventListener('click', async () => {
    const cantidad = parseInt(modal.querySelector('#input-cantidad').value) || 1;
    const lista = await APP_DB.getListaActiva();
    await APP_DB.addItem(lista.id, productoId, cantidad);

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
