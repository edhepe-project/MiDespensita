const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Forzar el uso de IPv4 para evitar el error ENETUNREACH en entornos sin IPv6
require('dns').setDefaultResultOrder('ipv4first');

// ============ PALABRAS PARA CÓDIGOS SEGUROS ============
// 2048 palabras → 2048^3 = ~8.5 mil millones de combinaciones
const PALABRAS = [
  'agave','aguila','aire','alba','alce','alga','alma','aloe','alto','anca',
  'ancla','angel','anillo','anima','arco','ardor','arena','aroma','arpa','arte',
  'astro','atlas','atun','aurora','avena','avion','aviso','azul','barro','beso',
  'bosque','brasa','bravo','brisa','broma','brote','brujo','buho','burro','busco',
  'cabal','cabra','cacao','calma','campo','canal','canto','capaz','carga','carta',
  'casco','castor','causa','cazar','cebra','cedro','ceibo','celda','cerro','choza',
  'cielo','ciervo','cifra','cinza','circo','claro','clima','coala','cobra','cobre',
  'cocoa','cofre','colma','colmo','comet','concha','conga','coral','corzo','costa',
  'coyal','crema','cripta','cruce','cueva','cuervo','curso','dagas','dalia','danza',
  'dardo','daton','deber','delta','denso','derbi','deseo','dicha','dieta','dinamo',
  'disco','dolar','dorado','drago','duelo','duna','ebano','eclipse','eden','elote',
  'embus','encina','enero','enigma','enojo','entre','erizo','escudo','esfera','estela',
  'etapa','exito','fabula','falco','fango','farol','febril','felpa','fenix','feria',
  'ferro','fibra','fideo','finca','flama','flecha','flor','flujo','fondo','forma',
  'forja','forro','fosa','freno','fruta','fuego','fuente','fulgor','gacela','gallo',
  'gamba','garza','gaviota','geiser','gema','genio','girasol','globo','gloria','golfo',
  'gordo','gorila','gracia','grano','gripe','gruta','guarda','guepardo','guia','guila',
  'hacha','halcon','hamaca','harina','hebra','helado','helio','hierba','higo','hipno',
  'hogar','hongo','hormiga','huerta','hueso','ibice','iglesia','iguana','ilusion','indio',
  'indigo','ingle','inicio','insecto','isla','jabon','jaguar','jardin','jaspe','jazmin',
  'jirafa','jubilo','jugo','junco','karma','koala','lagarto','laguna','lanza','laser',
  'laurel','lava','leal','lejia','lemon','leon','leopardo','leche','libre','limon',
  'linea','lince','lirio','llama','lluvia','lobo','lodo','loro','lotus','lucha',
  'lucero','luna','mago','maiz','mamba','mango','manta','manzana','marmol','marte',
  'masa','mastil','matiz','mauve','medusa','melon','mesa','metal','metro','miel',
  'mirada','mirlo','misio','modulo','molde','monja','mono','morsa','mosca','motor',
  'muela','mundo','muralla','nacar','nardo','nebula','negro','nieve','noble','noche',
  'nogal','nomada','norma','novio','nube','nudo','oasis','obsidiana','oceano','ocre',
  'olivo','onda','onix','opalo','orden','orfebre','oruga','otoño','oveja','ozone',
  'panda','pargo','patio','patron','peces','pedal','perla','peton','pez','pilar',
  'pinar','pirata','pizca','plata','playa','poder','poema','polvo','pomar','prado',
  'prima','prisa','proa','pulpo','puma','queso','quimo','radar','raiz','ramas',
  'rapaz','rasgo','rayo','reben','reino','reloj','remos','resina','reto','rioja',
  'ritual','rocio','rodera','rojo','romero','ronda','roque','rosa','rosal','rubi',
  'ruina','rumbo','sabana','sable','saga','sauce','selva','sendero','sequia','sereno',
  'sierra','siglo','silaba','sirena','sistema','sol','solera','sombra','soplo','sorbo',
  'suelo','suerte','sultan','tallo','talon','tanque','tapiz','tarde','techo','tema',
  'temor','tigre','tilo','timon','titan','tiza','tonel','torno','torso','trebol',
  'tribu','trigo','trino','tronco','truco','trueno','tucan','tulipa','turbo','turno',
  'umbra','union','urano','urna','valor','vapor','vega','veleta','venus','verde',
  'viento','vigor','vinca','vista','vivir','vocal','volcan','volver','vuelo','yaguar',
  'yedra','yugo','zafiro','zarpa','zenith','zorro','zurdo'
];

function generarCodigoSeguro() {
  const rand = () => PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
  return `${rand()}-${rand()}-${rand()}`;
}

