const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tablas
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        ciudad TEXT,
        region TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ultima_sync TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        categoria TEXT,
        unidad TEXT,
        activo INTEGER DEFAULT 1
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS precios (
        id SERIAL PRIMARY KEY,
        usuario_id TEXT,
        producto_id INTEGER,
        tienda TEXT,
        marca TEXT,
        presentacion TEXT,
        precio REAL,
        ciudad TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS precios_regionales (
        id SERIAL PRIMARY KEY,
        ciudad TEXT,
        producto_id INTEGER,
        marca TEXT,
        tienda TEXT,
        precio_promedio REAL,
        precio_min REAL,
        precio_max REAL,
        num_muestras INTEGER,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Base de datos PostgreSQL inicializada');
  } finally {
    client.release();
  }
}

// ============================================
// RUTAS API
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (e) {
    res.json({ status: 'error', database: 'disconnected', error: e.message });
  }
});

app.post('/api/usuarios', async (req, res) => {
  const { ciudad, region } = req.body;
  const id = uuidv4();
  await pool.query('INSERT INTO usuarios (id, ciudad, region) VALUES ($1, $2, $3)', [id, ciudad, region]);
  res.json({ id, ciudad, region });
});

app.put('/api/usuarios/:id/ubicacion', async (req, res) => {
  const { id } = req.params;
  const { ciudad, region } = req.body;
  await pool.query('UPDATE usuarios SET ciudad = $1, region = $2, ultima_sync = NOW() WHERE id = $3', [ciudad, region, id]);
  res.json({ success: true });
});

app.post('/api/sync', async (req, res) => {
  const { usuario_id, ciudad, precios } = req.body;

  if (!precios || !Array.isArray(precios)) {
    return res.status(400).json({ error: 'precios array required' });
  }

  const usuario = await pool.query('SELECT id FROM usuarios WHERE id = $1', [usuario_id]);
  if (usuario.rows.length === 0) {
    await pool.query('INSERT INTO usuarios (id, ciudad) VALUES ($1, $2)', [usuario_id, ciudad]);
  } else {
    await pool.query('UPDATE usuarios SET ciudad = $1, ultima_sync = NOW() WHERE id = $2', [ciudad, usuario_id]);
  }

  let guardados = 0;
  for (const precio of precios) {
    let producto = await pool.query('SELECT id FROM productos WHERE nombre = $1', [precio.producto]);
    if (producto.rows.length === 0) {
      await pool.query('INSERT INTO productos (nombre, categoria, unidad) VALUES ($1, $2, $3)',
        [precio.producto, precio.categoria || 'otros', precio.unidad || 'pieza']);
      producto = await pool.query('SELECT id FROM productos WHERE nombre = $1', [precio.producto]);
    }

    await pool.query(`INSERT INTO precios (usuario_id, producto_id, tienda, marca, presentacion, precio, ciudad, fecha)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [usuario_id, producto.rows[0].id, precio.tienda, precio.marca, precio.presentacion, precio.precio, ciudad, precio.fecha || new Date()]);
    guardados++;
  }

  // Actualizar precios regionales
  try {
    await pool.query('DELETE FROM precios_regionales WHERE ciudad = $1', [ciudad]);
    await pool.query(`INSERT INTO precios_regionales (ciudad, producto_id, marca, tienda, precio_promedio, precio_min, precio_max, num_muestras)
      SELECT ciudad, producto_id, marca, tienda, AVG(precio), MIN(precio), MAX(precio), COUNT(*)
      FROM precios WHERE ciudad = $1 AND fecha >= NOW() - INTERVAL '90 days'
      GROUP BY ciudad, producto_id, marca, tienda`, [ciudad]);
  } catch (e) {}

  res.json({ success: true, guardados });
});

app.get('/api/precios/:ciudad', async (req, res) => {
  const { ciudad } = req.params;
  let precios = await pool.query(`
    SELECT pr.*, p.nombre as producto_nombre, p.categoria
    FROM precios_regionales pr
    JOIN productos p ON pr.producto_id = p.id
    WHERE pr.ciudad = $1
    ORDER BY p.nombre, pr.precio_promedio
  `, [ciudad]);

  let origen = ciudad;

  if (precios.rows.length === 0 && ciudad) {
    precios = await pool.query(`
      SELECT pr.*, p.nombre as producto_nombre, p.categoria
      FROM precios_regionales pr
      JOIN productos p ON pr.producto_id = p.id
      WHERE pr.ciudad LIKE $1
      ORDER BY p.nombre, pr.precio_promedio
      LIMIT 20
    `, [`%${ciudad}%`]);
    if (precios.rows.length > 0) origen = `cerca de ${ciudad}`;
  }

  if (precios.rows.length === 0) {
    precios = await pool.query(`
      SELECT pr.*, p.nombre as producto_nombre, p.categoria
      FROM precios_regionales pr
      JOIN productos p ON pr.producto_id = p.id
      ORDER BY p.nombre, pr.precio_promedio
      LIMIT 20
    `);
    if (precios.rows.length > 0) origen = 'México (datos generales)';
  }

  res.json({ ciudad, origen, precios: precios.rows });
});

app.get('/api/productos/buscar', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ productos: [] });
  const productos = await pool.query('SELECT * FROM productos WHERE nombre ILIKE $1 AND activo = 1 ORDER BY nombre LIMIT 10', [`%${q}%`]);
  res.json({ productos: productos.rows });
});

app.get('/api/estadisticas/:ciudad', async (req, res) => {
  const { ciudad } = req.params;
  const stats = await pool.query(`
    SELECT COUNT(DISTINCT usuario_id) as total_usuarios, COUNT(*) as total_precios, COUNT(DISTINCT producto_id) as productos_diferentes
    FROM precios WHERE ciudad = $1
  `, [ciudad]);
  const productosPopulares = await pool.query(`SELECT p.nombre, COUNT(*) as veces FROM precios pr JOIN productos p ON pr.producto_id = p.id WHERE pr.ciudad = $1 GROUP BY p.nombre ORDER BY veces DESC LIMIT 5`, [ciudad]);
  const tiendasPrincipales = await pool.query(`SELECT tienda, COUNT(*) as veces FROM precios WHERE ciudad = $1 GROUP BY tienda ORDER BY veces DESC LIMIT 5`, [ciudad]);
  res.json({ ciudad, estadisticas: stats.rows[0], productos_populares: productosPopulares.rows, tiendas_principales: tiendasPrincipales.rows });
});

// ============================================
// INICIAR
// ============================================

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MiDespensita API (Supabase) en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error:', err);
});
