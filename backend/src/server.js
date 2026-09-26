/**
 * server.js — Servidor principal Agroservicio CRM
 */
require('dotenv').config();
const express = require('express');
const fs      = require('fs');
const path    = require('path');
const pool    = require('./db/pool');

const {
  helmetMiddleware,
  corsMiddleware,
  apiLimiter,
  sanitizeBody,
  antiHPP,
  requestSizeGuard,
} = require('./middleware/security');
const { log } = require('./utils/logger');

const app = express();

// ─── 1. SEGURIDAD ────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(antiHPP);

// ─── 2. PARSEO ───────────────────────────────────────────────────────────────
// Limit payload size (protección DoS)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(sanitizeBody);

// ─── 2b. TIMEOUT DE REQUESTS ─────────────────────────────────────────────────
// Terminar requests que tarden más de 30s (evita memory leaks)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timeout — intenta de nuevo' });
    }
  });
  next();
});

// ─── 3. RATE LIMITING ────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ─── 4. HEALTH CHECK ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── 5. RUTAS ────────────────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/usuarios',       require('./routes/usuarios'));
app.use('/api/clientes',       require('./routes/clientes'));
app.use('/api/productos',      require('./routes/productos'));
app.use('/api/categorias',     require('./routes/categorias'));
app.use('/api/inventario',     require('./routes/inventario'));
app.use('/api/ventas',         require('./routes/ventas'));
app.use('/api/proveedores',    require('./routes/proveedores'));
app.use('/api/compras',        require('./routes/compras'));
app.use('/api/cuentas-cobrar', require('./routes/cuentas-cobrar'));
app.use('/api/dashboard',      require('./routes/dashboard'));
app.use('/api/backup',         require('./routes/backup'));
app.use('/api/sucursales',     require('./routes/sucursales'));

// ─── 6. 404 para rutas desconocidas ──────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── 7. MANEJO GLOBAL DE ERRORES ─────────────────────────────────────────────
app.use(requestSizeGuard);
app.use((err, req, res, next) => {
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: 'Origen no permitido' });
  }
  log('ERROR', 'Error no manejado', { message: err.message, url: req.url, method: req.method });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
});

// ─── 8. INICIO ───────────────────────────────────────────────────────────────
async function init() {
  // Validar JWT_SECRET
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    log('ERROR', '❌ JWT_SECRET no configurado o demasiado corto (mín. 32 caracteres)');
    process.exit(1);
  }

  // Esperar PostgreSQL
  let retries = 15;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      log('INFO', '✅ PostgreSQL conectado');
      break;
    } catch {
      retries--;
      log('WARN', `⏳ Esperando PostgreSQL... (${retries} intentos restantes)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  if (retries === 0) { log('ERROR', '❌ No se pudo conectar a PostgreSQL'); process.exit(1); }

  // Aplicar schema
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(schema);
    log('INFO', '✅ Schema aplicado');
  } catch(e) {
    log('ERROR', 'Error aplicando schema', { error: e.message });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    log('INFO', `🚀 API corriendo en puerto ${PORT}`);
  });
}

process.on('uncaughtException',  (err) => { log('ERROR', 'UncaughtException',  { error: err.message }); process.exit(1); });
process.on('unhandledRejection', (r)   => { log('ERROR', 'UnhandledRejection', { reason: String(r) }); });

init();

// ─── ENDPOINT DE MÉTRICAS (solo admin) ───────────────────────────────────────
// Útil para monitorear el estado del sistema en producción
const auth = require('./middleware/auth');
app.get('/api/health/metrics', auth, async (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  const pool = require('./db/pool');
  try {
    const [dbCheck, poolStats, tablaStats] = await Promise.all([
      pool.query('SELECT NOW() AS server_time, version() AS pg_version'),
      Promise.resolve({
        total:   pool.totalCount,
        idle:    pool.idleCount,
        waiting: pool.waitingCount,
      }),
      pool.query(`
        SELECT relname AS tabla,
               n_live_tup AS filas,
               pg_size_pretty(pg_total_relation_size(relid)) AS tamanio
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC`)
    ]);

    res.json({
      status:     'ok',
      timestamp:  new Date().toISOString(),
      server_time: dbCheck.rows[0].server_time,
      pg_version: dbCheck.rows[0].pg_version.split(' ')[0] + ' ' + dbCheck.rows[0].pg_version.split(' ')[1],
      pool: poolStats,
      tablas: tablaStats.rows,
      memoria: {
        rss:      Math.round(process.memoryUsage().rss      / 1024 / 1024) + ' MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        heapTotal:Math.round(process.memoryUsage().heapTotal/ 1024 / 1024) + ' MB',
      },
      uptime: Math.round(process.uptime()) + ' segundos',
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
