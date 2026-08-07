// Tiendas component - Explorar productos por tienda y AdMob
APP_Pages.tiendas = async function() {
  const container = document.getElementById('app-content');
  
  // Estado de carga inicial
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: var(--text-secondary);">
      <div style="font-size: 40px; margin-bottom: 16px; animation: spin 2s linear infinite;">🔄</div>
      <h3>Buscando ofertas...</h3>
      <p style="font-size: 14px;">Comparando precios en supermercados</p>
    </div>
    <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
  `;

  let catalogo = [];
  let updateDate = "Desconocida";

  try {
    // Cargar todos los JSONs en paralelo (ahora incluye oferta_score)
    const jsons = ['ofertas_chedraui.json', 'ofertas_walmart.json', 'ofertas_bodega.json', 'ofertas_soriana.json', 'ofertas_lacomer.json', 'ofertas_sams.json'];
    
    const results = await Promise.allSettled(
      jsons.map(file => fetch(file).then(r => r.ok ? r.json() : []))
    );
    
    // Cargar scores de ofertas IA
    let ofertaScores = {};
    try {
      const rScore = await fetch('oferta_score.json');
      if (rScore.ok) {
        const dataScore = await rScore.json();
        ofertaScores = dataScore.scores || {};
        if (dataScore.generado) {
          updateDate = dataScore.generado;
        }
      }
    } catch(e) { console.log("Sin scores ML:", e) }

    const catalogos_tiendas = results.map(r => r.status === 'fulfilled' ? r.value : []);

    // Mezclar e intercalar para que no aparezcan todas las de una tienda juntas
    const maxLen = Math.max(...catalogos_tiendas.map(c => c.length));
    
    for (let i = 0; i < maxLen; i++) {
      for (const cat of catalogos_tiendas) {
        if (i < cat.length) {
          const prodInfo = cat[i];
          const scoreInfo = ofertaScores[prodInfo.producto.id] || null;
          prodInfo.ml_score = scoreInfo;
          catalogo.push(prodInfo);
        }
      }
    }
  } catch (e) {
    console.log("Error cargando ofertas:", e);
  }

  // 2. Si no hay scraping, usar base de datos local (Fallback)
  if (catalogo.length === 0) {
    const todosPrecios = await db.precios.toArray();
    const productosIds = [...new Set(todosPrecios.map(p => p.productoId))];
    const productos = await Promise.all(productosIds.map(id => db.productos.get(id)));
    
    catalogo = productos.filter(Boolean).map(prod => {
      const preciosProd = todosPrecios.filter(p => p.productoId === prod.id);
      const mejor = preciosProd.reduce((prev, curr) => (prev.precio < curr.precio ? prev : curr));
      return {
        producto: { id: prod.id, nombre: prod.nombre },
        precio: mejor.precio,
        tienda: mejor.tienda,
        imagen: "" // Local DB doesn't have images
      };
    });
  }

  // Si no hay nada, mostrar sugerencias aleatorias
  let productosHTML = '';
  if (catalogo.length > 0) {
    productosHTML = catalogo.map(data => renderCardCatalogo(data)).join('');
  } else {
    productosHTML = `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No se encontraron ofertas hoy.</div>`;
  }

  // Guardar catálogo en ventana para poder filtrarlo sin recargar
  window._catalogoActualHTML = productosHTML;
  window._catalogoDatos = catalogo;

  container.innerHTML = `
    <!-- BARRA DE BÚSQUEDA STICKY (mismo patrón que productos.js) -->
    <div id="tiendas-search-card" style="position: sticky; top: 60px; z-index: 40; background: var(--background); padding: 10px 0 6px 0; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); margin-bottom: 8px;">
      <div style="position: relative;">
        <input type="text" class="form-input" id="buscar-catalogo" placeholder="Buscar en todas las tiendas..." style="padding-right: 38px; width: 100%; box-sizing: border-box;">
        <span id="clear-buscar-catalogo" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer; display: none; padding: 5px; font-weight: bold; font-size: 16px; user-select: none;">✕</span>
      </div>
    </div>

    <!-- FILTROS -->
    <div style="padding: 0 0 10px 0;">
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; text-align: right;">
        Última actualización: ${updateDate}
      </div>
      <div style="display: flex; gap: 8px;">
        <select id="filtro-tienda" style="flex: 1; padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px;">
          <option value="todas">Todas las Tiendas</option>
          <option value="Walmart">Walmart</option>
          <option value="Sams">Sam's Club</option>
          <option value="Bodega Aurrerá">Bodega Aurrerá</option>
          <option value="Chedraui">Chedraui</option>
          <option value="Soriana">Soriana</option>
          <option value="La Comer">La Comer</option>
        </select>
        <select id="filtro-orden" style="flex: 1; padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px;">
          <option value="relevancia">Relevancia / IA</option>
          <option value="precio_menor">Menor Precio</option>
          <option value="precio_mayor">Mayor Precio</option>
          <option value="az">A-Z</option>
        </select>
      </div>
    </div>

    <!-- Contenedor Grid 2 Columnas -->
    <div id="catalogo-productos" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding-bottom: 40px; margin-top: 4px;">
      ${productosHTML}
    </div>
  `;

  bindTiendasEvents();
};

// =============================================
// FUNCIÓN COMPARTIDA: Renderiza una card del catálogo
// =============================================
function renderCardCatalogo(data) {
  const fotoHTML = data.imagen
    ? `<img src="${data.imagen}" alt="${data.producto.nombre}" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;">`
    : `<span style="font-size: 36px; opacity: 0.5;">🛒</span>`;

  const isOferta = data.ml_score && data.ml_score.es_oferta;
  const descuentoStr = isOferta ? `🔥 -${data.ml_score.descuento_pct}% IA` : '';
  const ofertaBadge = isOferta
    ? `<div style="position: absolute; top: 8px; right: 8px; background: var(--red-500); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${descuentoStr}</div>`
    : '';

  const dataStr = encodeURIComponent(JSON.stringify({
    id: data.producto.id,
    nombre: data.producto.nombre,
    precio: data.precio,
    tienda: data.tienda,
    imagen: data.imagen || '',
    url: data.url || '',
    es_oferta: isOferta,
    descuento_pct: data.ml_score ? data.ml_score.descuento_pct : 0
  }));

  return `
  <div class="tienda-producto-card"
    onclick="openProductoSheet('${dataStr}')"
    style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; position: relative; cursor: pointer; transition: transform 0.15s;"
    ontouchstart="this.style.transform='scale(0.97)'"
    ontouchend="this.style.transform='scale(1)'"
    onmousedown="this.style.transform='scale(0.97)'"
    onmouseup="this.style.transform='scale(1)'"
    onmouseleave="this.style.transform='scale(1)'">
    ${ofertaBadge}
    <div style="background: var(--gray-50); height: 120px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid var(--border);">
      ${fotoHTML}
    </div>
    <div style="padding: 10px; display: flex; flex-direction: column; flex: 1;">
      <div style="font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 8px; line-height: 1.2; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
        ${data.producto.nombre}
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 2px;">
        ${data.tienda}
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 10px;">
        <span style="color: var(--primary); font-weight: 800; font-size: 14px;">$${data.precio.toFixed(2)}</span>
      </div>
      <button class="btn btn-primary btn-add-tienda"
        data-id="${data.producto.id}"
        data-nombre="${data.producto.nombre}"
        data-precio="${data.precio}"
        data-tienda="${data.tienda}"
        onclick="event.stopPropagation()"
        style="width: 100%; border-radius: var(--radius-md); padding: 8px; font-weight: 600; font-size: 12px; display: flex; align-items: center; justify-content: center; margin-top: auto;">
        Añadir
      </button>
    </div>
  </div>`;
}

