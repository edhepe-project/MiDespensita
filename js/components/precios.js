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

    <div id="lista-precios" style="margin-bottom: var(--space-4);">
      ${productosConPrecios.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">💰</div><p>Registra compras para ver análisis de precios</p></div>'
        : productosConPrecios.map(p => renderPrecioItem(p)).join('')
      }
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

    <div class="card" onclick="window.location.hash = '#historial'" style="cursor:pointer">
      <div class="card-header">
        <span class="card-title">📋 Historial de Compras</span>
        <span class="text-secondary">→</span>
      </div>
      <p class="text-secondary" style="font-size: var(--text-sm)">
        Todas tus compras filtradas por tienda y semana
      </p>
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
          const diff = idx > 0
            ? ((c.promedio - comparativa[0].promedio) / comparativa[0].promedio * 100).toFixed(0)
            : 0;

          // Separar tienda y marca
          const partes = c.tiendaMarca.split(' - ');
          const tienda = partes[0] || '';
          const marca = partes[1] || '';

          return `
            <div class="precio-item ${esMejor ? 'mejor' : ''}">
              <div class="precio-item-top">
                <div class="precio-item-tienda">${tienda}</div>
                <div class="precio-item-precio">$${c.promedio.toFixed(2)}</div>
                ${esMejor ? '<span class="mejor-badge">MEJOR</span>' : `<span class="diferencia ${diff > 10 ? 'malo' : ''}">+${diff}%</span>`}
              </div>
              <div class="precio-item-bottom">
                <span class="precio-item-marca">${marca || 'Sin marca'}</span>
                <span class="precio-item-detalles">Min: $${c.min.toFixed(2)} | Max: $${c.max.toFixed(2)} | ${c.compras} compra${c.compras > 1 ? 's' : ''}</span>
              </div>
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
      const items = card.querySelectorAll('.precio-item');
      
      if (!tienda) {
        card.style.display = '';
        items.forEach(item => item.style.display = '');
        return;
      }
      
      let tieneTienda = false;
      items.forEach(item => {
        const tiendaEl = item.querySelector('.precio-item-tienda');
        if (tiendaEl && tiendaEl.textContent.trim() === tienda.trim()) {
          tieneTienda = true;
          item.style.display = ''; // Mostrar solo el de esta tienda
        } else {
          item.style.display = 'none'; // Ocultar los de otras tiendas
        }
      });
      card.style.display = tieneTienda ? '' : 'none';
    });
  });
}
