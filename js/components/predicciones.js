// Predicciones - Análisis de tendencias y predicción de precios
APP_Pages.predicciones = async function() {
  const container = document.getElementById('app-content');
  const productos = await APP_DB.getAllProductos();

  // Analizar tendencias de productos con suficiente historial
  const analisis = [];
  for (const prod of productos) {
    const historial = await APP_DB.getPreciosByProducto(prod.id);
    if (historial.length >= 4) { // Mínimo 4 compras para analizar
      const tendencia = analizarTendencia(historial);
      if (tendencia) {
        analisis.push({
          producto: prod,
          tendencia
        });
      }
    }
  }

  // Ordenar por urgencia de compra
  analisis.sort((a, b) => b.tendencia.urgencia - a.tendencia.urgencia);

  container.innerHTML = `
    <button class="btn-back" onclick="volverAPrecios()">← Volver a Precios</button>

    <div class="card card-hero-prediccion">
      <div class="card-header">
        <span class="card-title">🔮 Predicciones de Precio</span>
      </div>
      <p class="text-secondary">Basado en tu historial de compras</p>
    </div>

    ${analisis.length === 0
      ? '<div class="empty-state"><div class="empty-state-icon">📈</div><p>Necesitas al menos 4 compras por producto para predecir tendencias</p></div>'
      : `
        <div class="card">
          <div class="section-title">🎯 Recomendaciones de compra</div>
          ${analisis.filter(a => a.tendencia.urgencia > 60).slice(0, 5).map(a => renderRecomendacion(a)).join('')}
        </div>

        <div class="card">
          <div class="section-title">📊 Tendencias de precios</div>
          ${analisis.map(a => renderTendencia(a)).join('')}
        </div>
      `
    }

    <div class="card">
      <div class="section-title">💡 Consejos</div>
      <div class="consejo-item">
        <span class="consejo-icon">📦</span>
        <span>Compra anticipadamente cuando el precio esté bajo</span>
      </div>
      <div class="consejo-item">
        <span class="consejo-icon">📈</span>
        <span>Los precios suelen subir en fin de mes y quincena</span>
      </div>
      <div class="consejo-item">
        <span class="consejo-icon">🏷️</span>
        <span>Compara entre tiendas para encontrar el mejor precio</span>
      </div>
    </div>
  `;
};

function analizarTendencia(historial) {
  if (historial.length < 3) return null;

  // Ordenar por fecha
  const ordenado = [...historial].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Extraer precios y fechas
  const precios = ordenado.map(h => h.precio);
  const fechas = ordenado.map(h => new Date(h.fecha).getTime());

  // Calcular promedio móvil (últimas 3 compras)
  const promedioMovil = precios.slice(-3).reduce((a, b) => a + b, 0) / 3;

  // Calcular tendencia lineal (regresión simple)
  const n = precios.length;
  const sumX = fechas.reduce((a, b) => a + b, 0);
  const sumY = precios.reduce((a, b) => a + b, 0);
  const sumXY = fechas.reduce((sum, x, i) => sum + x * precios[i], 0);
  const sumX2 = fechas.reduce((sum, x) => sum + x * x, 0);

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercepto = (sumY - pendiente * sumX) / n;

  // Calcular R² (bondad de ajuste)
  const mediaY = sumY / n;
  const ssTotal = precios.reduce((sum, y) => sum + Math.pow(y - mediaY, 2), 0);
  const ssResiduos = precios.reduce((sum, y, i) => {
    const predicho = intercepto + pendiente * fechas[i];
    return sum + Math.pow(y - predicho, 2);
  }, 0);
  const r2 = 1 - (ssResiduos / ssTotal);

  // Predecir precio en 7 días
  const ahora = Date.now();
  const en7Dias = ahora + 7 * 24 * 60 * 60 * 1000;
  const en30Dias = ahora + 30 * 24 * 60 * 60 * 1000;
  const precioPredicho7 = intercepto + pendiente * en7Dias;
  const precioPredicho30 = intercepto + pendiente * en30Dias;

  // Calcular volatilidad (desviación estándar)
  const desviacion = Math.sqrt(precios.reduce((sum, p) => sum + Math.pow(p - promedioMovil, 2), 0) / precios.length);
  const volatilidad = (desviacion / promedioMovil) * 100;

  // Calcular urgencia de compra (0-100)
  let urgencia = 50;
  if (pendiente > 0) {
    // Tendencia alcista → comprar pronto
    urgencia = Math.min(90, 50 + (pendiente / promedioMovil * 1000));
  } else if (pendiente < 0) {
    // Bajista → esperar
    urgencia = Math.max(10, 50 + (pendiente / promedioMovil * 1000));
  }

  // Detectar patrón estacional
  const patrónEstacional = detectarPatronEstacional(ordenado);

  return {
    precios,
    fechas: ordenado.map(h => h.fecha),
    promedioMovil,
    pendiente,
    r2,
    precioPredicho7: Math.max(0, precioPredicho7),
    precioPredicho30: Math.max(0, precioPredicho30),
    volatilidad,
    urgencia,
    patrónEstacional,
    precioActual: precios[precios.length - 1],
    precioMin: Math.min(...precios),
    precioMax: Math.max(...precios),
    tiendaActual: ordenado[ordenado.length - 1].tienda
  };
}