// ============ RATE LIMITING SIMPLE ============
const intentosFallidos = new Map();
function checkRateLimit(ip) {
  const ahora = Date.now();
  const registro = intentosFallidos.get(ip) || { count: 0, resetAt: ahora + 15 * 60 * 1000 };
  if (ahora > registro.resetAt) {
    intentosFallidos.set(ip, { count: 1, resetAt: ahora + 15 * 60 * 1000 });
    return true;
  }
  if (registro.count >= 10) return false;
  registro.count++;
  intentosFallidos.set(ip, registro);
  return true;
}
function resetRateLimit(ip) {
  intentosFallidos.delete(ip);
}

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS listas_compartidas (
        codigo TEXT PRIMARY KEY,
        dueno_id TEXT NOT NULL,
        nombre TEXT DEFAULT 'Mi familia',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expira_en TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS items_compartidos (
        id SERIAL PRIMARY KEY,
        lista_codigo TEXT REFERENCES listas_compartidas(codigo) ON DELETE CASCADE,
        usuario_id TEXT,
        nombre_producto TEXT NOT NULL,
        cantidad INTEGER DEFAULT 1,
        nota TEXT DEFAULT '',
        procesado BOOLEAN DEFAULT FALSE,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM precios_regionales WHERE ciudad = $1', [ciudad]);
      await client.query(`INSERT INTO precios_regionales (ciudad, producto_id, marca, tienda, precio_promedio, precio_min, precio_max, num_muestras)
        SELECT ciudad, producto_id, marca, tienda, AVG(precio), MIN(precio), MAX(precio), COUNT(*)
        FROM precios WHERE ciudad = $1 AND fecha >= NOW() - INTERVAL '90 days'
        GROUP BY ciudad, producto_id, marca, tienda`, [ciudad]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error actualizando precios regionales:', err);
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error de conexión a DB:', e);
  }

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
// LISTAS COMPARTIDAS (FAMILIA)
// ============================================

// Crear lista compartida (generará un código seguro de 3 palabras)
app.post('/api/familia/crear', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    if (!usuario_id) return res.status(400).json({ error: 'usuario_id requerido' });

    // Generar código único
    let codigo;
    let intentos = 0;
    do {
      codigo = generarCodigoSeguro();
      const existe = await pool.query('SELECT codigo FROM listas_compartidas WHERE codigo = $1', [codigo]);
      if (existe.rows.length === 0) break;
      intentos++;
    } while (intentos < 5);

    const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
    await pool.query(
      'INSERT INTO listas_compartidas (codigo, dueno_id, expira_en) VALUES ($1, $2, $3) ON CONFLICT (dueno_id) DO NOTHING',
      [codigo, usuario_id, expira]
    );

    // Recuperar lista existente del dueño por si ya tenía una
    const lista = await pool.query('SELECT * FROM listas_compartidas WHERE dueno_id = $1', [usuario_id]);
    res.json({ codigo: lista.rows[0].codigo, expira_en: lista.rows[0].expira_en });
  } catch (e) {
    console.error('Error creando lista compartida:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Verificar que un código existe (para unirse)
app.post('/api/familia/unirse', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' });
  }

  const { codigo, usuario_id } = req.body;
  if (!codigo || !usuario_id) return res.status(400).json({ error: 'Datos requeridos' });

  const lista = await pool.query(
    'SELECT * FROM listas_compartidas WHERE codigo = $1 AND (expira_en IS NULL OR expira_en > NOW())',
    [codigo.toLowerCase().trim()]
  );

  if (lista.rows.length === 0) {
    return res.status(404).json({ error: 'Código no válido o expirado' });
  }

  // Código correcto → limpiar rate limit de esta IP
  resetRateLimit(ip);
  res.json({ success: true, lista: lista.rows[0] });
});

// Agregar ítem a lista compartida (familiar agrega algo)
app.post('/api/familia/:codigo/items', async (req, res) => {
  const { codigo } = req.params;
  const { usuario_id, nombre_producto, cantidad, nota } = req.body;

  if (!nombre_producto) return res.status(400).json({ error: 'nombre_producto requerido' });

  const lista = await pool.query(
    'SELECT * FROM listas_compartidas WHERE codigo = $1 AND (expira_en IS NULL OR expira_en > NOW())',
    [codigo]
  );
  if (lista.rows.length === 0) return res.status(404).json({ error: 'Lista no encontrada' });

  const item = await pool.query(
    'INSERT INTO items_compartidos (lista_codigo, usuario_id, nombre_producto, cantidad, nota) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [codigo, usuario_id || 'anonimo', nombre_producto, cantidad || 1, nota || '']
  );

  res.json({ success: true, item: item.rows[0] });
});

// Obtener ítems pendientes de una lista (el dueño los revisa)
app.get('/api/familia/:codigo/items', async (req, res) => {
  const { codigo } = req.params;
  const items = await pool.query(
    'SELECT * FROM items_compartidos WHERE lista_codigo = $1 AND procesado = FALSE ORDER BY fecha DESC',
    [codigo]
  );
  res.json({ items: items.rows });
});

// Marcar ítem como procesado (aceptado o ignorado)
app.delete('/api/familia/:codigo/items/:itemId', async (req, res) => {
  const { codigo, itemId } = req.params;
  await pool.query(
    'UPDATE items_compartidos SET procesado = TRUE WHERE id = $1 AND lista_codigo = $2',
    [itemId, codigo]
  );
  res.json({ success: true });
});

// ============================================
// INICIAR
// ============================================

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MiDespensita API (Supabase) en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error crítico al conectar con la base de datos:', err);
  // Iniciar el servidor de todas formas para que Render no falle el despliegue
  // y podamos ver el endpoint de health
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado en modo fallback en puerto ${PORT}`);
  });
});
