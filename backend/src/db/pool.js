require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:                   process.env.DB_HOST     || 'localhost',
  port:                   parseInt(process.env.DB_PORT) || 5432,
  database:               process.env.DB_NAME     || 'agroservicio',
  user:                   process.env.DB_USER     || 'postgres',
  password:               process.env.DB_PASSWORD || 'postgres123',
  // ── Tamaño del pool ──────────────────────────────────────────────────────
  max:                    parseInt(process.env.DB_POOL_MAX)  || 20,  // máx conexiones simultáneas
  min:                    parseInt(process.env.DB_POOL_MIN)  || 2,   // mín conexiones siempre activas
  // ── Timeouts ─────────────────────────────────────────────────────────────
  idleTimeoutMillis:      parseInt(process.env.DB_IDLE_TIMEOUT)       || 30000,  // 30s sin uso → cerrar
  connectionTimeoutMillis:parseInt(process.env.DB_CONNECT_TIMEOUT)    || 5000,   // 5s para conectar
  statement_timeout:      parseInt(process.env.DB_STATEMENT_TIMEOUT)  || 30000,  // 30s máx por query
  query_timeout:          parseInt(process.env.DB_QUERY_TIMEOUT)      || 30000,  // 30s máx por query
});

// ── Monitoreo de errores del pool ────────────────────────────────────────────
pool.on('error', (err, client) => {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'ERROR',
    message: 'Error inesperado en cliente PostgreSQL',
    error: err.message
  }));
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    const { totalCount, idleCount, waitingCount } = pool;
    if (waitingCount > 0) {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'WARN',
        message: `Pool: ${totalCount} total, ${idleCount} idle, ${waitingCount} esperando`
      }));
    }
  }
});

// ── Helper para queries con timeout automático ────────────────────────────────
pool.safeQuery = async (text, params, timeoutMs = 30000) => {
  const client = await pool.connect();
  try {
    await client.query(`SET statement_timeout = ${timeoutMs}`);
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

module.exports = pool;
