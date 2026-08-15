// Tiendas component - Explorar productos por tienda y AdMob
APP_Pages.tiendas = async function() {
  const container = document.getElementById('app-content');
  
  // Estado de carga inicial
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center;">
      <div style="position:relative; width: 64px; height: 64px; margin-bottom: 24px;">
        <svg viewBox="0 0 100 100" style="width:100%; height:100%; animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;">
          <circle cx="50" cy="50" r="40" stroke="var(--orange-100)" stroke-width="8" fill="none" />
          <circle cx="50" cy="50" r="40" stroke="var(--primary)" stroke-width="8" fill="none" stroke-dasharray="200" stroke-dashoffset="140" stroke-linecap="round" />
        </svg>
        <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--primary);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
      </div>
      <h3 style="color:var(--text); font-weight:700; margin-bottom:8px; font-size:18px;">Buscando ofertas...</h3>
      <p style="font-size: 14px; color:var(--text-muted);">Analizando catálogos en tiempo real</p>
    </div>
    <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
  `;

  let catalogo = [];
  let updateDate = "Desconocida";

  // --- CACHÉ DE SESIÓN: evitar re-descargar 5+ MB en cada visita ---
  const SESSION_KEY = 'catalogo_global_dia';
  const cached = sessionStorage.getItem(SESSION_KEY);
  
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      catalogo = parsed.data;
      updateDate = parsed.updateDate || "Hoy";
    } catch(e) { sessionStorage.removeItem(SESSION_KEY); }
  }

  if (catalogo.length === 0) {
    try {
      const jsons = ['ofertas_chedraui.json', 'ofertas_walmart.json', 'ofertas_bodega.json', 'ofertas_soriana.json', 'ofertas_lacomer.json', 'ofertas_sams.json', 'ofertas_farmagdl.json', 'ofertas_fahorro.json', 'ofertas_lores.json'];
      
      const cacheBuster = `?d=${new Date().toISOString().slice(0,10)}`; // Cambiar por día para no re-descargar en cada visita
      const results = await Promise.allSettled(
        jsons.map(file => fetch(`${file}${cacheBuster}`).then(r => r.ok ? r.json() : []))
      );
      
      // Cargar scores de ofertas IA en paralelo
      let ofertaScores = {};
      try {
        const rScore = await fetch(`oferta_score.json${cacheBuster}`);
        if (rScore.ok) {
          const dataScore = await rScore.json();
          ofertaScores = dataScore.scores || {};
          if (dataScore.generado) updateDate = dataScore.generado;
        }
      } catch(e) { console.log("Sin scores ML:", e) }

      const catalogos_tiendas = results.map(r => r.status === 'fulfilled' ? r.value : []);
      const maxLen = Math.max(...catalogos_tiendas.map(c => c.length));
      
      for (let i = 0; i < maxLen; i++) {
        for (const cat of catalogos_tiendas) {
          if (i < cat.length) {
            const prodInfo = cat[i];
            prodInfo.ml_score = ofertaScores[prodInfo.producto.id] || null;
            catalogo.push(prodInfo);
          }
        }
      }

      if (catalogo.length > 0) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data: catalogo, updateDate }));
      }

    } catch (e) {
      console.log("Error cargando ofertas:", e);
    }
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

  // Guardar catálogo en ventana para poder filtrarlo sin recargar
  window._catalogoDatos = catalogo;
  window._catalogoFiltrado = catalogo; // Copia filtrada actual
  window._catalogoPagina = 0;         // Página actual para carga infinita

  container.innerHTML = `
    <!-- TABS: Nacional / Local -->
    <div id="tiendas-tabs" style="display:flex;gap:0;background:var(--surface);border-radius:14px;border:1px solid var(--border);padding:4px;margin-bottom:14px;">
      <button id="tab-nacional" onclick="switchTiendasTab('nacional')"
        style="flex:1;padding:9px 0;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:background 0.2s,color 0.2s;background:var(--primary);color:#fff;">
        🏬 Nacional
      </button>
      <button id="tab-local" onclick="switchTiendasTab('local')"
        style="flex:1;padding:9px 0;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s,color 0.2s;background:transparent;color:var(--text-secondary);">
        📍 Local
      </button>
    </div>

    <!-- CONTENIDO NACIONAL -->
    <div id="tiendas-nacional-content">
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
            <option value="Farmacia Guadalajara">Farmacia Guadalajara</option>
            <option value="Farmacias del Ahorro">Farmacias del Ahorro</option>
            <option value="Bodega Aurrerá">Bodega Aurrerá</option>
            <option value="Chedraui">Chedraui</option>
            <option value="Soriana">Soriana</option>
            <option value="La Comer">La Comer</option>
            <option value="Tiendas Lores">Tiendas Lores</option>
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
      </div>
    </div>

    <!-- CONTENIDO LOCAL (oculto inicialmente) -->
    <div id="tiendas-local-content" style="display:none;">
    </div>
  `;

  // Función global para cambiar entre tabs
  window.switchTiendasTab = function(tab) {
    const nacional = document.getElementById('tiendas-nacional-content');
    const local    = document.getElementById('tiendas-local-content');
    const btnNac   = document.getElementById('tab-nacional');
    const btnLoc   = document.getElementById('tab-local');
    if (!nacional || !local) return;

    if (tab === 'nacional') {
      nacional.style.display = 'block';
      local.style.display    = 'none';
      btnNac.style.background = 'var(--primary)';
      btnNac.style.color      = '#fff';
      btnLoc.style.background = 'transparent';
      btnLoc.style.color      = 'var(--text-secondary)';
    } else {
      nacional.style.display = 'none';
      local.style.display    = 'block';
      btnNac.style.background = 'transparent';
      btnNac.style.color      = 'var(--text-secondary)';
      btnLoc.style.background = 'var(--primary)';
      btnLoc.style.color      = '#fff';
      // Cargar contenido Local la primera vez
      if (!local.dataset.loaded) {
        local.dataset.loaded = '1';
        APP_Local.load(local);
      }
    }
  };

  bindTiendasEvents();
  renderCatalogoFiltrado(); // Renderizar la primera página
};

// =============================================
// FUNCIÓN COMPARTIDA: Renderiza una card del catálogo
// =============================================
function renderCardCatalogo(data) {
  const fotoHTML = data.imagen
    ? `<img loading="lazy" src="${data.imagen}" alt="${data.producto.nombre}" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;">`
    : `<span style="font-size: 36px; opacity: 0.5;">🛒</span>`;

  const isOferta = data.ml_score && data.ml_score.es_oferta;
  const descuentoStr = isOferta ? `🔥 -${data.ml_score.descuento_pct}% IA` : '';
  const ofertaBadge = isOferta
    ? `<div style="position: absolute; top: 8px; right: 8px; background: var(--red-500); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${descuentoStr}</div>`
    : '';

  // El índice se inyecta dinámicamente en renderCatalogoFiltrado
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
    data-catalogo-idx="__IDX__"
    onclick="openProductoSheet('${dataStr}', parseInt(this.dataset.catalogoIdx))"
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
        data-imagen="${data.imagen || ''}"
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
    datos.sort((a, b) => {
      const scoreA = (a.ml_score && a.ml_score.es_oferta) ? a.ml_score.score : 0;
      const scoreB = (b.ml_score && b.ml_score.es_oferta) ? b.ml_score.score : 0;
      return scoreB - scoreA;
    });
  }

  // 4. Paginación virtual: renderizar solo las primeras 80 y cargar más al hacer scroll
  const PAGE_SIZE = 80;
  window._catalogoFiltrado = datos;
  window._catalogoPagina = 0;

  if (datos.length === 0) {
    grid.innerHTML = `<div style="padding: 20px; grid-column: span 2; text-align: center; color: var(--text-secondary);">No hay productos con esos filtros.</div>`;
    return;
  }

  const primeraPagina = datos.slice(0, PAGE_SIZE);
  // Inyectar el índice real de cada producto en el catálogo filtrado
  grid.innerHTML = primeraPagina.map((data, i) => renderCardCatalogo(data).replace('__IDX__', i)).join('');
  
  // Si hay más, añadir sentinel para scroll infinito
  if (datos.length > PAGE_SIZE) {
    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.style.cssText = 'grid-column: span 2; height: 40px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 13px;';
    sentinel.textContent = 'Cargando más...';
    grid.appendChild(sentinel);

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        window._catalogoPagina++;
        const start = window._catalogoPagina * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const nuevos = window._catalogoFiltrado.slice(start, end);
        
        sentinel.remove();
        observer.disconnect();
        
        if (nuevos.length > 0) {
          grid.insertAdjacentHTML('beforeend', nuevos.map((data, i) => renderCardCatalogo(data).replace('__IDX__', start + i)).join(''));
          bindTiendasBotonesAñadir();
          
          // Si aún hay más, volver a poner el sentinel
          if (end < window._catalogoFiltrado.length) {
            const newSentinel = sentinel.cloneNode(true);
            grid.appendChild(newSentinel);
            observer.observe(newSentinel);
          }
        }
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    window._scrollObserver = observer;
  }
  
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
      const imagenRef  = btn.dataset.imagen || '';
      mostrarModalCantidadTienda(nombreProd, precioRef, tiendaRef, btn, imagenRef);
    });
  });
}

