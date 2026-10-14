/**
 * auth.js — Rutas de autenticación con seguridad completa
 * - Rate limiting en login
 * - Validación de inputs
 * - Auditoría de accesos
 * - Logout con revocación de token
 * - Logs de intentos fallidos
 */
const router   = require('express').Router();
const pool     = require('../db/pool');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const auth     = require('../middleware/auth');
const { loginLimiter, loginValidators, passwordValidators } = require('../middleware/security');
const { log, auditLog, getClientIP } = require('../utils/logger');

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login',
  loginLimiter,          // Max 10 intentos / 15 min por IP
  loginValidators,       // Valida y sanitiza username + password
  async (req, res) => {
    const ip = getClientIP(req);
    const { username, password } = req.body;

    try {
      const { rows } = await pool.query(
        'SELECT * FROM usuarios WHERE username = $1',
        [username.toLowerCase().trim()]
      );

      // Siempre hacer bcrypt.compare aunque el usuario no exista
      // (previene timing attacks para enumerar usuarios)
      const dummyHash = '$2a$10$dummy.hash.to.prevent.timing.attacks.xyz123';
      const user = rows[0] || null;
      const hashToCompare = user ? user.password_hash : dummyHash;
      const passwordOk = await bcrypt.compare(password, hashToCompare);

      if (!user || !user.activo || !passwordOk) {
        // Log intento fallido
        log('SECURITY', 'Login fallido', { username, ip });
        await auditLog(user?.id || null, 'LOGIN_FALLIDO', { username, ip }, ip);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Actualizar último acceso
      await pool.query(
        'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
        [user.id]
      );

      // Generar JWT con payload mínimo
      const payload = {
        id:       user.id,
        username: user.username,
        nombre:   user.nombre,
        rol:      user.rol,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES || '8h',
      });

      log('INFO', 'Login exitoso', { userId: user.id, username, ip });
      await auditLog(user.id, 'LOGIN_EXITOSO', { ip }, ip);

      res.json({
        token,
        user: {
          id:       user.id,
          nombre:   user.nombre,
          username: user.username,
          email:    user.email,
          rol:      user.rol,
        }
      });

    } catch (err) {
      log('ERROR', 'Error en login', { error: err.message, ip });
      res.status(500).json({ error: 'Error de servidor' });
    }
  }
);

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', auth, async (req, res) => {
  const ip = getClientIP(req);
  // Revocar el token actual
  require('../middleware/auth').revokeToken(req.token);
  await auditLog(req.user.id, 'LOGOUT', { ip }, ip);
  log('INFO', 'Logout', { userId: req.user.id, ip });
  res.json({ message: 'Sesión cerrada correctamente' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, username, email, rol, activo, ultimo_acceso FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// ─── POST /api/auth/cambiar-password ─────────────────────────────────────────
router.post('/cambiar-password',
  auth,
  passwordValidators,
  async (req, res) => {
    const ip = getClientIP(req);
    const { password_actual, password_nuevo } = req.body;
    try {
      const { rows } = await pool.query(
        'SELECT password_hash FROM usuarios WHERE id = $1',
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

      const ok = await bcrypt.compare(password_actual, rows[0].password_hash);
      if (!ok) {
        log('SECURITY', 'Intento cambio password con contraseña incorrecta', { userId: req.user.id, ip });
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }

      // Hash con cost factor 12 (más seguro que el default 10)
      const hash = await bcrypt.hash(password_nuevo, 12);
      await pool.query(
        'UPDATE usuarios SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hash, req.user.id]
      );

      await auditLog(req.user.id, 'CAMBIO_PASSWORD', { ip }, ip);

      // Revocar token actual para forzar re-login
      require('../middleware/auth').revokeToken(req.token);

      res.json({ message: 'Contraseña actualizada. Inicia sesión nuevamente.' });
    } catch (err) {
      res.status(500).json({ error: 'Error de servidor' });
    }
  }
);

// ─── PUT /api/auth/perfil ────────────────────────────────────────────────────
// El propio usuario edita su nombre, usuario de acceso y correo.
// Cambiar el usuario de acceso exige la contraseña actual. Devuelve un token nuevo
// (el JWT lleva el username) y revoca el anterior.
router.put('/perfil', auth, async (req, res) => {
  const ip = getClientIP(req);
  try {
    const nombre   = String(req.body.nombre ?? '').trim();
    const username = String(req.body.username ?? '').trim().toLowerCase();
    const email    = String(req.body.email ?? '').trim();
    const { password_actual } = req.body;

    if (nombre.length < 2 || nombre.length > 100)
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
    if (!/^[a-z0-9._-]{3,50}$/.test(username))
      return res.status(400).json({ error: 'Usuario: 3 a 50 caracteres (letras, números, punto, guion o guion bajo)' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'El correo no es válido' });

    const { rows: cur } = await pool.query('SELECT username, password_hash FROM usuarios WHERE id = $1', [req.user.id]);
    if (!cur.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (username !== cur[0].username) {
      if (!password_actual || !(await bcrypt.compare(password_actual, cur[0].password_hash)))
        return res.status(400).json({ error: 'Para cambiar el usuario de acceso escribe tu contraseña actual correcta' });
      const { rows: dup } = await pool.query('SELECT 1 FROM usuarios WHERE username = $1 AND id <> $2', [username, req.user.id]);
      if (dup.length) return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso' });
    }

    const { rows } = await pool.query(
      `UPDATE usuarios SET nombre=$1, username=$2, email=$3, updated_at=NOW()
       WHERE id=$4 RETURNING id, nombre, username, email, rol`,
      [nombre, username, email || null, req.user.id]);
    const user = rows[0];

    await auditLog(req.user.id, 'PERFIL_ACTUALIZADO', { ip, username_anterior: cur[0].username, username }, ip);

    const token = jwt.sign(
      { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '8h' });
    require('../middleware/auth').revokeToken(req.token);

    res.json({ ok: true, token, user });
  } catch (err) {
    log('ERROR', 'Error actualizando perfil', { error: err.message });
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;
