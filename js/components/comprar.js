// Comprar component - Pantalla principal
APP_Pages.comprar = async function() {
  const container = document.getElementById('app-content');

  // Detectar ubicación
  const ubicacion = await APP_DB.detectarUbicacion();
  document.getElementById('ubicacion-header').textContent = ubicacion.ciudad || 'Sin ubicación';

  document.getElementById('ubicacion-header').onclick = async () => {
    const ciudad = prompt('¿En qué ciudad estás?', ubicacion.ciudad || '');
    if (ciudad && ciudad.trim()) {
      await APP_DB.setUbicacion(ciudad.trim(), '');
      document.getElementById('ubicacion-header').textContent = ciudad.trim();
    }
  };

  // ¿Está en modo familiar?
  const codigoFamilia = APP_Sync?.getCodigoFamilia?.();

  if (codigoFamilia && navigator.onLine) {
    await renderListaFamiliar(container, codigoFamilia, ubicacion);
  } else if (codigoFamilia) {
    // Offline con familia: usar caché
    const cache = localStorage.getItem('midespensita_lista_familiar_cache');
    const items = cache ? JSON.parse(cache) : [];
    await renderListaFamiliar(container, codigoFamilia, ubicacion, items);
  } else {
    await renderListaLocal(container, ubicacion);
  }
};

