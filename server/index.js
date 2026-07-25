const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let db;

async function initDB() {
  const SQL = await initSqlJs();

  // En Render, usar /tmp para la BD (ephemeral pero funcional)
  const dbPath = process.env.RENDER ? '/tmp/midespensita.db' : path.join(__dirname, 'midespensita.db');

  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }

  // Crear tablas
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      ciudad TEXT,
      region TEXT,
      fecha_registro TEXT DEFAULT (datetime('now')),
      ultima_sync TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      categoria TEXT,
      unidad TEXT,
      activo INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS precios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT,
      producto_id INTEGER,
      tienda TEXT,
      marca TEXT,
      presentacion TEXT,
      precio REAL,
      ciudad TEXT,
      fecha TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
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
      fecha_actualizacion TEXT DEFAULT (datetime('now'))
    )
  `);

  console.log('Base de datos inicializada');
}

function saveDB() {
  try {
    const dbPath = process.env.RENDER ? '/tmp/midespensita.db' : path.join(__dirname, 'midespensita.db');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {}
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

// ============================================
// RUTAS API
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/usuarios', (req, res) => {
  const { ciudad, region } = req.body;
  const id = uuidv4();
  db.run('INSERT INTO usuarios (id, ciudad, region) VALUES (?, ?, ?)', [id, ciudad, region]);
  saveDB();
  res.json({ id, ciudad, region });
});

app.put('/api/usuarios/:id/ubicacion', (req, res) => {
  const { id } = req.params;
  const { ciudad, region } = req.body;
  db.run('UPDATE usuarios SET ciudad = ?, region = ?, ultima_sync = datetime("now") WHERE id = ?', [ciudad, region, id]);
  saveDB();
  res.json({ success: true });
});

app.post('/api/sync', (req, res) => {
  const { usuario_id, ciudad, precios } = req.body;

  if (!precios || !Array.isArray(precios)) {
    return res.status(400).json({ error: 'precios array required' });
  }

  const usuario = queryOne('SELECT id FROM usuarios WHERE id = ?', [usuario_id]);
  if (!usuario) {
    db.run('INSERT INTO usuarios (id, ciudad) VALUES (?, ?)', [usuario_id, ciudad]);
  } else {
    db.run('UPDATE usuarios SET ciudad = ?, ultima_sync = datetime("now") WHERE id = ?', [ciudad, usuario_id]);
  }

  let guardados = 0;
  for (const precio of precios) {
    let producto = queryOne('SELECT id FROM productos WHERE nombre = ?', [precio.producto]);
    if (!producto) {
      db.run('INSERT INTO productos (nombre, categoria, unidad) VALUES (?, ?, ?)', [precio.producto, precio.categoria || 'otros', precio.unidad || 'pieza']);
      producto = queryOne('SELECT id FROM productos WHERE nombre = ?', [precio.producto]);
    }

    db.run(`INSERT INTO precios (usuario_id, producto_id, tienda, marca, presentacion, precio, ciudad, fecha)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, producto.id, precio.tienda, precio.marca, precio.presentacion, precio.precio, ciudad, precio.fecha || new Date().toISOString()]);
    guardados++;
  }

  // Actualizar precios regionales
  try {
    db.run('DELETE FROM precios_regionales WHERE ciudad = ?', [ciudad]);
    db.run(`INSERT INTO precios_regionales (ciudad, producto_id, marca, tienda, precio_promedio, precio_min, precio_max, num_muestras)
            SELECT ciudad, producto_id, marca, tienda, AVG(precio), MIN(precio), MAX(precio), COUNT(*)
            FROM precios WHERE ciudad = ? AND fecha >= datetime('now', '-90 days')
            GROUP BY producto_id, marca, tienda`, [ciudad]);
  } catch (e) {}

  saveDB();
  res.json({ success: true, guardados });
});

app.get('/api/precios/:ciudad', (req, res) => {
  const { ciudad } = req.params;
  const precios = queryAll(`
    SELECT pr.*, p.nombre as producto_nombre, p.categoria
    FROM precios_regionales pr
    JOIN productos p ON pr.producto_id = p.id
    WHERE pr.ciudad = ?
    ORDER BY p.nombre, pr.precio_promedio
  `, [ciudad]);
  res.json({ ciudad, precios });
});

app.get('/api/precios/:ciudad/:producto', (req, res) => {
  const { ciudad, producto } = req.params;
  const precios = queryAll(`
    SELECT pr.*, p.nombre as producto_nombre
    FROM precios_regionales pr
    JOIN productos p ON pr.producto_id = p.id
    WHERE pr.ciudad = ? AND p.nombre LIKE ?
    ORDER BY pr.precio_promedio
  `, [ciudad, `%${producto}%`]);
  res.json({ ciudad, producto, precios });
});

app.get('/api/productos/buscar', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ productos: [] });
  const productos = queryAll('SELECT * FROM productos WHERE nombre LIKE ? AND activo = 1 ORDER BY nombre LIMIT 10', [`%${q}%`]);
  res.json({ productos });
});

app.get('/api/estadisticas/:ciudad', (req, res) => {
  const { ciudad } = req.params;
  const stats = queryOne(`
    SELECT COUNT(DISTINCT usuario_id) as total_usuarios, COUNT(*) as total_precios, COUNT(DISTINCT producto_id) as productos_diferentes
    FROM precios WHERE ciudad = ?
  `, [ciudad]);
  const productosPopulares = queryAll(`SELECT p.nombre, COUNT(*) as veces FROM precios pr JOIN productos p ON pr.producto_id = p.id WHERE pr.ciudad = ? GROUP BY p.nombre ORDER BY veces DESC LIMIT 5`, [ciudad]);
  const tiendasPrincipales = queryAll(`SELECT tienda, COUNT(*) as veces FROM precios WHERE ciudad = ? GROUP BY tienda ORDER BY veces DESC LIMIT 5`, [ciudad]);
  res.json({ ciudad, estadisticas: stats, productos_populares: productosPopulares, tiendas_principales: tiendasPrincipales });
});

// ============================================
// INICIAR
// ============================================

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MiDespensita API en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error initializing DB:', err);
});
