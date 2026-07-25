// Configuración - Exportar/Importar datos
APP_Pages.config = async function() {
  const container = document.getElementById('app-content');
  const ubicacion = await APP_DB.getUbicacion();
  const productos = await APP_DB.getAllProductos();
  const compras = await APP_DB.getAllCompras();

  container.innerHTML = `
    <button class="btn-back" onclick="window.location.hash='#precios'">← Volver</button>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Configuración</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">📍 Ubicación</span>
      </div>
      <p class="text-secondary" style="margin-bottom: 12px">${ubicacion?.ciudad || 'No configurada'}</p>
      <button class="btn btn-secondary" id="btn-cambiar-ubicacion">Cambiar ciudad</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">📦 Datos</span>
      </div>
      <div class="config-stats">
        <div class="config-stat">
          <span class="config-stat-value">${productos.length}</span>
          <span class="config-stat-label">Productos</span>
        </div>
        <div class="config-stat">
          <span class="config-stat-value">${compras.length}</span>
          <span class="config-stat-label">Compras</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">💾 Exportar datos</span>
      </div>
      <p class="text-secondary" style="margin-bottom: 12px">Descarga todos tus datos como archivo JSON</p>
      <button class="btn btn-primary" style="width:100%" id="btn-exportar">Exportar JSON</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">📥 Importar datos</span>
      </div>
      <p class="text-secondary" style="margin-bottom: 12px">Carga datos desde un archivo JSON de respaldo</p>
      <input type="file" id="input-importar" accept=".json" style="display:none">
      <button class="btn btn-secondary" style="width:100%" id="btn-importar">Seleccionar archivo</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">🗑️ Borrar datos</span>
      </div>
      <p class="text-secondary" style="margin-bottom: 12px">Elimina todos los datos localmente</p>
      <button class="btn btn-secondary" style="width:100%; color: var(--coral-600)" id="btn-borrar">Borrar todo</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">ℹ️ Acerca de</span>
      </div>
      <p class="text-secondary">MiDespensita v1.0</p>
      <p class="text-secondary">Tu lista de compras favorita</p>
      <a href="https://github.com/edhepe-project/MiDespensita" target="_blank" class="btn btn-secondary" style="margin-top: 12px; width: 100%; text-align: center; text-decoration: none">
        Ver en GitHub
      </a>
    </div>
  `;

  bindConfigEvents();
};

function bindConfigEvents() {
  // Cambiar ubicación
  document.getElementById('btn-cambiar-ubicacion').addEventListener('click', async () => {
    const ciudad = prompt('¿En qué ciudad estás?');
    if (ciudad && ciudad.trim()) {
      await APP_DB.setUbicacion(ciudad.trim(), '');
      document.getElementById('ubicacion-header').textContent = ciudad.trim();
      APP_Pages.config();
    }
  });

  // Exportar datos
  document.getElementById('btn-exportar').addEventListener('click', async () => {
    const data = {
      version: '1.0',
      fecha: new Date().toISOString(),
      ubicacion: await APP_DB.getUbicacion(),
      productos: await APP_DB.getAllProductos(),
      compras: await APP_DB.getAllCompras(),
      precios: await db.precios.toArray(),
      listas: await db.listas.toArray(),
      items_lista: await db.items_lista.toArray()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `midespensita-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert('Datos exportados correctamente');
  });

  // Importar datos
  document.getElementById('btn-importar').addEventListener('click', () => {
    document.getElementById('input-importar').click();
  });

  document.getElementById('input-importar').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.productos) {
        alert('Archivo no válido');
        return;
      }

      if (confirm('¿Importar estos datos? Se sobrescribirán los datos actuales.')) {
        // Limpiar datos actuales
        await db.productos.clear();
        await db.precios.clear();
        await db.compras.clear();
        await db.detalle_compra.clear();
        await db.listas.clear();
        await db.items_lista.clear();

        // Importar productos
        for (const prod of data.productos) {
          await db.productos.add(prod);
        }

        // Importar precios
        for (const precio of data.precios) {
          await db.precios.add(precio);
        }

        // Importar compras
        for (const compra of data.compras) {
          await db.compras.add(compra);
        }

        // Importar ubicación
        if (data.ubicacion) {
          await APP_DB.setUbicacion(data.ubicacion.ciudad, data.ubicacion.region);
        }

        alert('Datos importados correctamente');
        APP_Pages.config();
      }
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
  });

  // Borrar datos
  document.getElementById('btn-borrar').addEventListener('click', async () => {
    if (confirm('¿Estás seguro de borrar TODOS los datos? Esta acción no se puede deshacer.')) {
      await db.productos.clear();
      await db.precios.clear();
      await db.compras.clear();
      await db.detalle_compra.clear();
      await db.listas.clear();
      await db.items_lista.clear();
      localStorage.clear();

      alert('Datos borrados');
      window.location.hash = '#comprar';
      location.reload();
    }
  });
}
