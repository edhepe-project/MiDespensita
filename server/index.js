const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Base de datos SQLite (migración fácil a PostgreSQL después)
const db = new Database(path.join(__dirname, 'midespensita.db'));

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    ciudad TEXT,
    region TEXT,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultima_sync DATETIME
  );

  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria TEXT,
    unidad TEXT,
    activo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS precios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id TEXT,
    producto_id INTEGER,
    tienda TEXT,
    marca TEXT,
    presentacion TEXT,
    precio REAL,
    ciudad TEXT,
    region TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  );

  CREATE TABLE IF NOT EXISTS precios_regionales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ciudad TEXT,
    producto_id INTEGER,
    marca TEXT,
    tienda TEXT,
    precio_promedio REAL,
    precio_min REAL,
    precio_max REAL,
    num_muestras INTEGER,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  );

  CREATE INDEX IF NOT EXISTS idx_precios_ciudad ON precios(ciudad);
  CREATE INDEX IF NOT EXISTS idx_precios_producto ON precios(producto_id);
  CREATE INDEX IF NOT EXISTS idx_precios_fecha ON precios(fecha);
`);

// ============================================
// RUTAS API
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Registrar usuario
app.post('/api/usuarios', (req, res) => {
  const { ciudad, region } = req.body;
  const id = uuidv4();

  db.prepare('INSERT INTO usuarios (id, ciudad, region) VALUES (?, ?, ?)').run(id, ciudad, region);

  res.json({ id, ciudad, region });
});

// Actualizar ubicación de usuario
app.put('/api/usuarios/:id/ubicacion', (req, res) => {
  const { id } = req.params;
  const { ciudad, region } = req.body;

  db.prepare('UPDATE usuarios SET ciudad = ?, region = ?, ultima_sync = CURRENT_TIMESTAMP WHERE id = ?')
    .run(ciudad, region, id);

  res.json({ success: true });
});

// Sync de precios (el usuario sube sus compras)
app.post('/api/sync', (req, res) => {
  const { usuario_id, ciudad, precios } = req.body;

  if (!precios || !Array.isArray(precios)) {
    return res.status(400).json({ error: 'precios array required' });
  }

  // Guardar usuario si no existe
  const usuario = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(usuario_id);
  if (!usuario) {
    db.prepare('INSERT INTO usuarios (id, ciudad) VALUES (?, ?)').run(usuario_id, ciudad);
  } else {
    db.prepare('UPDATE usuarios SET ciudad = ?, ultima_sync = CURRENT_TIMESTAMP WHERE id = ?')
      .run(ciudad, usuario_id);
  }

  // Guardar precios
  let guardados = 0;
  for (const precio of precios) {
    // Buscar o crear producto
    let producto = db.prepare('SELECT id FROM productos WHERE nombre = ?').get(precio.producto);
    if (!producto) {
      const result = db.prepare('INSERT INTO productos (nombre, categoria, unidad) VALUES (?, ?, ?)')
        .run(precio.producto, precio.categoria || 'otros', precio.unidad || 'pieza');
      producto = { id: result.lastInsertRowid };
    }

    // Guardar precio
    db.prepare(`INSERT INTO precios (usuario_id, producto_id, tienda, marca, presentacion, precio, ciudad, fecha)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(usuario_id, producto.id, precio.tienda, precio.marca, precio.presentacion, precio.precio, ciudad, precio.fecha || new Date().toISOString());

    guardados++;
  }

  // Actualizar precios regionales
  actualizarPreciosRegionales(ciudad);

  res.json({ success: true, guardados });
});

// Obtener precios promedio de una ciudad
app.get('/api/precios/:ciudad', (req, res) => {
  const { ciudad } = req.params;

  const precios = db.prepare(`
    SELECT pr.*, p.nombre as producto_nombre, p.categoria
    FROM precios_regionales pr
    JOIN productos p ON pr.producto_id = p.id
    WHERE pr.ciudad = ?
    ORDER BY p.nombre, pr.precio_promedio
  `).all(ciudad);

  res.json({ ciudad, precios });
});

// Obtener precios de un producto en una ciudad
app.get('/api/precios/:ciudad/:producto', (req, res) => {
  const { ciudad, producto } = req.params;

  const precios = db.prepare(`
    SELECT pr.*, p.nombre as producto_nombre
    FROM precios_regionales pr
    JOIN productos p ON pr.producto_id = p.id
    WHERE pr.ciudad = ? AND p.nombre LIKE ?
    ORDER BY pr.precio_promedio
  `).all(ciudad, `%${producto}%`);

  res.json({ ciudad, producto, precios });
});

// Buscar productos (para autocompletar)
app.get('/api/productos/buscar', (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({ productos: [] });
  }

  const productos = db.prepare(`
    SELECT * FROM productos
    WHERE nombre LIKE ? AND activo = 1
    ORDER BY nombre
    LIMIT 10
  `).all(`%${q}%`);

  res.json({ productos });
});

// Obtener estadísticas de una ciudad
app.get('/api/estadisticas/:ciudad', (req, res) => {
  const { ciudad } = req.params;

  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT usuario_id) as total_usuarios,
      COUNT(*) as total_precios,
      COUNT(DISTINCT producto_id) as productos_diferentes
    FROM precios
    WHERE ciudad = ?
  `).get(ciudad);

  const productosPopulares = db.prepare(`
    SELECT p.nombre, COUNT(*) as veces
    FROM precios pr
    JOIN productos p ON pr.producto_id = p.id
    WHERE pr.ciudad = ?
    GROUP BY p.nombre
    ORDER BY veces DESC
    LIMIT 5
  `).all(ciudad);

  const tiendasPrincipales = db.prepare(`
    SELECT tienda, COUNT(*) as veces
    FROM precios
    WHERE ciudad = ?
    GROUP BY tienda
    ORDER BY veces DESC
    LIMIT 5
  `).all(ciudad);

  res.json({
    ciudad,
    estadisticas: stats,
    productos_populares: productosPopulares,
    tiendas_principales: tiendasPrincipales
  });
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function actualizarPreciosRegionales(ciudad) {
  // Calcular precios promedio por producto, marca y tienda
  const precios = db.prepare(`
    SELECT
      producto_id,
      marca,
      tienda,
      AVG(precio) as precio_promedio,
      MIN(precio) as precio_min,
      MAX(precio) as precio_max,
      COUNT(*) as num_muestras
    FROM precios
    WHERE ciudad = ? AND fecha >= datetime('now', '-90 days')
    GROUP BY producto_id, marca, tienda
    HAVING num_muestras >= 1
  `).all(ciudad);

  // Limpiar precios antiguos de esta ciudad
  db.prepare('DELETE FROM precios_regionales WHERE ciudad = ?').run(ciudad);

  // Insertar nuevos precios promedio
  const insert = db.prepare(`
    INSERT INTO precios_regionales (ciudad, producto_id, marca, tienda, precio_promedio, precio_min, precio_max, num_muestras)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of precios) {
    insert.run(ciudad, p.producto_id, p.marca, p.tienda, p.precio_promedio, p.precio_min, p.precio_max, p.num_muestras);
  }
}

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  MiDespensita API corriendo en:');
  console.log(`  http://localhost:${PORT}`);
  console.log('');
});
