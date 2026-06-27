/**
 * logger.js — Logger de auditoría y errores
 * Registra: logins, acciones críticas, errores de seguridad
 */
const pool = require('../db/pool');

const LOG_LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', SECURITY: 'SECURITY' };

// Log a consola estructurado
const log = (level, message, meta = {}) => {
  const entry = {
    ts:      new Date().toISOString(),
    level,
    message,
    ...meta
  };
  if (level === 'ERROR' || level === 'SECURITY') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
};

// Log de auditoría a BD (acciones importantes)
const auditLog = async (usuarioId, accion, detalle = {}, ip = null) => {
  try {
    await pool.query(
      `INSERT INTO auditoria (usuario_id, accion, detalle, ip, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [usuarioId, accion, JSON.stringify(detalle), ip]
    );
  } catch (e) {
    // Si falla el log, no bloquear la operación
    log('ERROR', 'Falló registro de auditoría', { error: e.message });
  }
};

// Extraer IP real (considera proxies)
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
};

module.exports = { log, auditLog, getClientIP, LOG_LEVELS };
