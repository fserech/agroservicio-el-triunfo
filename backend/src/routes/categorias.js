const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// GET all
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST create
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    const { rows } = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), descripcion?.trim() || null]
    );
    res.status(201).json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT update
router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    const { rows } = await pool.query(
      'UPDATE categorias SET nombre=$1, descripcion=$2 WHERE id=$3 RETURNING *',
      [nombre.trim(), descripcion?.trim() || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    // Disassociate products before deleting
    await pool.query('UPDATE productos SET categoria_id = NULL WHERE categoria_id = $1', [req.params.id]);
    const { rowCount } = await pool.query('DELETE FROM categorias WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
