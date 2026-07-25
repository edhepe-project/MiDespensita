// Comparar Semanas - Análisis inteligente de gasto
APP_Pages.comparar_semanas = async function() {
  const container = document.getElementById('app-content');

  // Obtener compras de las últimas 4 semanas
  const semanas = await obtenerSemanasRecientes();

  container.innerHTML = `
    <button class="btn-back" onclick="volverAPrecios()">← Volver a Precios</button>

    <div class="card">
      <div class="card-header">
        <span class="card-title">📊 Comparar Semanas</span>
      </div>
      <p class="text-secondary">¿Realmente ahorraste o solo compraste menos?</p>
    </div>

    ${semanas.length < 2
      ? '<div class="empty-state"><div class="empty-state-icon">📈</div><p>Necesitas al menos 2 semanas de compras para comparar</p></div>'
      : renderComparacion(semanas)
    }
  `;
};

async function obtenerSemanasRecientes() {
  const todasLasCompras = await APP_DB.getAllCompras();
  if (todasLasCompras.length === 0) return [];

  // Agrupar por semana (lunes a domingo)
  const semanas = {};
  for (const compra of todasLasCompras) {
    const fecha = new Date(compra.fecha);
    const diaSemana = fecha.getDay();
    const lunes = new Date(fecha);
    lunes.setDate(fecha.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    lunes.setHours(0, 0, 0, 0);

    const key = lunes.toISOString().split('T')[0];
    if (!semanas[key]) semanas[key] = [];
    semanas[key].push(compra);
  }

  // Convertir a array y ordenar por fecha
  const semanasArray = Object.entries(semanas)
    .map(([fecha, compras]) => ({
      fechaInicio: new Date(fecha),
      compras,
      total: compras.reduce((sum, c) => sum + c.total, 0),
      numCompras: compras.length
    }))
    .sort((a, b) => b.fechaInicio - a.fechaInicio)
    .slice(0, 4); // Últimas 4 semanas

  // Enriquecer con detalles de productos
  for (const semana of semanasArray) {
    semana.productos = await obtenerProductosSemana(semana.compras);
  }

  return semanasArray;
}

async function obtenerProductosSemana(compras) {
  const productos = {};
  for (const compra of compras) {
    const detalle = await APP_DB.getCompraById(compra.id);
    for (const item of detalle.items) {
      const prodId = item.productoId;
      if (!productos[prodId]) {
        productos[prodId] = {
          producto: item.producto,
          cantidad: 0,
          precioTotal: 0,
          precios: [],
          presentaciones: []
        };
      }
      productos[prodId].cantidad += item.cantidad;
      productos[prodId].precioTotal += item.precioUnitario * item.cantidad;
      productos[prodId].precios.push(item.precioUnitario);
      productos[prodId].presentaciones.push(item.presentacion || '');
    }
  }
  return productos;
}

function renderComparacion(semanas) {
  if (semanas.length < 2) return '';

  const semanaActual = semanas[0];
  const semanaAnterior = semanas[1];

  // Calcular comparación
  const comparacion = calcularComparacion(semanaActual, semanaAnterior);

  return `
    <div class="card comparacion-card">
      <div class="section-title">Semana actual vs anterior</div>

      <div class="comparacion-header">
        <div class="semana-info">
          <div class="semana-label">Esta semana</div>
          <div class="semana-fecha">${formatFechaSemana(semanaActual.fechaInicio)}</div>
          <div class="semana-total">${APP_Format.money(semanaActual.total)}</div>
        </div>
        <div class="flecha-comparacion ${comparacion.diferencia < 0 ? 'mejor' : 'peor'}">
          ${comparacion.diferencia < 0 ? '↓' : '↑'} ${Math.abs(comparacion.porcentaje)}%
        </div>
        <div class="semana-info">
          <div class="semana-label">Semana pasada</div>
          <div class="semana-fecha">${formatFechaSemana(semanaAnterior.fechaInicio)}</div>
          <div class="semana-total">${APP_Format.money(semanaAnterior.total)}</div>
        </div>
      </div>

      <div class="insights-section">
        <div class="section-title">💡 Análisis inteligente</div>

        <div class="insight-card ${comparacion.ahorroReal > 0 ? 'positivo' : comparacion.ahorroReal < 0 ? 'negativo' : 'neutro'}">
          <div class="insight-icon">${comparacion.ahorroReal > 0 ? '🎉' : comparacion.ahorroReal < 0 ? '📈' : '🤔'}</div>
          <div class="insight-content">
            <div class="insight-title">
              ${comparacion.ahorroReal > 0
                ? '¡Realmente ahorraste!'
                : comparacion.ahorroReal < 0
                  ? 'Los precios subieron'
                  : 'Mismos precios, menos productos'}
            </div>
            <div class="insight-detail">
              ${comparacion.ahorroReal > 0
                ? `Ahorro real: ${APP_Format.money(comparacion.ahorroReal)} por mejores precios`
                : comparacion.ahorroReal < 0
                  ? `Pago extra: ${APP_Format.money(Math.abs(comparacion.ahorroReal))} por suba de precios`
                  : `Gastaste ${APP_Format.money(Math.abs(comparacion.diferenciaDinero))} menos pero compraste ${comparacion.productosMenos} producto(s) menos`}
            </div>
          </div>
        </div>

        <div class="insight-card neutro">
          <div class="insight-icon">📦</div>
          <div class="insight-content">
            <div class="insight-title">Productos comparables</div>
            <div class="insight-detail">
              ${comparacion.productosIguales} productos comprados ambas semanas
              ${comparacion.productosMenos > 0 ? `| ${comparacion.productosMenos} menos esta semana` : ''}
              ${comparacion.productosNuevos > 0 ? `| ${comparacion.productosNuevos} nuevos esta semana` : ''}
            </div>
          </div>
        </div>
      </div>

      ${renderDetalleComparacion(comparacion)}
    </div>

    ${renderHistorialSemanas(semanas)}
  `;
}

function calcularComparacion(actual, anterior) {
  const productosActuales = Object.keys(actual.productos);
  const productosAnteriores = Object.keys(anterior.productos);

  // Productos comprados en ambas semanas
  const productosComunes = productosActuales.filter(p => productosAnteriores.includes(p));

  // Calcular qué costaría a precios de la semana pasada (normalizados por unidad)
  let costoSiMismosPrecios = 0;
  let costoReal = 0;

  for (const prodId of productosComunes) {
    const prodActual = actual.productos[prodId];
    const prodAnterior = anterior.productos[prodId];

    // Obtener presentación más común de la semana anterior
    const presentacionAnterior = prodAnterior.presentaciones[0] || '';

    // Precio promedio de la semana anterior
    const precioPromedioAnterior = prodAnterior.precios.reduce((a, b) => a + b, 0) / prodAnterior.precios.length;

    // Normalizar precio por unidad (litro, kg, etc.)
    const precioNormalizadoAnterior = APP_Units.normalizarPrecio(precioPromedioAnterior, presentacionAnterior);
    const unidad = APP_Units.obtenerUnidadBase(presentacionAnterior);

    // Calcular cuántas unidades base compró esta semana
    let unidadesCompradas = prodActual.cantidad;
    if (unidad === 'litro' && presentacionAnterior.includes('l')) {
      const litrosPorPresentacion = APP_Units.extraerNumero(presentacionAnterior) || 1;
      unidadesCompradas = prodActual.cantidad * litrosPorPresentacion;
    } else if (unidad === 'kg' && presentacionAnterior.includes('kg')) {
      const kgPorPresentacion = APP_Units.extraerNumero(presentacionAnterior) || 1;
      unidadesCompradas = prodActual.cantidad * kgPorPresentacion;
    }

    // Cuánto costaría esta semana a precios normalizados de la semana pasada
    costoSiMismosPrecios += precioNormalizadoAnterior * unidadesCompradas;

    // Cuánto costó realmente
    costoReal += prodActual.precioTotal;
  }

  // Ahorro real = diferencia por precios, no por cantidad
  const ahorroReal = costoSiMismosPrecios - costoReal;

  // Diferencia total
  const diferenciaDinero = actual.total - anterior.total;
  const porcentaje = anterior.total > 0 ? (diferenciaDinero / anterior.total * 100) : 0;

  return {
    ahorroReal,
    diferenciaDinero,
    diferencia: diferenciaDinero,
    porcentaje,
    productosIguales: productosComunes.length,
    productosMenos: productosAnteriores.filter(p => !productosActuales.includes(p)).length,
    productosNuevos: productosActuales.filter(p => !productosAnteriores.includes(p)).length,
    productosComunes
  };
}

function renderDetalleComparacion(comparacion) {
  if (comparacion.productosComunes.length === 0) return '';

  return `
    <div class="detalle-comparacion">
      <div class="section-title">Detalle por producto</div>
      ${comparacion.productosComunes.map(prodId => `
        <div class="item-comparacion" id="detalle-${prodId}">
          Cargando...
        </div>
      `).join('')}
    </div>
  `;
}

async function cargarDetallesComparacion(comparacion) {
  for (const prodId of comparacion.productosComunes) {
    const el = document.getElementById(`detalle-${prodId}`);
    if (!el) continue;

    const semanas = await obtenerSemanasRecientes();
    if (semanas.length < 2) continue;

    const prodActual = semanas[0].productos[prodId];
    const prodAnterior = semanas[1].productos[prodId];

    if (!prodActual || !prodAnterior) continue;

    const precioPromedioActual = prodActual.precios.reduce((a, b) => a + b, 0) / prodActual.precios.length;
    const precioPromedioAnterior = prodAnterior.precios.reduce((a, b) => a + b, 0) / prodAnterior.precios.length;

    // Obtener presentaciones
    const presentacionActual = prodActual.presentaciones[0] || '';
    const presentacionAnterior = prodAnterior.presentaciones[0] || '';

    // Normalizar precios por unidad
    const precioNormalizadoActual = APP_Units.normalizarPrecio(precioPromedioActual, presentacionActual);
    const precioNormalizadoAnterior = APP_Units.normalizarPrecio(precioPromedioAnterior, presentacionAnterior);
    const unidad = APP_Units.obtenerUnidadBase(presentacionActual || presentacionAnterior);

    const cambio = precioNormalizadoActual - precioNormalizadoAnterior;
    const cambioPorcentaje = precioNormalizadoAnterior > 0 ? (cambio / precioNormalizadoAnterior * 100) : 0;

    el.innerHTML = `
      <div class="item-comparacion-info">
        <span class="item-nombre">${prodActual.producto?.nombre || 'Producto'}</span>
        <div class="item-precios">
          <div class="precio-anterior-info">
            <span class="precio-anterior">$${precioPromedioAnterior.toFixed(2)}</span>
            ${presentacionAnterior ? `<span class="presentacion">${presentacionAnterior}</span>` : ''}
          </div>
          <span class="flecha">${cambio < 0 ? '↓' : cambio > 0 ? '↑' : '='}</span>
          <div class="precio-actual-info">
            <span class="precio-actual ${cambio < 0 ? 'bueno' : cambio > 0 ? 'malo' : ''}">$${precioPromedioActual.toFixed(2)}</span>
            ${presentacionActual ? `<span class="presentacion">${presentacionActual}</span>` : ''}
          </div>
        </div>
        <div class="cambio-info">
          <span class="cambio-precio ${cambio < 0 ? 'bueno' : cambio > 0 ? 'malo' : ''}">
            ${cambio < 0 ? '↓' : '+'}${Math.abs(cambioPorcentaje).toFixed(0)}%
          </span>
          ${unidad !== 'unidad' ? `<span class="precio-normalizado">$${precioNormalizadoActual.toFixed(2)}/${unidad}</span>` : ''}
        </div>
      </div>
    `;
  }
}

function renderHistorialSemanas(semanas) {
  if (semanas.length < 2) return '';

  return `
    <div class="card">
      <div class="section-title">📈 Historial de semanas</div>
      ${semanas.map((semana, idx) => `
        <div class="item-semana ${idx === 0 ? 'actual' : ''}">
          <div class="semana-info">
            <div class="semana-fecha">${formatFechaSemana(semana.fechaInicio)}</div>
            <div class="semana-detalle">${semana.numCompras} compras</div>
          </div>
          <div class="semana-total">${APP_Format.money(semana.total)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function formatFechaSemana(fecha) {
  const fin = new Date(fecha);
  fin.setDate(fin.getDate() + 6);
  return `${fecha.getDate()} - ${fin.getDate()} ${fin.toLocaleString('es', { month: 'short' })}`;
}

// Agregar estilos CSS para comparar semanas
function agregarEstilosComparar() {
  const style = document.createElement('style');
  style.textContent = `
    .comparacion-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-3);
      margin: var(--space-5) 0;
      padding: var(--space-4);
      background: var(--gray-50);
      border-radius: var(--radius-lg);
    }

    .semana-info {
      text-align: center;
      flex: 1;
    }

    .semana-label {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .semana-fecha {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--text);
      margin-bottom: 4px;
    }

    .semana-total {
      font-size: var(--text-lg);
      font-weight: 700;
      color: var(--primary);
      font-family: var(--font-mono);
    }

    .flecha-comparacion {
      font-size: var(--text-2xl);
      font-weight: 700;
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-full);
    }

    .flecha-comparacion.mejor {
      background: var(--green-100);
      color: var(--green-600);
    }

    .flecha-comparacion.peor {
      background: var(--coral-100);
      color: var(--coral-600);
    }

    .insights-section {
      margin-top: var(--space-5);
    }

    .insight-card {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-3);
    }

    .insight-card.positivo {
      background: linear-gradient(135deg, var(--green-50), var(--green-100));
      border: 2px solid var(--green-200);
    }

    .insight-card.negativo {
      background: linear-gradient(135deg, var(--coral-50), var(--coral-100));
      border: 2px solid var(--coral-200);
    }

    .insight-card.neutro {
      background: var(--orange-50);
      border: 2px solid var(--orange-200);
    }

    .insight-icon {
      font-size: 1.5rem;
    }

    .insight-content {
      flex: 1;
    }

    .insight-title {
      font-weight: 600;
      font-size: var(--text-sm);
      margin-bottom: 4px;
    }

    .insight-detail {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .detalle-comparacion {
      margin-top: var(--space-5);
    }

    .item-comparacion {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3);
      background: var(--gray-50);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-2);
    }

    .item-comparacion-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .item-precios {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .precio-anterior {
      color: var(--text-secondary);
      font-size: var(--text-sm);
    }

    .flecha {
      color: var(--text-muted);
    }

    .precio-actual {
      font-weight: 700;
      font-family: var(--font-mono);
    }

    .precio-actual.bueno {
      color: var(--green-600);
    }

    .precio-actual.malo {
      color: var(--coral-600);
    }

    .cambio-precio {
      font-size: var(--text-xs);
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .cambio-precio.bueno {
      background: var(--green-100);
      color: var(--green-600);
    }

    .cambio-precio.malo {
      background: var(--coral-100);
      color: var(--coral-600);
    }

    .item-semana {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border);
    }

    .item-semana:last-child {
      border-bottom: none;
    }

    .item-semana.actual {
      background: var(--orange-50);
      margin: calc(var(--space-3) * -1);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      border-bottom: none;
    }

    .item-semana .semana-detalle {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .item-semana .semana-total {
      font-weight: 700;
      font-family: var(--font-mono);
    }

    .btn-comparar-semanas {
      cursor: pointer;
      background: linear-gradient(135deg, var(--orange-50), var(--amber-50));
      border: 2px dashed var(--orange-300);
      transition: all var(--transition);
    }

    .btn-comparar-semanas:hover {
      border-style: solid;
      border-color: var(--orange-400);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .btn-predicciones {
      cursor: pointer;
      background: linear-gradient(135deg, #eef2ff, #e0e7ff);
      border: 2px dashed #a5b4fc;
      transition: all var(--transition);
    }

    .btn-predicciones:hover {
      border-style: solid;
      border-color: #818cf8;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
      transform: translateY(-2px);
    }

    .precio-anterior-info,
    .precio-actual-info {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .presentacion {
      font-size: 0.65rem;
      color: var(--text-muted);
      background: var(--gray-100);
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      margin-top: 2px;
    }

    .cambio-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .precio-normalizado {
      font-size: 0.65rem;
      color: var(--green-600);
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
}

// Inicializar estilos
agregarEstilosComparar();