function renderCatalogoFiltrado() {

  const grid = document.getElementById('catalogo-productos');
  const filtroTienda = document.getElementById('filtro-tienda').value;
  const filtroOrden = document.getElementById('filtro-orden').value;
  const buscarInput = document.getElementById('buscar-catalogo');
  const queryRaw = buscarInput ? buscarInput.value.trim() : '';
  const query = queryRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (!grid || !window._catalogoDatos) return;
  
  let datos = [...window._catalogoDatos];
  
  // 1. Filtrar por tienda
  if (filtroTienda !== 'todas') {
    datos = datos.filter(d => d.tienda === filtroTienda);
  }

  // 2. Filtrar por búsqueda de texto
  if (query.length > 0) {
    datos = datos.filter(d => {
      const nombre = d.producto.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nombre.includes(query);
    });
  }
  
  // 3. Ordenar
  if (filtroOrden === 'precio_menor') {
    datos.sort((a, b) => a.precio - b.precio);
  } else if (filtroOrden === 'precio_mayor') {
    datos.sort((a, b) => b.precio - a.precio);
  } else if (filtroOrden === 'az') {
    datos.sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre));
  } else if (filtroOrden === 'relevancia') {
    // Ordenar primero ofertas IA
    datos.sort((a, b) => {
      const scoreA = (a.ml_score && a.ml_score.es_oferta) ? a.ml_score.score : 0;
      const scoreB = (b.ml_score && b.ml_score.es_oferta) ? b.ml_score.score : 0;
      return scoreB - scoreA; // mayor score IA primero
    });
  }

  // 3. Renderizar usando la función compartida
  const html = datos.map(data => renderCardCatalogo(data)).join('');
  
  grid.innerHTML = html || `<div style="padding: 20px; grid-column: span 2; text-align: center; color: var(--text-secondary);">No hay productos con esos filtros.</div>`;
  bindTiendasBotonesAñadir();
}

