// Comprar component - Pantalla principal
APP_Pages.comprar = async function() {
  const container = document.getElementById('app-content');

  // Detectar ubicación
  const ubicacion = await APP_DB.detectarUbicacion();
  document.getElementById('ubicacion-header').textContent = ubicacion.ciudad || 'Sin ubicación';

  // Permitir cambiar ubicación al tocar
  document.getElementById('ubicacion-header').onclick = async () => {
    const ciudad = prompt('¿En qué ciudad estás?', ubicacion.ciudad || '');
    if (ciudad && ciudad.trim()) {
      await APP_DB.setUbicacion(ciudad.trim(), '');
      document.getElementById('ubicacion-header').textContent = ciudad.trim();
    }
  };

  // Obtener lista activa
  const lista = await APP_DB.getListaActiva();
  const items = await APP_DB.getItemsByLista(lista.id);
  const pendientes = items.filter(i => !i.comprado);
  const comprados = items.filter(i => i.comprado);

  // Calcular stats de la semana (lunes a domingo)
  const stats = await APP_DB.getStatsByWeek();

  // Obtener precios regionales del servidor
  let preciosRegionales = [];
  let origenPrecios = '';
  if (navigator.onLine && ubicacion?.ciudad && APP_Sync) {
    try {
      const data = await APP_Sync.getPreciosCiudad(ubicacion.ciudad);
      preciosRegionales = data.precios || [];
      origenPrecios = data.origen || ubicacion.ciudad;
    } catch (e) {}
  }

  container.innerHTML = `
    <div class="card stats-resumen">
      <div class="stat-row">
        <span class="stat-label">Gastado esta semana</span>
        <span class="stat-value">${APP_Format.money(stats.total)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Artículos comprados</span>
        <span class="stat-value">${stats.totalArticulos}</span>
      </div>
    </div>

    ${pendientes.length > 0 ? `
    <div class="section-title">Pendientes (${pendientes.length})</div>
    <div class="lista-compra">
      ${pendientes.map(item => renderPendiente(item)).join('')}
    </div>
    ` : `
    <div class="empty-state">
      <div class="empty-state-icon">🛒</div>
      <p>Tu lista está vacía</p>
      <p class="text-secondary">Agrega productos desde "Mis Productos"</p>
    </div>
    `}

    ${comprados.length > 0 ? `
    <div class="section-title">Comprados (${comprados.length})</div>
    <div class="lista-compra">
      ${comprados.map(item => renderComprado(item)).join('')}
    </div>
    ` : ''}

    ${preciosRegionales.length > 0 ? `
    <div class="section-title">📍 Precios en ${origenPrecios || ubicacion?.ciudad || 'tu ciudad'}</div>
    <div class="card">
      <p class="text-secondary" style="font-size: var(--text-xs); margin-bottom: 12px">
        ${origenPrecios !== ubicacion?.ciudad ? 'Precios de zona cercana' : 'Otros usuarios encontraron estos precios'}
      </p>
      <div class="precios-regionales">
        ${preciosRegionales.slice(0, 5).map(p => `
          <div class="precio-regional">
            <span class="precio-regional-nombre">${p.producto_nombre}</span>
            <span class="precio-regional-tienda">${p.tienda} - ${p.marca || ''}</span>
            <span class="precio-regional-valor">$${p.precio_promedio.toFixed(2)}</span>
            <span class="precio-regional-muestras">${p.num_muestras} datos</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <button class="fab" id="btn-agregar">+</button>
  `;

  bindComprarEvents();
};

function renderPendiente(item) {
  const cat = APP_CATEGORIAS[item.producto?.categoria] || APP_CATEGORIAS.otros;
  return `
    <div class="item-compra pendiente" data-id="${item.id}" data-item-id="${item.id}" data-item-nombre="${item.producto?.nombre || 'Sin nombre'}" data-producto-id="${item.productoId}">
      <div class="item-main">
        <div class="item-icon">${cat.icono}</div>
        <div class="item-info">
          <div class="item-nombre">${item.producto?.nombre || 'Sin nombre'}</div>
          <div class="item-detalle" id="detalle-${item.id}">Cargando precios...</div>
        </div>
      </div>
      <div class="item-cantidad">x${item.cantidad}</div>
      <button class="btn btn-primary btn-comprar btn-sin-longpress" data-id="${item.id}" data-nombre="${item.producto?.nombre}">
        Comprar
      </button>
    </div>
  `;
}

function renderComprado(item) {
  const cat = APP_CATEGORIAS[item.producto?.categoria] || APP_CATEGORIAS.otros;
  return `
    <div class="item-compra comprado" data-id="${item.id}" data-item-id="${item.id}" data-item-nombre="${item.producto?.nombre || 'Sin nombre'}" data-producto-id="${item.productoId}">
      <div class="item-main">
        <div class="item-check">✓</div>
        <div class="item-info">
          <div class="item-nombre">${item.producto?.nombre || 'Sin nombre'}</div>
          <div class="item-detalle">Ya comprado</div>
        </div>
      </div>
    </div>
  `;
}

async function cargarDetallesPrecios() {
  const items = document.querySelectorAll('.pendiente');
  for (const item of items) {
    const id = parseInt(item.dataset.id);
    const lista = await APP_DB.getListaActiva();
    const itemsLista = await APP_DB.getItemsByLista(lista.id);
    const itemData = itemsLista.find(i => i.id === id);

    if (itemData?.producto) {
      const rango = await APP_DB.getRangoPrecios(itemData.productoId);
      const detalle = document.getElementById(`detalle-${id}`);

      if (detalle && rango) {
        detalle.innerHTML = `
          <span class="rango-precio">$${rango.min} - $${rango.max}</span>
          <span class="ultimo-precio">Último: $${rango.ultimo.precio} ${rango.ultimo.tienda}</span>
        `;
      } else if (detalle) {
        detalle.innerHTML = '<span class="sin-precios">Sin compras anteriores</span>';
      }
    }
  }
}

function bindComprarEvents() {
  // Cargar detalles de precios en background
  cargarDetallesPrecios();

  // Botón comprar
  document.querySelectorAll('.btn-comprar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const nombre = btn.dataset.nombre;
      mostrarModalCompra(id, nombre);
    });
  });

  // Long press en items de la lista
  document.querySelectorAll('.item-compra').forEach(item => {
    APP_LongPress.configurar(item, {
      editar: {
        texto: 'Editar',
        accion: async () => {
          const itemId = parseInt(item.dataset.itemId);
          const nombre = item.dataset.itemNombre;
          mostrarModalEditarCantidad(itemId, nombre);
        }
      },
      borrar: {
        texto: 'Quitar',
        confirmar: `¿Quitar "${item.dataset.itemNombre}"?`,
        accion: async () => {
          const itemId = parseInt(item.dataset.itemId);
          await APP_DB.removeItem(itemId);
          APP_Pages.comprar();
        }
      }
    });
  });

  // Botón agregar
  document.getElementById('btn-agregar').addEventListener('click', () => {
    window.location.hash = '#productos';
  });
}

