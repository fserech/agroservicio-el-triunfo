/**
 * security.js — Middlewares de seguridad centralizados
 * Aplica: helmet, CORS restringido, rate limiting, sanitización, anti-HPP
 */
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// ─────────────────────────────────────────────
// 1. HELMET — Cabeceras de seguridad HTTP
// ─────────────────────────────────────────────
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:'],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      objectSrc:   ["'none'"],
      frameSrc:    ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false,  // needed for some browsers
  hsts: {
    maxAge: 31536000,        // 1 año
    includeSubDomains: true,
    preload: true
  }
});

// ─────────────────────────────────────────────
// 2. CORS — Solo orígenes permitidos
// ─────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',')
  .map(o => o.trim());

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permitir sin origin (Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error(`CORS bloqueado para origen: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400  // preflight cache 24h
});

// ─────────────────────────────────────────────
// 3. RATE LIMITING — Protección brute force
// ─────────────────────────────────────────────

// Login: máximo 10 intentos por 15 minutos por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,    // No cuenta los logins exitosos
});

// API general: 200 req/min por IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes. Intenta en un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─────────────────────────────────────────────
// 4. VALIDACIÓN DE INPUTS — express-validator
// ─────────────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Datos inválidos',
      detalles: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  }
  next();
};

const loginValidators = [
  body('username')
    .trim()
    .notEmpty().withMessage('Usuario requerido')
    .isLength({ max: 50 }).withMessage('Usuario demasiado largo')
    .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Usuario contiene caracteres inválidos'),
  body('password')
    .notEmpty().withMessage('Contraseña requerida')
    .isLength({ min: 6, max: 100 }).withMessage('Contraseña debe tener 6–100 caracteres'),
  handleValidationErrors,
];

const passwordValidators = [
  body('password_actual').notEmpty().withMessage('Contraseña actual requerida'),
  body('password_nuevo')
    .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos un número'),
  handleValidationErrors,
];

// ─────────────────────────────────────────────
// 5. SANITIZACIÓN GENERAL — Eliminar campos peligrosos
// ─────────────────────────────────────────────
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // Eliminar campos que nunca deben venir del cliente
    const dangerous = ['__proto__', 'constructor', 'prototype', 'password_hash'];
    dangerous.forEach(k => delete req.body[k]);
  }
  next();
};

// ─────────────────────────────────────────────
// 6. ANTI-HPP — HTTP Parameter Pollution
// ─────────────────────────────────────────────
const antiHPP = (req, res, next) => {
  // Convertir arrays en query params a su último valor
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (Array.isArray(req.query[key])) {
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    });
  }
  next();
};

// ─────────────────────────────────────────────
// 7. REQUEST SIZE LIMIT & JSON STRICTNESS
// ─────────────────────────────────────────────
const requestSizeGuard = (err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload demasiado grande' });
  }
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ error: 'JSON malformado' });
  }
  next(err);
};

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  loginLimiter,
  apiLimiter,
  loginValidators,
  passwordValidators,
  handleValidationErrors,
  sanitizeBody,
  antiHPP,
  requestSizeGuard,
};