function bindTiendasEvents() {
  const selectTienda = document.getElementById('filtro-tienda');
  const selectOrden = document.getElementById('filtro-orden');
  const buscarInput = document.getElementById('buscar-catalogo');
  const clearBtn = document.getElementById('clear-buscar-catalogo');
  const searchCard = document.getElementById('tiendas-search-card');

  if (selectTienda) selectTienda.addEventListener('change', renderCatalogoFiltrado);
  if (selectOrden) selectOrden.addEventListener('change', renderCatalogoFiltrado);
  
  // Barra de búsqueda en tiempo real
  if (buscarInput) {
    buscarInput.addEventListener('input', () => {
      if (clearBtn) clearBtn.style.display = buscarInput.value.length > 0 ? 'block' : 'none';
      renderCatalogoFiltrado();
    });
  }
  
  // Botón X para limpiar
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      buscarInput.value = '';
      clearBtn.style.display = 'none';
      buscarInput.focus();
      renderCatalogoFiltrado();
    });
  }

  // Headroom: ocultar barra al hacer scroll hacia abajo
  if (window.tiendasScrollHandler) window.removeEventListener('scroll', window.tiendasScrollHandler);
  let lastScrollY = window.scrollY;
  window.tiendasScrollHandler = () => {
    if (!document.getElementById('tiendas-search-card')) return;
    const currentY = window.scrollY;
    if (currentY > lastScrollY && currentY > 80) {
      searchCard.style.transform = 'translateY(-150%)';
    } else {
      searchCard.style.transform = 'translateY(0)';
    }
    lastScrollY = currentY;
  };
  window.addEventListener('scroll', window.tiendasScrollHandler);

  bindTiendasBotonesAñadir();
}

function bindTiendasBotonesAñadir() {
  document.querySelectorAll('.btn-add-tienda').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nombreProd = btn.dataset.nombre;
      const precioRef  = parseFloat(btn.dataset.precio) || 0;
      const tiendaRef  = btn.dataset.tienda || '';
      mostrarModalCantidadTienda(nombreProd, precioRef, tiendaRef, btn);
    });
  });
}

