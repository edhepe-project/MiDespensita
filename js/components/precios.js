// Precios component - Análisis de precios
APP_Pages.precios = async function() {
  const container = document.getElementById('app-content');
  const productos = await APP_DB.getAllProductos();

  // Obtener productos con historial de precios
  const productosConPrecios = [];
  for (const prod of productos) {
    const comparativa = await APP_DB.getComparativaByProducto(prod.id);
    if (comparativa.length > 0) {
      productosConPrecios.push({
        producto: prod,
        comparativa
      });
    }
  }

  // Estadísticas del mes
  const now = new Date();
  const stats = await APP_DB.getStatsByMonth(now.getFullYear(), now.getMonth());

  // Obtener tiendas únicas para filtro
  const todasLasTiendas = [];
  for (const p of productosConPrecios) {
    for (const c of p.comparativa) {
      const tienda = c.tiendaMarca.split(' - ')[0];
      if (!todasLasTiendas.includes(tienda)) {
        todasLasTiendas.push(tienda);
      }
    }
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Precios</span>
      </div>
      <div class="form-group">
        <select class="form-select" id="filtro-tienda">
          <option value="">Todas las tiendas</option>
          ${todasLasTiendas.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="card btn-comparar-semanas" onclick="window.location.hash = '#comparar_semanas'">
      <div class="card-header">
        <span class="card-title">📊 Comparar Semanas</span>
        <span class="text-secondary">→</span>
      </div>
      <p class="text-secondary" style="font-size: var(--text-sm)">
        ¿Realmente ahorraste o solo compraste menos?
      </p>
    </div>

    <div class="card btn-predicciones" onclick="window.location.hash = '#predicciones'">
      <div class="card-header">
        <span class="card-title">🔮 Predicciones</span>
        <span class="text-secondary">→</span>
      </div>
      <p class="text-secondary" style="font-size: var(--text-sm)">
        Tendencias de precio y cuándo comprar
      </p>
    </div>

    <div id="lista-precios">
      ${productosConPrecios.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">💰</div><p>Registra compras para ver análisis de precios</p></div>'
        : productosConPrecios.map(p => renderPrecioItem(p)).join('')
      }
    </div>

    <div class="card stats-resumen">
      <div class="section-title">Resumen del mes</div>
      <div class="stat-row">
        <span class="stat-label">Total gastado</span>
        <span class="stat-value">${APP_Format.money(stats.total)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Compras realizadas</span>
        <span class="stat-value">${stats.numCompras}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Promedio por compra</span>
        <span class="stat-value">${APP_Format.money(stats.promedio)}</span>
      </div>
    </div>
  `;

  bindPreciosEvents();
};

function renderPrecioItem(data) {
  const { producto, comparativa } = data;
  const cat = APP_CATEGORIAS[producto.categoria] || APP_CATEGORIAS.otros;

  return `
    <div class="card precio-card" data-producto="${producto.id}">
      <div class="card-header">
        <span class="card-title">${cat.icono} ${producto.nombre}</span>
      </div>
      <div class="precios-lista">
        ${comparativa.map((c, idx) => {
          const esMejor = idx === 0;

          // Normalizar precio por unidad
          const precioNormalizado = APP_Units.normalizarPrecio(c.promedio, c.presentacion);
          const unidad = APP_Units.obtenerUnidadBase(c.presentacion);
          const precioUnitario = unidad !== 'unidad' ? `$${precioNormalizado.toFixed(2)}/${unidad}` : '';

          const diff = idx > 0
            ? ((c.promedio - comparativa[0].promedio) / comparativa[0].promedio * 100).toFixed(0)
            : 0;
          return `
            <div class="precio-item ${esMejor ? 'mejor' : ''}">
              <div class="precio-info-main">
                <span class="precio-tienda-marca">${c.tiendaMarca}</span>
                <span class="precio-valor">$${c.promedio.toFixed(2)}</span>
                ${precioUnitario ? `<span class="precio-unitario">${precioUnitario}</span>` : ''}
              </div>
              <div class="precio-detalle">
                <span>Min: $${c.min.toFixed(2)} | Max: $${c.max.toFixed(2)}</span>
                <span>${c.compras} compra${c.compras > 1 ? 's' : ''}</span>
              </div>
              ${!esMejor ? `<span class="diferencia ${diff > 10 ? 'malo' : ''}">+${diff}%</span>` : '<span class="mejor-badge">MEJOR</span>'}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function bindPreciosEvents() {
  // Filtro por tienda
  document.getElementById('filtro-tienda')?.addEventListener('change', (e) => {
    const tienda = e.target.value;
    document.querySelectorAll('.precio-card').forEach(card => {
      if (!tienda) {
        card.style.display = '';
        return;
      }
      const items = card.querySelectorAll('.precio-item');
      let tieneTienda = false;
      items.forEach(item => {
        if (item.querySelector('.precio-tienda-marca')?.textContent.includes(tienda)) {
          tieneTienda = true;
        }
      });
      card.style.display = tieneTienda ? '' : 'none';
    });
  });
}