// ─── MODO LISTA FAMILIAR (servidor) ───────────────────────────────────────────
async function renderListaFamiliar(container, codigo, ubicacion, itemsCache = null) {
  const stats = await APP_DB.getStatsByWeek();

  // Cargar precios regionales en paralelo sin bloquear
  let preciosRegionales = [];
  let origenPrecios = ubicacion?.ciudad || '';
  const preciosCache = localStorage.getItem('precios_regionales');
  if (preciosCache) { preciosRegionales = JSON.parse(preciosCache); origenPrecios = localStorage.getItem('precios_origen') || origenPrecios; }

  // Obtener lista del servidor (o caché offline)
  let items = itemsCache;
  if (items === null) {
    items = await APP_Sync.getListaFamiliar() || [];
  }

  const pendientes = items.filter(i => !i.comprado);
  const comprados  = items.filter(i => i.comprado);

  container.innerHTML = `
    <div class="familia-modo-badge">👨‍👩‍👦 Lista familiar</div>

    <div class="card stats-resumen">
      <div class="stat-row">
        <span class="stat-label">Pendientes</span>
        <span class="stat-value">${pendientes.length}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Ya comprados</span>
        <span class="stat-value">${comprados.length}</span>
      </div>
    </div>

    ${pendientes.length > 0 ? `
    <div class="section-title">Pendientes (${pendientes.length})</div>
    <div class="lista-compra">
      ${pendientes.map(item => renderItemFamiliar(item, false)).join('')}
    </div>
    ` : `
    <div class="empty-state">
      <div class="empty-state-icon">🛒</div>
      <p>La lista está vacía</p>
      <p class="text-secondary">Agrega productos con el botón +</p>
    </div>
    `}

    ${comprados.length > 0 ? `
    <div class="section-title">Comprados (${comprados.length})
      <button class="btn btn-secondary" id="btn-limpiar-comprados" style="font-size:11px;padding:4px 10px;float:right">🗑 Limpiar</button>
    </div>
    <div class="lista-compra">
      ${comprados.map(item => renderItemFamiliar(item, true)).join('')}
    </div>
    ` : ''}

    ${preciosRegionales.length > 0 ? `
    <div class="section-title">📍 Precios en ${origenPrecios}</div>
    <div class="card">
      <div class="precios-regionales">
        ${preciosRegionales.slice(0, 5).map(p => `
          <div class="precio-regional">
            <span class="precio-regional-nombre">${p.producto_nombre}</span>
            <span class="precio-regional-tienda">${p.tienda} - ${p.marca || ''}</span>
            <span class="precio-regional-valor">$${p.precio_promedio.toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <button class="fab" id="btn-agregar">+</button>
    ${pendientes.length > 0 ? `
    <button onclick="compartirListaWhatsApp()" style="
      position: fixed; bottom: 90px; right: 16px;
      background: #25d366; color: white; border: none;
      border-radius: 50px; padding: 10px 16px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      box-shadow: 0 4px 12px rgba(37,211,102,0.4);
      z-index: 100; display: flex; align-items: center; gap: 6px;
    ">📲 Compartir</button>
    ` : ''}
  `;

  bindListaFamiliarEvents(codigo);

  // Actualizar precios en segundo plano
  if (navigator.onLine && ubicacion?.ciudad) {
    APP_Sync.getPreciosCiudad(ubicacion.ciudad).then(data => {
      if (data.precios?.length) {
        localStorage.setItem('precios_regionales', JSON.stringify(data.precios));
        localStorage.setItem('precios_origen', data.origen || ubicacion.ciudad);
      }
    }).catch(() => {});
  }

  // Auto-refresh cada 30 s si hay internet
  let lastItemsStr = JSON.stringify(items);
  const refreshTimer = setInterval(async () => {
    if (!navigator.onLine || !document.getElementById('btn-agregar')) {
      clearInterval(refreshTimer);
      return;
    }
    const nuevos = await APP_Sync.getListaFamiliar();
    if (nuevos !== null) {
      const nuevosStr = JSON.stringify(nuevos);
      if (nuevosStr !== lastItemsStr) {
        lastItemsStr = nuevosStr;
        const pendientesCont = document.querySelector('.lista-compra');
        // Solo re-render si estamos en la vista de compras
        if (pendientesCont || document.querySelector('.empty-state')) {
          APP_Pages.comprar(); // re-render completo
        }
      }
    }
  }, 30000);
}

function renderItemFamiliar(item, esComprado) {
  return `
    <div class="item-compra ${esComprado ? 'comprado' : 'pendiente'}"
         data-familia-id="${item.id}"
         data-cantidad="${item.cantidad}"
         data-item-nombre="${item.nombre_producto}">
      <div class="item-main">
        <div class="${esComprado ? 'item-check' : 'item-icon'}">
          ${esComprado ? '✓' : '🛒'}
        </div>
        <div class="item-info">
          <div class="item-nombre">${item.nombre_producto}</div>
          <div class="item-detalle" id="detalle-fam-${item.id}" style="font-size:11px;color:var(--text-muted)">
            ${esComprado ? 'Ya comprado' : 'x' + item.cantidad}
          </div>
        </div>
      </div>
      ${!esComprado ? `
        <button class="btn btn-primary btn-familia-comprar btn-sin-longpress"
          data-id="${item.id}" data-nombre="${item.nombre_producto}">
          ✓ Listo
        </button>
      ` : ''}
    </div>
  `;
}

async function cargarDetallesPreciosFamiliar() {
  const items = document.querySelectorAll('.item-compra.pendiente[data-item-nombre]');
  if (items.length === 0) return;
  const productos = await APP_DB.getAllProductos();
  
  for (const item of items) {
    const nombre = item.dataset.itemNombre;
    const familiaId = item.dataset.familiaId;
    const cantidad = item.dataset.cantidad || 1;
    
    const productoLocal = productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
    
    if (productoLocal) {
      const rango = await APP_DB.getRangoPrecios(productoLocal.id);
      const detalle = document.getElementById(`detalle-fam-${familiaId}`);
      if (detalle && rango) {
        detalle.innerHTML = `
          <span>x${cantidad}</span> | 
          <span style="color:var(--primary); font-weight: 500">$${rango.min} - $${rango.max}</span> | 
          <span>Último: $${rango.ultimo.precio}</span>
        `;
      }
    }
  }
}

function bindListaFamiliarEvents(codigo) {
  // Cargar detalles de precios localmente
  cargarDetallesPreciosFamiliar();

  // Marcar como comprado
  document.querySelectorAll('.btn-familia-comprar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      btn.textContent = '...';
      btn.disabled = true;
      await APP_Sync.marcarCompradoLista(id, true);
      APP_Pages.comprar();
    });
  });

  // Limpiar comprados
  document.getElementById('btn-limpiar-comprados')?.addEventListener('click', async () => {
    if (confirm('¿Limpiar todos los productos ya comprados?')) {
      await APP_Sync.limpiarListaComprados();
      APP_Pages.comprar();
    }
  });

  // Swipe para borrar ítems de la lista
  document.querySelectorAll('.item-compra').forEach(item => {
    APP_Swipe.configurar(item, {
      borrar: {
        texto: 'Quitar',
        confirmar: `¿Quitar "${item.dataset.itemNombre}" de la lista?`,
        accion: async () => {
          const id = parseInt(item.dataset.familiaId);
          await APP_Sync.borrarItemLista(id);
          APP_Pages.comprar();
        }
      }
    });
  });

  // Botón + → pedir nombre del producto
  document.getElementById('btn-agregar').addEventListener('click', () => {
    mostrarModalAgregarFamiliar();
  });
}

