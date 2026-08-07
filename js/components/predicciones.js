// Predicciones - Análisis de tendencias y predicción de precios usando Chart.js
APP_Pages.predicciones = async function() {
  const container = document.getElementById('app-content');
  
  container.innerHTML = `
    <div class="loading">Analizando historial de precios...</div>
  `;

  try {
    const res = await fetch('tendencias.json?v=' + Date.now());
    if (!res.ok) throw new Error("No hay historial disponible");
    const tendencias = await res.json();
    
    if (tendencias.length === 0) {
      container.innerHTML = `
        <div class="card card-hero-prediccion">
          <div class="card-header">
            <span class="card-title">🔮 Predicciones de Precio</span>
          </div>
        </div>
        <div class="empty-state"><div class="empty-state-icon">📈</div><p>Aún no hay historial suficiente para predecir tendencias</p></div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card card-hero-prediccion">
        <div class="card-header">
          <span class="card-title">🔮 Predicciones de Precio</span>
        </div>
        <p class="text-secondary">Analizando el historial de ${tendencias.length} productos (últimos 30 días)</p>
      </div>

      <div class="card">
        <div class="section-title">📊 Historial y Tendencias</div>
        <div id="graficas-container"></div>
      </div>
      
      <div class="card">
        <div class="section-title">💡 Consejos</div>
        <div class="consejo-item">
          <span class="consejo-icon">📦</span>
          <span>Compra anticipadamente cuando la línea de precio vaya hacia abajo</span>
        </div>
        <div class="consejo-item">
          <span class="consejo-icon">📈</span>
          <span>Si la línea roja sube rápido, considera alternativas de otras tiendas</span>
        </div>
      </div>
    `;

    const graficasContainer = document.getElementById('graficas-container');
    
    // Crear una gráfica para cada producto
    tendencias.forEach((prod, index) => {
      // Filtrar historial vacío
      if (!prod.historial || prod.historial.length === 0) return;
      
      const fechas = prod.historial.map(h => h.fecha.slice(5)); // DD-MM
      const precios = prod.historial.map(h => h.precio);
      const minPrecio = Math.min(...precios);
      const maxPrecio = Math.max(...precios);
      const precioActual = precios[precios.length - 1];
      const tendencia = precioActual > precios[0] ? 'subida' : 'bajada';
      
      // Contenedor de la gráfica
      const div = document.createElement('div');
      div.className = 'tendencia-item';
      div.innerHTML = `
        <div class="tendencia-header">
          <div style="display:flex; align-items:center; gap: 8px;">
            <img src="${prod.imagen || 'icons/icon.svg'}" alt="${prod.nombre}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">
            <div>
              <span class="tendencia-nombre" style="display:block;">${prod.nombre}</span>
              <span class="text-secondary" style="font-size:12px;">${prod.tienda} - Actual: $${precioActual.toFixed(2)}</span>
            </div>
          </div>
          <span class="tendencia-icono ${tendencia}">${tendencia === 'subida' ? '📈' : '📉'}</span>
        </div>
        <div class="grafica-wrapper" style="position: relative; height: 200px; width: 100%; margin-top: 16px;">
          <canvas id="chart-${index}"></canvas>
        </div>
      `;
      graficasContainer.appendChild(div);
      
      // Dibujar la gráfica
      const ctx = document.getElementById(`chart-${index}`).getContext('2d');
      const isBajada = tendencia === 'bajada';
      const colorLinea = isBajada ? '#10b981' : '#f43f5e'; // Verde si baja, Rojo si sube
      const colorFondo = isBajada ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)';
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: fechas,
          datasets: [{
            label: 'Precio',
            data: precios,
            borderColor: colorLinea,
            backgroundColor: colorFondo,
            borderWidth: 2,
            pointBackgroundColor: colorLinea,
            pointRadius: 3,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              min: Math.floor(minPrecio * 0.9), // Margen inferior
              max: Math.ceil(maxPrecio * 1.1),  // Margen superior
              ticks: {
                callback: function(value) { return '$' + value; }
              }
            }
          }
        }
      });
    });

  } catch(e) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>No se pudo cargar el historial de tendencias.</p>
        <p class="text-secondary" style="font-size:12px;">El archivo tendencias.json aún no se ha generado.</p>
      </div>
    `;
  }
};

// Estilos CSS para predicciones (Mantenemos los que sirven y añadimos nuevos)
function agregarEstilosPredicciones() {
  if (document.getElementById('styles-predicciones')) return;
  
  const style = document.createElement('style');
  style.id = 'styles-predicciones';
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

    .tendencia-item {
      padding: var(--space-4);
      background: var(--gray-50);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-4);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .tendencia-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tendencia-nombre {
      font-weight: 600;
      font-size: 14px;
    }

    .tendencia-icono {
      font-size: 1.5rem;
    }

    .tendencia-icono.subida { color: var(--coral-500); }
    .tendencia-icono.bajada { color: var(--green-500); }

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
