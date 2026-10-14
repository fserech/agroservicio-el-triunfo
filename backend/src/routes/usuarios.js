const router = require('express').Router();
const pool   = require('../db/pool');
const bcrypt = require('bcryptjs');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');
const jwt    = require('jsonwebtoken');
const { revokeToken } = require('../middleware/auth');
const { auditLog, getClientIP } = require('../utils/logger');

// GET — listar usuarios
router.get('/', auth, roles('admin', 'supervisor'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, username, email, rol, activo, ultimo_acceso, created_at FROM usuarios ORDER BY nombre'
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST — crear usuario
router.post('/', auth, roles('admin'), async (req, res) => {
  const ip = getClientIP(req);
  try {
    const { nombre, username, email, rol, password, activo = true } = req.body;
    if (!nombre || !username || !password) {
      return res.status(400).json({ error: 'Nombre, usuario y contraseña son requeridos' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, username, email, password_hash, rol, activo)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, nombre, username, email, rol, activo`,
      [nombre, username, email || null, hash, rol, activo]
    );
    await auditLog(req.user.id, 'USUARIO_CREADO', { username, rol, ip }, ip);
    res.status(201).json(rows[0]);
  } catch(e) {
    if (e.code === '23505') return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    res.status(500).json({ error: e.message });
  }
});

// PUT — actualizar usuario (nombre, usuario de acceso, correo, rol, estado y, opcionalmente, contraseña)
router.put('/:id', auth, roles('admin'), async (req, res) => {
  const ip = getClientIP(req);
  try {
    const id = parseInt(req.params.id);
    const { rows: cur } = await pool.query('SELECT id, username, rol, activo FROM usuarios WHERE id=$1', [id]);
    if (!cur.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const nombre = String(req.body.nombre ?? '').trim();
    if (nombre.length < 2) return res.status(400).json({ error: 'El nombre es requerido' });
    const rol    = req.body.rol ?? cur[0].rol;
    const activo = req.body.activo ?? cur[0].activo;
    const email  = String(req.body.email ?? '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'El correo no es válido' });

    // Usuario de acceso (login): editable, único y con formato válido
    const username = req.body.username !== undefined ? String(req.body.username).trim().toLowerCase() : cur[0].username;
    if (!/^[a-z0-9._-]{3,50}$/.test(username))
      return res.status(400).json({ error: 'Usuario: 3 a 50 caracteres (letras, números, punto, guion o guion bajo)' });
    if (username !== cur[0].username) {
      const { rows: dup } = await pool.query('SELECT 1 FROM usuarios WHERE username=$1 AND id<>$2', [username, id]);
      if (dup.length) return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
    }

    // No dejar el sistema sin ningún administrador activo
    if (cur[0].rol === 'admin' && cur[0].activo && (rol !== 'admin' || !activo)) {
      const { rows: n } = await pool.query("SELECT COUNT(*)::int AS n FROM usuarios WHERE rol='admin' AND activo=true AND id<>$1", [id]);
      if (n[0].n === 0) return res.status(400).json({ error: 'Debe quedar al menos un administrador activo' });
    }

    const p = [nombre, username, email || null, rol, activo];
    let q = 'UPDATE usuarios SET nombre=$1, username=$2, email=$3, rol=$4, activo=$5, updated_at=NOW()';
    if (req.body.password) {
      if (String(req.body.password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      q += ', password_hash=$6 WHERE id=$7 RETURNING id, nombre, username, email, rol, activo';
      p.push(await bcrypt.hash(req.body.password, 12), id);
    } else {
      q += ' WHERE id=$6 RETURNING id, nombre, username, email, rol, activo';
      p.push(id);
    }
    const { rows } = await pool.query(q, p);
    await auditLog(req.user.id, 'USUARIO_ACTUALIZADO', {
      id, ip, username_anterior: cur[0].username !== username ? cur[0].username : undefined }, ip);

    // Si el administrador edita su PROPIA cuenta, su token (que lleva el usuario y el rol) queda desactualizado:
    // se emite uno nuevo y se revoca el anterior.
    const out = { ...rows[0] };
    if (id === req.user.id) {
      out.token = jwt.sign(
        { id: rows[0].id, username: rows[0].username, nombre: rows[0].nombre, rol: rows[0].rol },
        process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '8h' });
      revokeToken(req.token);
    }
    res.json(out);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE — eliminar usuario
router.delete('/:id', auth, roles('admin'), async (req, res) => {
  const ip = getClientIP(req);
  try {
    const targetId = parseInt(req.params.id);

    // No puede eliminar su propia cuenta
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    // Verificar que el usuario existe
    const { rows: existing } = await pool.query(
      'SELECT id, username, rol FROM usuarios WHERE id = $1', [targetId]
    );
    if (!existing.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No eliminar si es el único admin
    if (existing[0].rol === 'admin') {
      const { rows: admins } = await pool.query(
        "SELECT COUNT(*) AS cnt FROM usuarios WHERE rol = 'admin' AND activo = true"
      );
      if (parseInt(admins[0].cnt) <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el único administrador del sistema' });
      }
    }

    // Desasociar registros relacionados antes de eliminar
    await pool.query('UPDATE ventas  SET usuario_id = NULL WHERE usuario_id = $1', [targetId]);
    await pool.query('UPDATE compras SET usuario_id = NULL WHERE usuario_id = $1', [targetId]);
    await pool.query('UPDATE auditoria SET usuario_id = NULL WHERE usuario_id = $1', [targetId]);
    await pool.query('UPDATE movimientos_inventario SET usuario_id = NULL WHERE usuario_id = $1', [targetId]);

    // Eliminar
    await pool.query('DELETE FROM usuarios WHERE id = $1', [targetId]);

    await auditLog(req.user.id, 'USUARIO_ELIMINADO', {
      eliminado_id: targetId,
      eliminado_username: existing[0].username,
      ip
    }, ip);

    res.json({ ok: true, message: `Usuario "${existing[0].username}" eliminado` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