async function mostrarModalAgregarFamiliar() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">Agregar a la lista</span>
        <button class="modal-close" id="cerrar-modal">×</button>
      </div>
      <div class="form-group">
        <label class="form-label">Producto</label>
        <input type="text" class="form-input" id="input-nombre-familiar"
          placeholder="Ej: Leche, Huevos, Pan..." autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Cantidad</label>
        <input type="number" class="form-input" id="input-cantidad-familiar" value="1" min="1">
      </div>
      <button class="btn btn-primary" style="width:100%" id="btn-guardar-familiar">Agregar</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#cerrar-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const guardar = async () => {
    const nombre = modal.querySelector('#input-nombre-familiar').value.trim();
    const cantidad = parseInt(modal.querySelector('#input-cantidad-familiar').value) || 1;
    if (!nombre) { alert('Escribe el nombre del producto'); return; }
    const result = await APP_Sync.agregarItemLista(nombre, cantidad);
    if (result?.success) {
      modal.remove();
      APP_Pages.comprar();
    } else {
      alert('Error: ' + (result?.error || 'No se pudo agregar'));
    }
  };

  modal.querySelector('#btn-guardar-familiar').addEventListener('click', guardar);
  modal.querySelector('#input-nombre-familiar').addEventListener('keydown', e => {
    if (e.key === 'Enter') guardar();
  });
}

// ─── MODO LISTA LOCAL (sin familia) ───────────────────────────────────────────
async function renderListaLocal(container, ubicacion) {
  const lista = await APP_DB.getListaActiva();
  const items = await APP_DB.getItemsByLista(lista.id);
  const comprados  = items.filter(i => i.comprado);
  const stats = await APP_DB.getStatsByWeek();

  // Orden lógico por categoría (como caminar por el super)
  const ORDEN_CATEGORIAS = [
    'frutas_verduras', 'lacteos', 'carnes', 'panaderia',
    'congelados', 'abarrotes', 'bebidas', 'limpieza', 'higiene', 'otros'
  ];
  const pendientes = items
    .filter(i => !i.comprado)
    .sort((a, b) => {
      const catA = ORDEN_CATEGORIAS.indexOf(a.producto?.categoria || 'otros');
      const catB = ORDEN_CATEGORIAS.indexOf(b.producto?.categoria || 'otros');
      return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
    });

  // Presupuesto semanal
  const presupuesto = parseFloat(localStorage.getItem('midespensita_presupuesto_semana') || '0');
  const porcentaje  = presupuesto > 0 ? Math.min((stats.total / presupuesto) * 100, 100) : 0;
  const colorBarra  = porcentaje >= 90 ? '#ef4444' : porcentaje >= 70 ? '#f59e0b' : '#22c55e';

  let preciosRegionales = [];
  let origenPrecios = ubicacion?.ciudad || '';
  if (navigator.onLine && ubicacion?.ciudad && APP_Sync) {
    try {
      const data = await APP_Sync.getPreciosCiudad(ubicacion.ciudad);
      preciosRegionales = data.precios || [];
      origenPrecios = data.origen || ubicacion.ciudad;
      localStorage.setItem('precios_regionales', JSON.stringify(preciosRegionales));
      localStorage.setItem('precios_origen', origenPrecios);
    } catch (e) {}
  } else {
    const cache = localStorage.getItem('precios_regionales');
    const cacheOrigen = localStorage.getItem('precios_origen');
    if (cache) { preciosRegionales = JSON.parse(cache); origenPrecios = cacheOrigen || origenPrecios; }
  }

  // Agrupar pendientes por categoría para mostrarlos en secciones
  const pendientesPorCat = {};
  for (const item of pendientes) {
    const cat = item.producto?.categoria || 'otros';
    if (!pendientesPorCat[cat]) pendientesPorCat[cat] = [];
    pendientesPorCat[cat].push(item);
  }

  container.innerHTML = `
    <div class="card stats-resumen">
      <div class="stat-row">
        <span class="stat-label">Gastado esta semana</span>
        <span class="stat-value">${APP_Format.money(stats.total)}</span>
      </div>
      ${presupuesto > 0 ? `
      <div style="margin-top: 8px">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:4px">
          <span>Presupuesto</span>
          <span>${APP_Format.money(stats.total)} / ${APP_Format.money(presupuesto)}</span>
        </div>
        <div style="background:var(--surface-2); border-radius:99px; height:8px; overflow:hidden">
          <div style="width:${porcentaje}%; background:${colorBarra}; height:100%; border-radius:99px; transition:width 0.5s ease"></div>
        </div>
        ${porcentaje >= 90 ? `<p style="font-size:11px; color:#ef4444; margin-top:4px">⚠️ ¡Casi al límite del presupuesto!</p>` : ''}
      </div>
      ` : `
      <div style="font-size:11px; color:var(--text-muted); margin-top:6px; text-align:right">
        <span onclick="window.location.hash='#config'" style="cursor:pointer; text-decoration:underline">+ Establecer presupuesto</span>
      </div>
      `}
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-label">Artículos comprados</span>
        <span class="stat-value">${stats.totalArticulos}</span>
      </div>
    </div>

    ${pendientes.length > 0 ? `
    <div class="section-title">Pendientes (${pendientes.length})</div>
    ${Object.entries(pendientesPorCat).map(([cat, catItems]) => `
      <div style="margin-bottom:4px">
        <div style="font-size:11px; color:var(--text-muted); padding: 4px 4px 2px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase">
          ${APP_CATEGORIAS[cat]?.icono || '📦'} ${APP_CATEGORIAS[cat]?.nombre || cat}
        </div>
        <div class="lista-compra">
          ${catItems.map(item => renderPendiente(item)).join('')}
        </div>
      </div>
    `).join('')}
    ` : comprados.length > 0 ? `
    <div class="card" style="text-align:center; padding: 24px; background: linear-gradient(135deg, #dcfce7, #f0fdf4); border: 1px solid #86efac">
      <div style="font-size:48px; margin-bottom:12px">🎉</div>
      <div style="font-weight:700; font-size:18px; color:#16a34a; margin-bottom:6px">¡Lista completada!</div>
      <div style="font-size:14px; color:#15803d; margin-bottom:16px">Compraste ${comprados.length} producto${comprados.length > 1 ? 's' : ''} por ${APP_Format.money(stats.total)}</div>
      <button class="btn btn-primary" id="btn-nueva-semana-ticket" style="background:#16a34a; border-color:#16a34a">
        ✓ Limpiar y empezar nueva compra
      </button>
    </div>
    ` : `
    <div class="empty-state">
      <div class="empty-state-icon">🛒</div>
      <p>Tu lista está vacía</p>
      <p class="text-secondary">Agrega productos desde "Mis Productos"</p>
    </div>
    `}

    ${comprados.length > 0 ? `
    <div class="section-title">Comprados (${comprados.length})
      <button class="btn btn-secondary" id="btn-nueva-semana" style="font-size:11px;padding:4px 10px;float:right">🗑 Limpiar</button>
    </div>
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
            <span class="precio-regional-muestras">${p.num_muestras} compra${p.num_muestras > 1 ? 's' : ''}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <button class="fab" id="btn-agregar">+</button>
    ${pendientes.length > 0 ? `
    <button onclick="compartirListaWhatsApp()" style="
      position: fixed; bottom: 90px; right: 16px;
      background: #25d366; color: white; border: none;
      border-radius: 50px; padding: 10px 16px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      box-shadow: 0 4px 12px rgba(37,211,102,0.4);
      z-index: 100; display: flex; align-items: center; gap: 6px;
    ">📲 Compartir</button>
    ` : ''}
  `;

  bindComprarEvents();
}


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
          <div class="item-detalle" id="detalle-comprado-${item.id}">Ya comprado</div>
        </div>
      </div>
      <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px" 
        onclick="deshacerComprado(${item.id})">Deshacer</button>
    </div>
  `;
}

