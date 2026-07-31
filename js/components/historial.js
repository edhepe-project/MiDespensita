// Historial de Compras - Pantalla filtrable
APP_Pages.historial = async function() {
  const container = document.getElementById('app-content');

  // Cargar todas las compras con su detalle
  const todasCompras = await APP_DB.getAllCompras();
  const comprasConDetalle = [];
  for (const compra of todasCompras) {
    const detalle = await APP_DB.getCompraById(compra.id);
    comprasConDetalle.push(detalle);
  }

  // Tiendas únicas para filtro
  const tiendas = [...new Set(todasCompras.map(c => c.tienda).filter(Boolean))].sort();

  // Semanas únicas (YYYY-WW)
  function getSemanaKey(fecha) {
    const d = new Date(fecha);
    const diaSemana = d.getDay();
    const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    const lunes = new Date(d);
    lunes.setDate(d.getDate() - diasDesdeLunes);
    lunes.setHours(0, 0, 0, 0);
    const fin = new Date(lunes);
    fin.setDate(lunes.getDate() + 6);
    return {
      key: lunes.toISOString().slice(0, 10),
      label: `${lunes.getDate()} ${lunes.toLocaleString('es', { month: 'short' })} – ${fin.getDate()} ${fin.toLocaleString('es', { month: 'short', year: '2-digit' })}`
    };
  }

  const semanasMap = new Map();
  for (const c of todasCompras) {
    const { key, label } = getSemanaKey(c.fecha);
    if (!semanasMap.has(key)) semanasMap.set(key, label);
  }
  const semanas = [...semanasMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const hayCompras = comprasConDetalle.length > 0;

  container.innerHTML = `
    <button class="btn-back" onclick="window.history.back()">← Volver</button>

    <div class="card" style="margin-bottom:12px">
      <div class="card-header">
        <span class="card-title">📋 Historial de Compras</span>
        <span class="text-secondary" id="hist-contador">${todasCompras.length} compra${todasCompras.length !== 1 ? 's' : ''}</span>
      </div>

      ${hayCompras ? `
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px">
        <select class="form-select" id="filtro-hist-tienda" style="flex:1; min-width:120px">
          <option value="">🏪 Todas las tiendas</option>
          ${tiendas.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
        <select class="form-select" id="filtro-hist-semana" style="flex:1; min-width:140px">
          <option value="">📅 Todas las semanas</option>
          ${semanas.map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
        </select>
      </div>
      ` : ''}
    </div>

    ${!hayCompras ? `
    <div class="empty-state">
      <div class="empty-state-icon">🛒</div>
      <p>Aún no tienes compras registradas</p>
      <p class="text-secondary">Usa el botón "Comprar" en tu lista de pendientes para registrar precios</p>
    </div>
    ` : `
    <div id="hist-lista">
      ${renderHistorialItems(comprasConDetalle, '', '')}
    </div>
    `}
  `;

  if (hayCompras) {
    const filtroTienda = document.getElementById('filtro-hist-tienda');
    const filtroSemana = document.getElementById('filtro-hist-semana');

    function aplicarFiltros() {
      const tiendaVal  = filtroTienda.value;
      const semanaVal  = filtroSemana.value;
      document.getElementById('hist-lista').innerHTML =
        renderHistorialItems(comprasConDetalle, tiendaVal, semanaVal);
      bindExpandListeners();
    }

    filtroTienda.addEventListener('change', aplicarFiltros);
    filtroSemana.addEventListener('change', aplicarFiltros);
    bindExpandListeners();
  }
};

function getSemanaKeyForFilter(fecha) {
  const d = new Date(fecha);
  const diaSemana = d.getDay();
  const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - diasDesdeLunes);
  lunes.setHours(0, 0, 0, 0);
  return lunes.toISOString().slice(0, 10);
}

function renderHistorialItems(comprasConDetalle, filtroTienda, filtroSemana) {
  let filtradas = comprasConDetalle;

  if (filtroTienda) {
    filtradas = filtradas.filter(c => c.tienda === filtroTienda);
  }
  if (filtroSemana) {
    filtradas = filtradas.filter(c => getSemanaKeyForFilter(c.fecha) === filtroSemana);
  }

  if (filtradas.length === 0) {
    return `<div class="empty-state" style="margin-top:16px">
      <div class="empty-state-icon">🔍</div>
      <p>Sin compras con ese filtro</p>
    </div>`;
  }

  // Agrupar por semana
  const grupos = {};
  for (const compra of filtradas) {
    const d   = new Date(compra.fecha);
    const dia = d.getDay();
    const diasDesdeLunes = dia === 0 ? 6 : dia - 1;
    const lunes = new Date(d);
    lunes.setDate(d.getDate() - diasDesdeLunes);
    lunes.setHours(0, 0, 0, 0);
    const fin = new Date(lunes);
    fin.setDate(lunes.getDate() + 6);
    const key   = lunes.toISOString().slice(0, 10);
    const label = `Semana del ${lunes.getDate()} al ${fin.getDate()} de ${fin.toLocaleString('es', { month: 'long' })}`;
    if (!grupos[key]) grupos[key] = { label, compras: [], totalSemana: 0 };
    grupos[key].compras.push(compra);
    grupos[key].totalSemana += compra.total || 0;
  }

  const keysOrdenadas = Object.keys(grupos).sort((a, b) => b.localeCompare(a));

  return keysOrdenadas.map(key => {
    const { label, compras, totalSemana } = grupos[key];
    return `
      <div class="hist-semana-group">
        <div class="hist-semana-header">
          <span>${label}</span>
          <span class="hist-semana-total">$${totalSemana.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        ${compras.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(compra => renderCompraCard(compra)).join('')}
      </div>
    `;
  }).join('');
}

function renderCompraCard(compra) {
  const fecha = new Date(compra.fecha);
  const fechaStr = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return `
    <div class="hist-compra-card" data-id="${compra.id}">
      <div class="hist-compra-header" onclick="toggleHistCompra(${compra.id})">
        <div style="flex:1">
          <div class="hist-compra-tienda">${compra.tienda || 'Sin tienda'}</div>
          <div class="hist-compra-fecha">${fechaStr}</div>
        </div>
        <div style="text-align:right">
          <div class="hist-compra-total">$${(compra.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
          <div class="hist-compra-items-count">${compra.items?.length || 0} producto${compra.items?.length !== 1 ? 's' : ''}</div>
        </div>
        <span class="hist-chevron" id="chevron-${compra.id}">▼</span>
      </div>
      <div class="hist-compra-detalle" id="detalle-hist-${compra.id}" style="display:none">
        ${(compra.items || []).map(item => `
          <div class="hist-item">
            <div class="hist-item-nombre">${item.producto?.nombre || 'Producto'}</div>
            <div class="hist-item-info">
              ${item.marca ? `<span class="hist-tag">${item.marca}</span>` : ''}
              ${item.presentacion ? `<span class="hist-tag">${item.presentacion}</span>` : ''}
              <span>x${item.cantidad}</span>
            </div>
            <div class="hist-item-precio">$${(item.precioUnitario || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
          </div>
        `).join('')}
        <div class="hist-item-subtotal">
          Total: <strong>$${(compra.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>
    </div>
  `;
}

function toggleHistCompra(id) {
  const detalle = document.getElementById(`detalle-hist-${id}`);
  const chevron = document.getElementById(`chevron-${id}`);
  if (!detalle) return;
  const visible = detalle.style.display !== 'none';
  detalle.style.display = visible ? 'none' : 'block';
  if (chevron) chevron.textContent = visible ? '▼' : '▲';
}

function bindExpandListeners() {
  // Los listeners están inline en onclick, no hace falta binding adicional
}