function detectarPatronEstacional(historial) {
  if (historial.length < 6) return null;

  // Agrupar por mes
  const porMes = {};
  for (const h of historial) {
    const mes = new Date(h.fecha).getMonth();
    if (!porMes[mes]) porMes[mes] = [];
    porMes[mes].push(h.precio);
  }

  // Calcular promedio por mes
  const promediosPorMes = {};
  for (const [mes, precios] of Object.entries(porMes)) {
    promediosPorMes[mes] = precios.reduce((a, b) => a + b, 0) / precios.length;
  }

  // Encontrar meses más baratos y más caros
  const mesesOrdenados = Object.entries(promediosPorMes).sort((a, b) => a[1] - b[1]);
  const mesMasBarato = mesesOrdenados[0];
  const mesMasCaro = mesesOrdenados[mesesOrdenados.length - 1];

  return {
    promediosPorMes,
    mesMasBarato: parseInt(mesMasBarato[0]),
    mesMasCaro: parseInt(mesMasCaro[0]),
    precioBarato: mesMasBarato[1],
    precioCaro: mesMasCaro[1]
  };
}

function renderRecomendacion(data) {
  const { producto, tendencia } = data;
  const cat = APP_CATEGORIAS[producto.categoria] || APP_CATEGORIAS.otros;

  let icono, color, mensaje;
  if (tendencia.urgencia > 75) {
    icono = '🔴';
    color = 'urgente';
    mensaje = '¡Compra AHORA! El precio va a subir';
  } else if (tendencia.urgencia > 60) {
    icono = '🟡';
    color = 'alerta';
    mensaje = 'Compra pronto, precio en tendencia subida';
  } else {
    icono = '🟢';
    color = 'normal';
    mensaje = 'Precio estable, puedes esperar';
  }

  return `
    <div class="recomendacion-item ${color}">
      <div class="recomendacion-icon">${icono}</div>
      <div class="recomendacion-info">
        <div class="recomendacion-nombre">${cat.icono} ${producto.nombre}</div>
        <div class="recomendacion-mensaje">${mensaje}</div>
        <div class="recomendacion-precio">
          Actual: $${tendencia.precioActual.toFixed(2)} → Predicción 7 días: $${tendencia.precioPredicho7.toFixed(2)}
        </div>
      </div>
      <div class="recomendacion-urgencia">${Math.round(tendencia.urgencia)}%</div>
    </div>
  `;
}

function renderTendencia(data) {
  const { producto, tendencia } = data;
  const cat = APP_CATEGORIAS[producto.categoria] || APP_CATEGORIAS.otros;

  const tendenciaIcono = tendencia.pendiente > 0 ? '📈' : tendencia.pendiente < 0 ? '📉' : '➡️';
  const tendenciaColor = tendencia.pendiente > 0 ? 'subida' : tendencia.pendiente < 0 ? 'bajada' : 'estable';

  return `
    <div class="tendencia-item">
      <div class="tendencia-header">
        <span class="tendencia-nombre">${cat.icono} ${producto.nombre}</span>
        <span class="tendencia-icono ${tendenciaColor}">${tendenciaIcono}</span>
      </div>

      <div class="tendencia-stats">
        <div class="stat-mini">
          <span class="stat-mini-label">Actual</span>
          <span class="stat-mini-valor">$${tendencia.precioActual.toFixed(2)}</span>
        </div>
        <div class="stat-mini">
          <span class="stat-mini-label">Min</span>
          <span class="stat-mini-valor bueno">$${tendencia.precioMin.toFixed(2)}</span>
        </div>
        <div class="stat-mini">
          <span class="stat-mini-label">Max</span>
          <span class="stat-mini-valor malo">$${tendencia.precioMax.toFixed(2)}</span>
        </div>
      </div>

      <div class="tendencia-predicciones">
        <div class="prediccion">
          <span class="prediccion-label">En 7 días:</span>
          <span class="prediccion-valor ${tendencia.precioPredicho7 > tendencia.precioActual ? 'malo' : 'bueno'}">
            $${tendencia.precioPredicho7.toFixed(2)}
            ${tendencia.precioPredicho7 > tendencia.precioActual ? '↑' : '↓'}
          </span>
        </div>
        <div class="prediccion">
          <span class="prediccion-label">En 30 días:</span>
          <span class="prediccion-valor ${tendencia.precioPredicho30 > tendencia.precioActual ? 'malo' : 'bueno'}">
            $${tendencia.precioPredicho30.toFixed(2)}
            ${tendencia.precioPredicho30 > tendencia.precioActual ? '↑' : '↓'}
          </span>
        </div>
      </div>

      ${tendencia.patrónEstacional ? `
        <div class="patron-estacional">
          <span class="patron-label">Patrón estacional:</span>
          <span class="patron-info">
            Más barato en ${nombreMes(tendencia.patrónEstacional.mesMasBarato)} ($${tendencia.patrónEstacional.precioBarato.toFixed(2)})
            | Más caro en ${nombreMes(tendencia.patrónEstacional.mesMasCaro)} ($${tendencia.patrónEstacional.precioCaro.toFixed(2)})
          </span>
        </div>
      ` : ''}

      <div class="tendencia-meta">
        <span>Confianza: ${Math.round(tendencia.r2 * 100)}%</span>
        <span>Volatilidad: ${tendencia.volatilidad.toFixed(1)}%</span>
        <span>Tiendas: ${tendencia.tiendaActual}</span>
      </div>
    </div>
  `;
}