// Modal para preguntar cantidad antes de añadir (sin teclado, con stepper)
async function mostrarModalCantidadTienda(nombreProd, precioRef, tiendaRef, btnOrigen) {
  const codigoFamilia = typeof APP_Sync !== 'undefined' ? APP_Sync.getCodigoFamilia() : null;
  const esFamiliar = !!codigoFamilia;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">${nombreProd}</span>
        <button class="modal-close" id="cerrar-modal-tienda">×</button>
      </div>

      <div class="form-group">
        <label class="form-label">¿Cuántas necesitas?</label>
        <div style="display: flex; align-items: center; justify-content: center; gap: 24px; padding: 16px; background: var(--gray-50); border-radius: 20px; border: 1px solid var(--border);">
          <button id="modal-qty-minus" style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--border); background: var(--surface); font-size: 26px; cursor: pointer; color: var(--text); display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent;">-</button>
          <div id="modal-qty-display" data-qty="1" style="width: 64px; text-align: center; font-size: 36px; font-weight: 900; color: var(--text);">1</div>
          <button id="modal-qty-plus" style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--primary); background: var(--primary); font-size: 26px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent;">+</button>
        </div>
      </div>

      <button class="btn btn-primary" style="width:100%" id="btn-guardar-tienda">
        ${esFamiliar ? '👨‍👩‍👦 Agregar a lista familiar' : 'Agregar a mi lista'}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const qtyDisplay = modal.querySelector('#modal-qty-display');

  modal.querySelector('#modal-qty-minus').addEventListener('click', () => {
    let q = parseInt(qtyDisplay.dataset.qty) || 1;
    if (q > 1) q--;
    qtyDisplay.dataset.qty = q;
    qtyDisplay.textContent = q;
  });
  modal.querySelector('#modal-qty-plus').addEventListener('click', () => {
    let q = parseInt(qtyDisplay.dataset.qty) || 1;
    q++;
    qtyDisplay.dataset.qty = q;
    qtyDisplay.textContent = q;
  });

  modal.querySelector('#cerrar-modal-tienda').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  const guardar = async () => {
    const btnGuardar = modal.querySelector('#btn-guardar-tienda');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Añadiendo...';
    
    const cantidad = parseInt(qtyDisplay.dataset.qty) || 1;

    // Guardar datos del catálogo para pre-rellenar el modal de compra
    localStorage.setItem('midespensita_catalogo_hint', JSON.stringify({
      tienda: tiendaRef,
      precio: precioRef,
      nombre: nombreProd,
      ts: Date.now()
    }));

    // Guardar badge de tienda por nombre de producto (para el módulo Comprar)
    const tiendaHints = JSON.parse(localStorage.getItem('midespensita_tienda_hints') || '{}');
    tiendaHints[nombreProd.toLowerCase()] = tiendaRef;
    localStorage.setItem('midespensita_tienda_hints', JSON.stringify(tiendaHints));

    // Buscar o crear producto
    let productosLocales = await APP_DB.searchProductos(nombreProd);
    let productoLocal = productosLocales.length > 0 ? productosLocales[0] : null;
    if (!productoLocal) {
      const nuevoId = await APP_DB.addProducto({ nombre: nombreProd, categoria: 'Otros', activo: 1, unidad: 'pieza', origen: 'catalogo' });
      productoLocal = await APP_DB.getProducto(nuevoId);
    }

    if (esFamiliar) {
      const result = await APP_Sync.agregarItemLista(productoLocal.nombre, cantidad);
      if (!result?.success) {
        alert('Error: ' + (result?.error || 'No se pudo agregar a la lista familiar'));
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Reintentar';
        return;
      }
    } else {
      const lista = await APP_DB.getListaActiva();
      await APP_DB.addItem(lista.id, productoLocal.id, cantidad);
    }

    modal.remove();
    
    if (btnOrigen) {
      btnOrigen.textContent = '✓ Añadido';
      btnOrigen.classList.remove('btn-primary');
      btnOrigen.classList.add('btn-secondary');
      btnOrigen.style.color = 'var(--green-600, #16a34a)';
      btnOrigen.style.fontWeight = '700';
      btnOrigen.disabled = true;
    }
  };

  modal.querySelector('#btn-guardar-tienda').addEventListener('click', guardar);
}

