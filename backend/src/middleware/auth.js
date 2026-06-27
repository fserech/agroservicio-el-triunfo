/**
 * auth.js — Middleware de autenticación JWT
 * Verifica token, extrae usuario, detecta tokens revocados
 */
const jwt = require('jsonwebtoken');

// Lista negra en memoria (para tokens revocados antes de expirar)
// En producción de alta escala: usar Redis
const revokedTokens = new Set();

const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }

  const token = header.split(' ')[1];

  // Verificar si el token fue revocado
  if (revokedTokens.has(token)) {
    return res.status(401).json({ error: 'Sesión cerrada. Inicia sesión nuevamente.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar estructura mínima del payload
    if (!decoded.id || !decoded.rol) {
      return res.status(401).json({ error: 'Token malformado' });
    }

    req.user  = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada. Inicia sesión nuevamente.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    return res.status(401).json({ error: 'Error de autenticación' });
  }
};

// Función para revocar un token (logout)
const revokeToken = (token) => {
  revokedTokens.add(token);
  // Limpiar tokens expirados cada hora
  setTimeout(() => revokedTokens.delete(token), 8 * 60 * 60 * 1000);
};

module.exports = auth;
module.exports.revokeToken = revokeToken;