// Deshacer: volver un item comprado a pendiente
async function deshacerComprado(itemId) {
  await APP_DB.updateItem(itemId, { comprado: false });
  APP_Pages.comprar();
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

  // Limpiar comprados (modo local) — botón en cabecera de sección
  document.getElementById('btn-nueva-semana')?.addEventListener('click', async () => {
    if (confirm('¿Limpiar todos los productos ya comprados de la lista?')) {
      const lista = await APP_DB.getListaActiva();
      const items = await APP_DB.getItemsByLista(lista.id);
      for (const item of items.filter(i => i.comprado)) {
        await APP_DB.removeItem(item.id);
      }
      APP_Pages.comprar();
    }
  });

  // Botón en ticket de ¡Lista completada!
  document.getElementById('btn-nueva-semana-ticket')?.addEventListener('click', async () => {
    const lista = await APP_DB.getListaActiva();
    const items = await APP_DB.getItemsByLista(lista.id);
    for (const item of items.filter(i => i.comprado)) {
      await APP_DB.removeItem(item.id);
    }
    APP_Pages.comprar();
  });

  // Botón comprar
  document.querySelectorAll('.btn-comprar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const nombre = btn.dataset.nombre;
      mostrarModalCompra(id, nombre);
    });
  });

  // Swipe actions en items de la lista
  document.querySelectorAll('.item-compra').forEach(item => {
    APP_Swipe.configurar(item, {
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
    <div class="modal-content modal-compact">
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
          <input type="number" inputmode="decimal" pattern="[0-9]*" class="form-input input-presentacion" id="input-presentacion" placeholder="1" step="0.1" min="0.1" value="1">
          <span class="input-unit">${unidad}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Precio</label>
        <input type="number" inputmode="decimal" pattern="[0-9]*" class="form-input input-precio" id="input-precio" placeholder="0.00" step="0.50" min="0">
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

  // Enter en precio guarda
  modal.querySelector('#input-precio').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      modal.querySelector('#btn-guardar-compra').click();
    }
  });

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

    // Marcar como comprado (queda visible en sección "Ya comprados")
    await APP_DB.updateItem(itemId, { comprado: true });

    modal.remove();
    APP_Pages.comprar();
  });
}