function nombreMes(mes) {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return meses[mes];
}

// Estilos CSS para predicciones
function agregarEstilosPredicciones() {
  const style = document.createElement('style');
  style.textContent = `
    .card-hero-prediccion {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
    }

    .card-hero-prediccion .card-title {
      color: white;
    }

    .card-hero-prediccion .text-secondary {
      color: rgba(255, 255, 255, 0.8);
    }

    .recomendacion-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-3);
      border: 2px solid;
    }

    .recomendacion-item.urgente {
      background: linear-gradient(135deg, #fef2f2, #fee2e2);
      border-color: #fecaca;
    }

    .recomendacion-item.alerta {
      background: linear-gradient(135deg, #fffbeb, #fef3c7);
      border-color: #fde68a;
    }

    .recomendacion-item.normal {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border-color: #bbf7d0;
    }

    .recomendacion-icon {
      font-size: 1.5rem;
    }

    .recomendacion-info {
      flex: 1;
    }

    .recomendacion-nombre {
      font-weight: 600;
      font-size: var(--text-sm);
    }

    .recomendacion-mensaje {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .recomendacion-precio {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      margin-top: 4px;
      font-family: var(--font-mono);
    }

    .recomendacion-urgencia {
      font-size: var(--text-lg);
      font-weight: 700;
      font-family: var(--font-mono);
    }

    .tendencia-item {
      padding: var(--space-4);
      background: var(--gray-50);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-3);
    }

    .tendencia-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-3);
    }

    .tendencia-nombre {
      font-weight: 600;
    }

    .tendencia-icono {
      font-size: 1.25rem;
    }

    .tendencia-icono.subida { color: var(--coral-500); }
    .tendencia-icono.bajada { color: var(--green-500); }
    .tendencia-icono.estable { color: var(--gray-400); }

    .tendencia-stats {
      display: flex;
      gap: var(--space-4);
      margin-bottom: var(--space-3);
    }

    .stat-mini {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-mini-label {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .stat-mini-valor {
      font-weight: 700;
      font-family: var(--font-mono);
    }

    .stat-mini-valor.bueno { color: var(--green-600); }
    .stat-mini-valor.malo { color: var(--coral-600); }

    .tendencia-predicciones {
      display: flex;
      gap: var(--space-4);
      padding: var(--space-3);
      background: white;
      border-radius: var(--radius-md);
      margin-bottom: var(--space-3);
    }

    .prediccion {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .prediccion-label {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .prediccion-valor {
      font-weight: 700;
      font-family: var(--font-mono);
      font-size: var(--text-sm);
    }

    .prediccion-valor.bueno { color: var(--green-600); }
    .prediccion-valor.malo { color: var(--coral-600); }

    .patron-estacional {
      padding: var(--space-3);
      background: var(--amber-50);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-3);
      font-size: var(--text-xs);
    }

    .patron-label {
      font-weight: 600;
      color: var(--amber-700);
    }

    .patron-info {
      color: var(--amber-600);
    }

    .tendencia-meta {
      display: flex;
      gap: var(--space-4);
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .consejo-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border);
    }

    .consejo-item:last-child {
      border-bottom: none;
    }

    .consejo-icon {
      font-size: 1.25rem;
    }
  `;
  document.head.appendChild(style);
}

agregarEstilosPredicciones();