// =============================================
// BOTTOM SHEET: Detalle ampliado del Producto
// =============================================
window.openProductoSheet = function(dataStr) {
  const data = JSON.parse(decodeURIComponent(dataStr));
  
  // Eliminar sheet anterior si existe
  const existente = document.getElementById('producto-sheet-overlay');
  if (existente) existente.remove();

  const fotoHTML = data.imagen
    ? `<img src="${data.imagen}" alt="${data.nombre}" style="width: 180px; height: 180px; object-fit: contain;">`
    : `<span style="font-size: 80px;">🛒</span>`;
  
  const badgeHTML = data.es_oferta
    ? `<div style="display: inline-block; background: var(--red-500); color: white; padding: 5px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-bottom: 12px;">🔥 Oferta detectada por IA — -${data.descuento_pct}%</div><br>`
    : '';

  const overlay = document.createElement('div');
  overlay.id = 'producto-sheet-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 1000; display: flex; align-items: flex-end;
    animation: fadeInOverlay 0.2s ease;
  `;
  
  overlay.innerHTML = `
    <style>
      @keyframes slideUp      { from { transform: translateY(100%); } to  { transform: translateY(0); } }
      @keyframes slideDown    { from { transform: translateY(0); }    to  { transform: translateY(110%); } }
      @keyframes fadeInOverlay{ from { opacity: 0; } to { opacity: 1; } }
      #producto-sheet          { animation: slideUp 0.28s cubic-bezier(0.4,0,0.2,1) forwards; }
      #producto-sheet.closing  { animation: slideDown 0.22s cubic-bezier(0.4,0,0.2,1) forwards; }
    </style>
    <div id="producto-sheet" style="
      background: var(--surface);
      width: 100%; border-radius: 24px 24px 0 0;
      max-height: 92vh; overflow-y: auto;
      box-shadow: 0 -6px 40px rgba(0,0,0,0.18);
    ">
      <!-- Handle de arrastre -->
      <div style="display: flex; justify-content: center; padding: 14px 0 4px;">
        <div style="width: 40px; height: 4px; background: var(--border); border-radius: 2px;"></div>
      </div>

      <!-- Imagen grande centrada -->
      <div style="display: flex; justify-content: center; align-items: center; min-height: 200px; background: var(--gray-50); border-bottom: 1px solid var(--border); padding: 24px;">
        ${fotoHTML}
      </div>

      <!-- Info del producto -->
      <div style="padding: 22px 20px 8px;">
        ${badgeHTML}
        
        <!-- Nombre completo (sin clamp, se muestra todo) -->
        <h2 style="font-size: 20px; font-weight: 800; color: var(--text); margin: 0 0 8px; line-height: 1.4;">
          ${data.nombre}
        </h2>
        
        <!-- Tienda -->
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 18px; display: flex; align-items: center; gap: 6px;">
          🏪 ${data.tienda}
        </div>

        <!-- Precio grande -->
        <div style="font-size: 36px; font-weight: 900; color: var(--primary); margin-bottom: 24px; line-height: 1;">
          $${parseFloat(data.precio).toFixed(2)}
          <span style="font-size: 14px; font-weight: 400; color: var(--text-secondary); margin-left: 4px;">MXN</span>
        </div>

        <label style="font-size: 13px; font-weight: 600; color: var(--text); display: block; margin-bottom: 8px;">¿Cuántas necesitas?</label>
        <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-bottom: 24px; background: var(--gray-50); padding: 16px; border-radius: 20px; border: 1px solid var(--border);">
          <button id="sheet-qty-minus" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--border); background: var(--surface); font-size: 24px; cursor: pointer; color: var(--text); display: flex; align-items: center; justify-content: center;">-</button>
          <div id="sheet-qty-display" style="width: 60px; text-align: center; font-size: 32px; font-weight: 900; color: var(--text);" data-qty="1">1</div>
          <button id="sheet-qty-plus" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--border); background: var(--surface); font-size: 24px; cursor: pointer; color: var(--text); display: flex; align-items: center; justify-content: center;">+</button>
        </div>

        <!-- Botones -->
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <button id="sheet-btn-add" style="flex: 1; padding: 16px; background: var(--primary); color: white; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer;">
            Añadir a la lista
          </button>
        </div>
      </div>
    </div>
  `;

  // Cerrar al tocar el fondo oscuro
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeProductoSheet(overlay);
  });

  // Swipe hacia abajo para cerrar
  const sheet = overlay.querySelector('#producto-sheet');
  let startY = 0;
  sheet.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - startY > 80) closeProductoSheet(overlay);
  }, { passive: true });

  // Lógica de + y -
  const qtyDisplay = overlay.querySelector('#sheet-qty-display');
  overlay.querySelector('#sheet-qty-minus').addEventListener('click', () => {
    let q = parseInt(qtyDisplay.dataset.qty) || 1;
    if (q > 1) q--;
    qtyDisplay.dataset.qty = q;
    qtyDisplay.textContent = q;
  });
  overlay.querySelector('#sheet-qty-plus').addEventListener('click', () => {
    let q = parseInt(qtyDisplay.dataset.qty) || 1;
    q++;
    qtyDisplay.dataset.qty = q;
    qtyDisplay.textContent = q;
  });

  // Botón Añadir dentro del sheet
  overlay.querySelector('#sheet-btn-add').addEventListener('click', async () => {
    const btn = overlay.querySelector('#sheet-btn-add');
    btn.textContent = 'Añadiendo...';
    btn.disabled = true;
    
    const cantidad = parseInt(qtyDisplay.dataset.qty) || 1;

    // Guardar hint para comprar.js
    localStorage.setItem('midespensita_catalogo_hint', JSON.stringify({
      tienda: data.tienda,
      precio: data.precio,
      nombre: data.nombre,
      ts: Date.now()
    }));
    const tiendaHints = JSON.parse(localStorage.getItem('midespensita_tienda_hints') || '{}');
    tiendaHints[data.nombre.toLowerCase()] = data.tienda;
    localStorage.setItem('midespensita_tienda_hints', JSON.stringify(tiendaHints));

    // Guardar en DB
    let productosLocales = await APP_DB.searchProductos(data.nombre);
    let productoLocal = productosLocales.length > 0 ? productosLocales[0] : null;
    if (!productoLocal) {
      const nuevoId = await APP_DB.addProducto({ nombre: data.nombre, categoria: 'Otros', activo: 1, unidad: 'pieza', origen: 'catalogo' });
      productoLocal = await APP_DB.getProducto(nuevoId);
    }
    
    const codigoFamilia = typeof APP_Sync !== 'undefined' ? APP_Sync.getCodigoFamilia() : null;
    if (codigoFamilia) {
      await APP_Sync.agregarItemLista(productoLocal.nombre, cantidad);
    } else {
      const lista = await APP_DB.getListaActiva();
      await APP_DB.addItem(lista.id, productoLocal.id, cantidad);
    }

    btn.textContent = '✓ Añadido!';
    btn.style.background = 'var(--green-500)';
    
    // Cerrar el sheet después de un momento, sin navegar
    setTimeout(() => {
      closeProductoSheet(overlay);
    }, 700);
  });

  document.body.appendChild(overlay);
};

function closeProductoSheet(overlay) {
  const sheet = overlay.querySelector('#producto-sheet');
  if (sheet) sheet.classList.add('closing');
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 220);
}

