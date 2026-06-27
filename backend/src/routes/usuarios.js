const router = require('express').Router();
const pool   = require('../db/pool');
const bcrypt = require('bcryptjs');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');
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

// PUT — actualizar usuario
router.put('/:id', auth, roles('admin'), async (req, res) => {
  const ip = getClientIP(req);
  try {
    const { nombre, email, rol, activo } = req.body;
    let q = 'UPDATE usuarios SET nombre=$1, email=$2, rol=$3, activo=$4, updated_at=NOW()';
    const p = [nombre, email || null, rol, activo];
    if (req.body.password) {
      q += ', password_hash=$5 WHERE id=$6 RETURNING id, nombre, username, email, rol, activo';
      p.push(await bcrypt.hash(req.body.password, 12), req.params.id);
    } else {
      q += ' WHERE id=$5 RETURNING id, nombre, username, email, rol, activo';
      p.push(req.params.id);
    }
    const { rows } = await pool.query(q, p);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    await auditLog(req.user.id, 'USUARIO_ACTUALIZADO', { id: req.params.id, ip }, ip);
    res.json(rows[0]);
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
