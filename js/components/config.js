// Configuración - Exportar/Importar datos
APP_Pages.config = async function() {
  const container = document.getElementById('app-content');
  const ubicacion = await APP_DB.getUbicacion();
  const productos = await APP_DB.getAllProductos();
  const compras = await APP_DB.getAllCompras();

  const codFamiliarAjeno = localStorage.getItem('midespensita_familia_codigo_ajeno');
  const codFamiliarPropio = localStorage.getItem('midespensita_familia_codigo_propio');
  let presupuestoSemanal = localStorage.getItem('midespensita_presupuesto_semana') || '';
  let soloLecturaPresupuesto = false;

  if (codFamiliarAjeno || codFamiliarPropio) {
    if (window.APP_Sync) {
      const famData = await APP_Sync.getListaFamiliar();
      if (famData && famData.presupuesto) {
        presupuestoSemanal = famData.presupuesto;
        // Sincronizar localmente también
        localStorage.setItem('midespensita_presupuesto_semana', presupuestoSemanal);
      }
    }
    if (codFamiliarAjeno) {
      soloLecturaPresupuesto = true;
    }
  }

  container.innerHTML = `
    <button class="btn-back" onclick="history.back()">← Volver</button>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Configuración</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">👤 Mi nombre</span>
      </div>
      <p class="text-secondary" style="margin-bottom: 12px; font-size: var(--text-sm)">
        Así aparecerás en las notificaciones familiares.
      </p>
      <div style="display: flex; gap: 8px">
        <input type="text" class="form-input" id="input-mi-nombre"
          placeholder="Ej: Mamá, Papá, Juan..."
          value="${localStorage.getItem('midespensita_nombre') || ''}"
          style="flex:1; font-size: var(--text-sm)">
        <button class="btn btn-primary" id="btn-guardar-nombre" style="white-space: nowrap">Guardar</button>
      </div>
      <p id="nombre-estado" style="font-size: 11px; margin-top: 6px; color: var(--text-muted)">
        ${localStorage.getItem('midespensita_nombre') ? '✅ Nombre: ' + localStorage.getItem('midespensita_nombre') : ''}
      </p>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">👨‍👩‍👦 Lista Familiar</span>
      </div>

      <div id="familia-dueno">
        <p class="text-secondary" style="margin-bottom: 12px; font-size: var(--text-sm)">
          Comparte tu lista con tu familia. Ellos podrán agregar productos y tú los ves al ir al super.
        </p>
        <button class="btn btn-primary" style="width:100%; margin-bottom: 8px" id="btn-compartir-lista">
          🔗 Generar código de invitación
        </button>
        <div id="familia-codigo-display" style="display:none" class="familia-codigo-box">
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px">Comparte este código con tu familiar:</p>
          <div class="familia-codigo-texto" id="familia-codigo-texto"></div>
          <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px" id="familia-expira-texto"></p>
          <button class="btn btn-secondary" style="width:100%; margin-top:8px" id="btn-copiar-codigo">
            📋 Copiar código
          </button>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border); margin: 12px 0"></div>

      <div id="familia-miembro">
        <p class="text-secondary" style="margin-bottom: 8px; font-size: var(--text-sm)">
          ¿Tu familiar ya tiene la app? Únete a su lista con su código:
        </p>
        <div style="display: flex; gap: 8px">
          <input type="text" class="form-input" id="input-codigo-familiar"
            placeholder="p.ej: tigre-mango-luna" style="flex:1; font-size: var(--text-sm)">
          <button class="btn btn-primary" id="btn-unirse-lista" style="white-space: nowrap">Unirse</button>
        </div>
        <p id="familia-unido-estado" style="font-size: 11px; margin-top: 6px; color: var(--text-muted)">
          ${localStorage.getItem('midespensita_familia_codigo_ajeno')
            ? '✅ Conectado a lista: ' + localStorage.getItem('midespensita_familia_codigo_ajeno')
            : ''}
        </p>
      </div>

      ${(localStorage.getItem('midespensita_familia_codigo_propio') || localStorage.getItem('midespensita_familia_codigo_ajeno')) ? `
      <div style="border-top: 1px solid var(--border); margin: 12px 0"></div>
      <button class="btn btn-secondary" id="btn-salir-lista" style="width:100%; color: var(--coral-600); border-color: var(--coral-600)">
        🚪 Salir de lista familiar
      </button>
      <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px; text-align: center">
        Volverás al modo personal. Tus datos locales no se borran.
      </p>
      ` : ''}
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">🔔 Notificaciones</span>
      </div>
      ${APP_Push?.esCompatible() ? `
        <p class="text-secondary" style="margin-bottom: 12px; font-size: var(--text-sm)">
          Recibe una alerta en tu celular cuando alguien agregue algo a la lista familiar.
        </p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-primary" style="flex:1" id="btn-activar-notif">
            ${localStorage.getItem('midespensita_push_activo') === '1' ? '🔕 Desactivar' : '🔔 Activar'}
          </button>
          <button class="btn btn-secondary" style="flex:1; display: ${localStorage.getItem('midespensita_push_activo') === '1' ? 'block' : 'none'}" id="btn-probar-notif">
            🧪 Probar
          </button>
        </div>
        <p id="notif-estado" style="font-size: 11px; margin-top: 8px; color: var(--text-muted)">
          ${localStorage.getItem('midespensita_push_activo') === '1' ? '✅ Notificaciones activas' : ''}
        </p>
      ` : `
        <p class="text-secondary" style="font-size: var(--text-sm)">
          ⚠️ Tu navegador no soporta notificaciones push. Instala la app en la pantalla de inicio para habilitarlas.
        </p>
      `}
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">💰 Presupuesto Semanal</span>
      </div>
      <p class="text-secondary" style="margin-bottom: 12px; font-size: var(--text-sm)">
        ${soloLecturaPresupuesto 
          ? 'El presupuesto es definido por el creador de la lista familiar.' 
          : 'Define cuánto quieres gastar por semana. Verás una barra de progreso en tu lista de compras.'}
      </p>
      <div style="display: flex; gap: 8px; align-items: center">
        <span style="color: var(--text-muted); font-size: 16px; font-weight: 600">$</span>
        <input type="number" inputmode="decimal" class="form-input" id="input-presupuesto"
          placeholder="Ej: 1500" min="0" step="50"
          value="${presupuestoSemanal}"
          ${soloLecturaPresupuesto ? 'disabled' : ''}
          style="flex:1">
        ${!soloLecturaPresupuesto ? `<button class="btn btn-primary" id="btn-guardar-presupuesto">Guardar</button>` : ''}
      </div>
      <p id="presupuesto-estado" style="font-size:11px; margin-top:6px; color:var(--text-muted)">
        ${presupuestoSemanal
          ? '✅ Presupuesto: $' + parseFloat(presupuestoSemanal).toLocaleString('es-MX') + ' / semana'
          : 'Sin presupuesto configurado'}
      </p>
      ${(presupuestoSemanal && !soloLecturaPresupuesto) ? `
      <button class="btn btn-secondary" id="btn-quitar-presupuesto" style="margin-top:6px; font-size:12px; color:var(--text-muted)">
        × Quitar presupuesto
      </button>` : ''}
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
        <span class="card-title">📄 Generar Reporte PDF</span>
      </div>
      <p class="text-secondary" style="margin-bottom: 12px">Descarga tu lista de compras y catálogo de precios en formato PDF limpio para imprimir o compartir.</p>
      <button class="btn btn-primary" style="width:100%" id="btn-exportar-pdf">Generar PDF</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">💾 Crear Respaldo (Backup)</span>
      </div>
      <p class="text-secondary" style="margin-bottom: 12px">Guarda tus datos en formato JSON para no perderlos si cambias de equipo.</p>
      <button class="btn btn-secondary" style="width:100%" id="btn-exportar">Exportar Backup JSON</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">📥 Restaurar Respaldo</span>
      </div>
      <p class="text-secondary" style="margin-bottom: 12px">Carga tus datos desde un archivo JSON de respaldo.</p>
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
  // ---- NOMBRE ----
  document.getElementById('btn-guardar-nombre').addEventListener('click', () => {
    const nombre = document.getElementById('input-mi-nombre').value.trim();
    if (!nombre) return alert('Escribe un nombre primero');
    localStorage.setItem('midespensita_nombre', nombre);
    document.getElementById('nombre-estado').textContent = '✅ Nombre: ' + nombre;
    document.getElementById('nombre-estado').style.color = 'var(--green-600, #16a34a)';
  });

  // ---- LISTA FAMILIAR ----
  document.getElementById('btn-compartir-lista').addEventListener('click', async () => {
    const btn = document.getElementById('btn-compartir-lista');
    btn.textContent = 'Generando...';
    btn.disabled = true;

    const data = await APP_Sync.crearListaFamiliar();
    if (data && data.codigo) {
      document.getElementById('familia-codigo-texto').textContent = data.codigo;
      const expira = new Date(data.expira_en);
      document.getElementById('familia-expira-texto').textContent =
        `Expira el ${expira.toLocaleDateString('es', { day: 'numeric', month: 'long' })}`;
      document.getElementById('familia-codigo-display').style.display = 'block';
      btn.textContent = '🔗 Tu código (ya generado)';
    } else {
      alert('Necesitas conexión a internet para generar el código');
      btn.textContent = '🔗 Generar código de invitación';
    }
    btn.disabled = false;
  });

  // Mostrar código si ya existe
  const codigoPropio = localStorage.getItem('midespensita_familia_codigo_propio');
  if (codigoPropio) {
    document.getElementById('familia-codigo-texto').textContent = codigoPropio;
    document.getElementById('familia-codigo-display').style.display = 'block';
    document.getElementById('btn-compartir-lista').textContent = '🔗 Tu código (ya generado)';
  }

  document.getElementById('btn-copiar-codigo')?.addEventListener('click', () => {
    const codigo = document.getElementById('familia-codigo-texto').textContent;
    navigator.clipboard.writeText(codigo).then(() => {
      const btn = document.getElementById('btn-copiar-codigo');
      btn.textContent = '✅ Copiado!';
      setTimeout(() => { btn.textContent = '📋 Copiar código'; }, 2000);
    });
  });

  document.getElementById('btn-unirse-lista').addEventListener('click', async () => {
    const input = document.getElementById('input-codigo-familiar');
    const codigo = input.value.trim();
    if (!codigo) return alert('Escribe el código primero');

    const btn = document.getElementById('btn-unirse-lista');
    btn.textContent = '...';
    btn.disabled = true;

    const result = await APP_Sync.unirseALista(codigo);
    if (result.success) {
      document.getElementById('familia-unido-estado').textContent = '✅ Conectado a lista: ' + codigo;
      document.getElementById('familia-unido-estado').style.color = 'var(--orange-600)';
      alert('¡Te uniste exitosamente! Ahora puedes agregar productos desde esta app.');
      APP_Pages.config();
    } else {
      alert('Error: ' + (result.error || 'Código no válido'));
    }
    btn.textContent = 'Unirse';
    btn.disabled = false;
  });


  // ---- SALIR DE LISTA FAMILIAR ----
  document.getElementById('btn-salir-lista')?.addEventListener('click', () => {
    if (confirm('¿Seguro que quieres salir de la lista familiar? Volverás al modo personal.')) {
      localStorage.removeItem('midespensita_familia_codigo_propio');
      localStorage.removeItem('midespensita_familia_codigo_ajeno');
      localStorage.removeItem('midespensita_lista_familiar_cache');
      localStorage.removeItem('midespensita_push_activo');
      alert('✅ Saliste de la lista familiar. Ahora estás en modo personal.');
      APP_Pages.config();
    }
  });

  // ---- NOTIFICACIONES PUSH ----
  document.getElementById('btn-activar-notif')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-activar-notif');
    const estado = document.getElementById('notif-estado');

    const yaActivo = localStorage.getItem('midespensita_push_activo') === '1';

    if (yaActivo) {
      await APP_Push.desactivar();
      btn.textContent = '🔔 Activar notificaciones';
      estado.textContent = '';
      return;
    }

    btn.textContent = '...';
    btn.disabled = true;

    const lista_codigo = APP_Sync.getCodigoFamilia();
    if (!lista_codigo) {
      alert('Primero únete o crea una lista familiar para activar las notificaciones.');
      btn.textContent = '🔔 Activar notificaciones';
      btn.disabled = false;
      return;
    }

    const usuario = await APP_Sync.getUsuario();
    const result = await APP_Push.activar(lista_codigo, usuario?.id || 'anonimo');

    if (result.success) {
      btn.textContent = '🔕 Desactivar';
      estado.textContent = '✅ Notificaciones activas';
      estado.style.color = 'var(--green-600, #16a34a)';
      const btnProbar = document.getElementById('btn-probar-notif');
      if (btnProbar) btnProbar.style.display = 'block';
    } else {
      alert('No se pudo activar: ' + result.error);
      btn.textContent = '🔔 Activar';
    }
    btn.disabled = false;
  });

  document.getElementById('btn-probar-notif')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-probar-notif');
    btn.textContent = '...';
    btn.disabled = true;
    
    const lista_codigo = APP_Sync.getCodigoFamilia();
    const usuario = await APP_Sync.getUsuario();
    const result = await APP_Push.probar(lista_codigo, usuario?.id);
    
    if (result.success) {
      alert('Prueba enviada. Deberías recibir la notificación en unos segundos.');
    } else {
      alert('Error enviando prueba: ' + result.error);
    }
    btn.textContent = '🧪 Probar';
    btn.disabled = false;
  });

  // ---- PRESUPUESTO SEMANAL ----
  document.getElementById('btn-guardar-presupuesto')?.addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('input-presupuesto').value);
    if (!val || val <= 0) { alert('Escribe un monto válido mayor a 0'); return; }

    // Si estamos en familia, guardar en servidor
    if (window.APP_Sync && localStorage.getItem('midespensita_familia_codigo_propio')) {
      const res = await APP_Sync.setPresupuestoFamiliar(val);
      if (res.error) { alert(res.error); return; }
    }

    localStorage.setItem('midespensita_presupuesto_semana', val.toString());
    const estado = document.getElementById('presupuesto-estado');
    if (estado) {
      estado.textContent = '✅ Presupuesto: $' + val.toLocaleString('es-MX') + ' / semana';
      estado.style.color = 'var(--green-600, #16a34a)';
    }
  });

  document.getElementById('btn-quitar-presupuesto')?.addEventListener('click', async () => {
    if (window.APP_Sync && localStorage.getItem('midespensita_familia_codigo_propio')) {
      await APP_Sync.setPresupuestoFamiliar(0);
    }
    localStorage.removeItem('midespensita_presupuesto_semana');
    APP_Pages.config();
  });

  // ---- UBICACIÓN ----

  document.getElementById('btn-cambiar-ubicacion').addEventListener('click', async () => {
    const ciudad = prompt('¿En qué ciudad estás?');
    if (ciudad && ciudad.trim()) {
      await APP_DB.setUbicacion(ciudad.trim(), '');
      document.getElementById('ubicacion-header').textContent = ciudad.trim();
      APP_Pages.config();
    }
  });

  // Generar PDF
  document.getElementById('btn-exportar-pdf').addEventListener('click', async () => {
    const lista = await APP_DB.getListaActiva();
    const itemsLista = await APP_DB.getItemsByLista(lista.id);
    const pendientes = itemsLista.filter(i => !i.comprado);
    const productos = await APP_DB.getAllProductos();
    
    let reportHTML = `
      <div id="printable-report" style="display:none; padding: 20px; font-family: sans-serif; color: black;">
        <div class="print-title" style="font-size: 24px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #ccc; padding-bottom: 10px;">Reporte de MiDespensita</div>
        <div style="margin-bottom: 20px;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}</div>
    `;

    if (pendientes.length > 0) {
      reportHTML += `
        <div class="print-subtitle" style="font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">🛒 Lista de Compras Pendiente</div>
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <thead><tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f5f5f5;">Producto</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f5f5f5;">Cantidad</th>
          </tr></thead>
          <tbody>
            ${pendientes.map(item => `<tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.producto?.nombre || 'Sin nombre'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.cantidad}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;
    }

    if (productos.length > 0) {
      reportHTML += `
        <div class="print-subtitle" style="font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; page-break-before: always;">📦 Catálogo de Productos y Precios</div>
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <thead><tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f5f5f5;">Producto</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f5f5f5;">Categoría</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f5f5f5;">Último Precio</th>
          </tr></thead>
          <tbody>
      `;
      for (const prod of productos) {
        const rango = await APP_DB.getRangoPrecios(prod.id);
        const precioText = rango ? `$${rango.ultimo.precio.toFixed(2)} (${rango.ultimo.tienda})` : 'Sin compras';
        reportHTML += `<tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${prod.nombre}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${APP_CATEGORIAS[prod.categoria]?.nombre || prod.categoria}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${precioText}</td>
        </tr>`;
      }
      reportHTML += `
          </tbody>
        </table>
      `;
    }
    
    reportHTML += `</div>`;

    const oldReport = document.getElementById('printable-report');
    if (oldReport) oldReport.remove();
    
    document.body.insertAdjacentHTML('beforeend', reportHTML);
    window.print();
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