async function mostrarModalEditarCantidad(itemId, nombreProducto) {
  const lista = await APP_DB.getListaActiva();
  const items = await APP_DB.getItemsByLista(lista.id);
  const item = items.find(i => i.id === itemId);

  if (!item) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">Editar cantidad</span>
        <button class="modal-close" id="cerrar-modal">×</button>
      </div>

      <div class="modal-producto">${nombreProducto}</div>

      <div class="form-group">
        <label class="form-label">Cantidad</label>
        <input type="number" class="form-input input-precio" id="input-cantidad" value="${item.cantidad}" min="1">
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
    const cantidad = parseInt(modal.querySelector('#input-cantidad').value) || 1;
    await APP_DB.updateItem(itemId, { cantidad });
    modal.remove();
    APP_Pages.comprar();
  });
}

async function mostrarModalCompra(itemId, nombreProducto) {
  const lista = await APP_DB.getListaActiva();
  const items = await APP_DB.getItemsByLista(lista.id);
  const item = items.find(i => i.id === itemId);

  // Obtener unidad del producto
  const producto = await APP_DB.getProducto(item.productoId);
  const unidad = producto?.unidad || 'pieza';

  // Obtener sugerencias
  const tiendasUsadas = await APP_DB.getTiendasByProducto(item.productoId);
  const marcasUsadas = await APP_DB.getMarcasByProducto(item.productoId);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">Registrar compra</span>
        <button class="modal-close" id="cerrar-modal">×</button>
      </div>

      <div class="modal-producto">${nombreProducto}</div>

      <div class="form-group">
        <label class="form-label">Tienda</label>
        <input type="text" class="form-input" id="input-tienda" placeholder="Ej: Walmart" autocomplete="off" list="sugerencias-tienda">
        <datalist id="sugerencias-tienda">
          ${tiendasUsadas.map(t => `<option value="${t}">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label">Marca</label>
        <input type="text" class="form-input" id="input-marca" placeholder="Ej: Lala" autocomplete="off" list="sugerencias-marca">
        <datalist id="sugerencias-marca">
          ${marcasUsadas.map(m => `<option value="${m}">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label">Presentación</label>
        <div class="input-with-unit">
          <input type="number" class="form-input input-presentacion" id="input-presentacion" placeholder="1" step="0.1" min="0.1" value="1">
          <span class="input-unit">${unidad}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Precio</label>
        <input type="number" class="form-input input-precio" id="input-precio" placeholder="0.00" step="0.50" min="0">
      </div>

      <button class="btn btn-primary" style="width:100%" id="btn-guardar-compra">
        Guardar
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // Eventos
  modal.querySelector('#cerrar-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#btn-guardar-compra').addEventListener('click', async () => {
    const tienda = modal.querySelector('#input-tienda').value.trim();
    const marca = modal.querySelector('#input-marca').value.trim();
    const precio = parseFloat(modal.querySelector('#input-precio').value);
    const cantidadPresentacion = parseFloat(modal.querySelector('#input-presentacion').value) || 1;
    const presentacion = `${cantidadPresentacion}${unidad}`;

    if (!tienda) { alert('Escribe la tienda'); return; }
    if (!precio || precio <= 0) { alert('Escribe un precio válido'); return; }

    const lista = await APP_DB.getListaActiva();
    const itemsLista = await APP_DB.getItemsByLista(lista.id);
    const itemData = itemsLista.find(i => i.id === itemId);

    // Registrar compra
    await APP_DB.addCompra({
      tienda,
      total: precio * (itemData?.cantidad || 1),
      productos: [{
        productoId: itemData.productoId,
        cantidad: itemData?.cantidad || 1,
        marca,
        presentacion,
        precioUnitario: precio
      }]
    });

    // Marcar item como comprado y eliminar
    await APP_DB.removeItem(itemId);

    modal.remove();
    APP_Pages.comprar();
  });
}