// Modal para preguntar cantidad antes de añadir (sin teclado, con stepper)
async function mostrarModalCantidadTienda(nombreProd, precioRef, tiendaRef, btnOrigen, imagenRef) {
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

    // Guardar hints de tienda, precio e imagen en diccionarios persistentes
    const tiendaHints = JSON.parse(localStorage.getItem('midespensita_tienda_hints') || '{}');
    tiendaHints[nombreProd.toLowerCase()] = tiendaRef;
    localStorage.setItem('midespensita_tienda_hints', JSON.stringify(tiendaHints));

    if (precioRef) {
      const precioHints = JSON.parse(localStorage.getItem('midespensita_precio_hints') || '{}');
      precioHints[nombreProd.toLowerCase()] = precioRef;
      localStorage.setItem('midespensita_precio_hints', JSON.stringify(precioHints));
    }
    
    if (typeof imagenRef !== 'undefined' && imagenRef) {
      const imagenHints = JSON.parse(localStorage.getItem('midespensita_imagen_hints') || '{}');
      imagenHints[nombreProd.toLowerCase()] = imagenRef;
      localStorage.setItem('midespensita_imagen_hints', JSON.stringify(imagenHints));
    }

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

    // Indicarle al Service Worker que cachee la imagen de este producto
    // (solo las imágenes de productos añadidos, no todo el catálogo)
    if (imagenRef && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_PRODUCT_IMAGE',
        url: imagenRef
      });
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
window.openProductoSheet = function(dataStr, idx) {
  const data = JSON.parse(decodeURIComponent(dataStr));
  let currentIdx = (typeof idx === 'number') ? idx : -1;

  // Eliminar sheet anterior si existe
  const existente = document.getElementById('producto-sheet-overlay');
  if (existente) existente.remove();

  // -- Construye solo el HTML del contenido cambiable --
  function buildContentHTML(d) {
    const foto = d.imagen
      ? `<img src="${d.imagen}" alt="${d.nombre}" style="width:180px;height:180px;object-fit:contain;">`
      : `<span style="font-size:80px;">🛒</span>`;
    const badge = d.es_oferta
      ? `<div style="display:inline-block;background:var(--red-500);color:white;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:bold;margin-bottom:12px;">🔥 Oferta IA — -${d.descuento_pct}%</div><br>`
      : '';
    return `
      <div style="display:flex;justify-content:center;align-items:center;min-height:200px;background:var(--gray-50);border-bottom:1px solid var(--border);padding:24px;">${foto}</div>
      <div style="padding:22px 20px 8px;">
        ${badge}
        <h2 style="font-size:20px;font-weight:800;color:var(--text);margin:0 0 8px;line-height:1.4;">${d.nombre}</h2>
        <div style="font-size:14px;color:var(--text-secondary);margin-bottom:18px;">🏪 ${d.tienda}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
          <div style="font-size:36px;font-weight:900;color:var(--primary);line-height:1;">
            $${parseFloat(d.precio).toFixed(2)}
            <span style="font-size:14px;font-weight:400;color:var(--text-secondary);margin-left:4px;">MXN</span>
          </div>
          ${d.url ? `<a href="${d.url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:4px;padding:8px 12px;color:var(--text-secondary);text-decoration:none;font-size:12px;font-weight:600;border:1px solid var(--border);border-radius:20px;">Ver en tienda <span>↗</span></a>` : ''}
        </div>
        <label style="font-size:13px;font-weight:600;color:var(--text);display:block;margin-bottom:8px;">¿Cuántas necesitas?</label>
        <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-bottom:24px;background:var(--gray-50);padding:16px;border-radius:20px;border:1px solid var(--border);">
          <button id="sheet-qty-minus" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--border);background:var(--surface);font-size:24px;cursor:pointer;color:var(--text);display:flex;align-items:center;justify-content:center;">-</button>
          <div id="sheet-qty-display" style="width:60px;text-align:center;font-size:32px;font-weight:900;color:var(--text);" data-qty="1">1</div>
          <button id="sheet-qty-plus" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--border);background:var(--surface);font-size:24px;cursor:pointer;color:var(--text);display:flex;align-items:center;justify-content:center;">+</button>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          <button id="sheet-btn-add" style="width:100%;padding:16px;background:var(--primary);color:white;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;text-align:center;">Añadir a la lista</button>
        </div>
      </div>`;
  }

  const total = window._catalogoFiltrado ? window._catalogoFiltrado.length : 0;
  const navStr = (currentIdx >= 0 && total > 1)
    ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:6px 0 2px;">
         <span id="sheet-nav-prev" style="font-size:26px;cursor:pointer;color:var(--text-secondary);padding:0 10px;user-select:none;">‹</span>
         <span id="sheet-nav-counter" style="font-size:11px;color:var(--text-secondary);">${currentIdx+1} / ${total}</span>
         <span id="sheet-nav-next" style="font-size:26px;cursor:pointer;color:var(--text-secondary);padding:0 10px;user-select:none;">›</span>
       </div>`
    : '<div style="padding:8px 0;"></div>';

  // -- Crear el overlay y el shell (se crean UNA SOLA VEZ) --
  const overlay = document.createElement('div');
  overlay.id = 'producto-sheet-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-end;animation:fadeInOverlay 0.2s ease;';
  overlay.innerHTML = `
    <style>
      @keyframes slideUp       { from{transform:translateY(100%)} to{transform:translateY(0)} }
      @keyframes slideDown     { from{transform:translateY(0)} to{transform:translateY(110%)} }
      @keyframes fadeInOverlay { from{opacity:0} to{opacity:1} }
      @keyframes fromLeft      { from{transform:translateX(-40px);opacity:0} to{transform:translateX(0);opacity:1} }
      @keyframes fromRight     { from{transform:translateX(40px);opacity:0}  to{transform:translateX(0);opacity:1} }
      #producto-sheet          { animation:slideUp 0.28s cubic-bezier(0.4,0,0.2,1) forwards; }
      #producto-sheet.closing  { animation:slideDown 0.22s cubic-bezier(0.4,0,0.2,1) forwards; }
      #sheet-content.anim-left  { animation:fromRight 0.2s cubic-bezier(0.4,0,0.2,1) forwards; }
      #sheet-content.anim-right { animation:fromLeft  0.2s cubic-bezier(0.4,0,0.2,1) forwards; }
    </style>
    <div id="producto-sheet" style="position:relative;background:var(--surface);width:100%;border-radius:24px 24px 0 0;max-height:92vh;overflow-y:auto;box-shadow:0 -6px 40px rgba(0,0,0,0.18);">
      <button id="sheet-btn-close-x" style="position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:50%;background:var(--gray-100);border:none;color:var(--text-secondary);font-size:16px;font-weight:bold;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;transition:background 0.2s;">✕</button>
      <div style="display:flex;flex-direction:column;align-items:center;padding:10px 0 0;">
        <div style="width:40px;height:4px;background:var(--border);border-radius:2px;"></div>
        ${navStr}
      </div>
      <div id="sheet-content">${buildContentHTML(data)}</div>
    </div>`;

  // -- Navegación: solo actualiza #sheet-content --
  function navigateTo(newIdx, direction) {
    const lista = window._catalogoFiltrado;
    if (!lista || newIdx < 0 || newIdx >= lista.length) return;
    currentIdx = newIdx;
    const raw = lista[newIdx];
    const d = {
      nombre: raw.producto.nombre, precio: raw.precio, tienda: raw.tienda,
      imagen: raw.imagen || '', url: raw.url || '',
      es_oferta: !!(raw.ml_score && raw.ml_score.es_oferta),
      descuento_pct: raw.ml_score ? raw.ml_score.descuento_pct : 0
    };
    const content = overlay.querySelector('#sheet-content');
    content.classList.remove('anim-left', 'anim-right');
    void content.offsetWidth; // reflow para reiniciar animación
    content.innerHTML = buildContentHTML(d);
    content.classList.add(direction === 'left' ? 'anim-left' : 'anim-right');
    const counter = overlay.querySelector('#sheet-nav-counter');
    if (counter) counter.textContent = `${currentIdx + 1} / ${lista.length}`;
    overlay.querySelector('#producto-sheet').scrollTop = 0;
    bindContentEvents(d);
  }

  // -- Eventos del contenido (se rebindan al navegar) --
  function bindContentEvents(d) {
    const qtyDisplay = overlay.querySelector('#sheet-qty-display');
    overlay.querySelector('#sheet-qty-minus').addEventListener('click', () => {
      let q = parseInt(qtyDisplay.dataset.qty) || 1; if (q > 1) q--;
      qtyDisplay.dataset.qty = q; qtyDisplay.textContent = q;
    });
    overlay.querySelector('#sheet-qty-plus').addEventListener('click', () => {
      let q = parseInt(qtyDisplay.dataset.qty) || 1; q++;
      qtyDisplay.dataset.qty = q; qtyDisplay.textContent = q;
    });
    overlay.querySelector('#sheet-btn-add').addEventListener('click', async () => {
      const btn = overlay.querySelector('#sheet-btn-add');
      btn.textContent = 'Añadiendo...'; btn.disabled = true;
      const cantidad = parseInt(qtyDisplay.dataset.qty) || 1;
      // Guardar hints de tienda y precio en diccionarios para que persistan para múltiples productos y días
      const tiendaHints = JSON.parse(localStorage.getItem('midespensita_tienda_hints') || '{}');
      tiendaHints[d.nombre.toLowerCase()] = d.tienda;
      localStorage.setItem('midespensita_tienda_hints', JSON.stringify(tiendaHints));
      
      if (d.precio) {
        const precioHints = JSON.parse(localStorage.getItem('midespensita_precio_hints') || '{}');
        precioHints[d.nombre.toLowerCase()] = d.precio;
        localStorage.setItem('midespensita_precio_hints', JSON.stringify(precioHints));
      }
      // Guardar imagen del producto para mostrar en la lista de compra
      if (d.imagen) {
        const imagenHints = JSON.parse(localStorage.getItem('midespensita_imagen_hints') || '{}');
        imagenHints[d.nombre.toLowerCase()] = d.imagen;
        localStorage.setItem('midespensita_imagen_hints', JSON.stringify(imagenHints));
      }
      let productosLocales = await APP_DB.searchProductos(d.nombre);
      let productoLocal = productosLocales.length > 0 ? productosLocales[0] : null;
      if (!productoLocal) {
        const nuevoId = await APP_DB.addProducto({ nombre: d.nombre, categoria: 'supermercados', activo: 1, unidad: 'pieza', origen: 'catalogo' });
        productoLocal = await APP_DB.getProducto(nuevoId);
      }
      const codigoFamilia = typeof APP_Sync !== 'undefined' ? APP_Sync.getCodigoFamilia() : null;
      if (codigoFamilia) { await APP_Sync.agregarItemLista(productoLocal.nombre, cantidad); }
      else { const lista = await APP_DB.getListaActiva(); await APP_DB.addItem(lista.id, productoLocal.id, cantidad); }
      btn.textContent = '✓ Añadido!'; btn.style.background = 'var(--green-500)';
      setTimeout(() => { closeProductoSheet(overlay); }, 700);
    });
  }

  // -- Eventos del shell (se bindan una sola vez) --
  overlay.addEventListener('click', e => { if (e.target === overlay) closeProductoSheet(overlay); });
  const btnCloseX = overlay.querySelector('#sheet-btn-close-x');
  if (btnCloseX) btnCloseX.addEventListener('click', () => closeProductoSheet(overlay));

  const sheet = overlay.querySelector('#producto-sheet');
  let startX = 0, startY = 0;
  sheet.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
  }, { passive: true });
  sheet.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy > 80) closeProductoSheet(overlay);
    } else if (Math.abs(dx) > 50) {
      navigateTo(dx < 0 ? currentIdx + 1 : currentIdx - 1, dx < 0 ? 'left' : 'right');
    }
  }, { passive: true });

  const prevBtn = overlay.querySelector('#sheet-nav-prev');
  const nextBtn = overlay.querySelector('#sheet-nav-next');
  if (prevBtn) prevBtn.addEventListener('click', e => { e.stopPropagation(); navigateTo(currentIdx - 1, 'right'); });
  if (nextBtn) nextBtn.addEventListener('click', e => { e.stopPropagation(); navigateTo(currentIdx + 1, 'left'); });

  bindContentEvents(data);
  document.body.appendChild(overlay);
};

function closeProductoSheet(overlay) {
  const sheet = overlay.querySelector('#producto-sheet');
  if (sheet) sheet.classList.add('closing');
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 220);
}

