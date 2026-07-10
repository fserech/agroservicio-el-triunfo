const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET / — Lista con totales de compras (optimizado)
router.get('/', auth, async (req, res) => {
  try {
    const { buscar = '', activo = '' } = req.query;
    let where = 'WHERE 1=1';
    const p = [];
    if (buscar) { p.push('%'+buscar+'%'); where += ` AND (pv.nombre ILIKE $${p.length} OR pv.nit ILIKE $${p.length})`; }
    if (activo !== '') { p.push(activo === 'true'); where += ` AND pv.activo=$${p.length}`; }

    const { rows } = await pool.query(`
      SELECT pv.*,
        COALESCE(c.compras_totales, 0) AS compras_totales,
        COALESCE(c.num_ordenes, 0)     AS num_ordenes
      FROM proveedores pv
      LEFT JOIN (
        SELECT proveedor_id,
               SUM(total)  AS compras_totales,
               COUNT(*)    AS num_ordenes
        FROM compras
        WHERE estado NOT IN ('cancelada')
        GROUP BY proveedor_id
      ) c ON c.proveedor_id = pv.id
      ${where}
      ORDER BY pv.nombre`, p);

    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pv.*, COALESCE(c.compras_totales,0) AS compras_totales
       FROM proveedores pv
       LEFT JOIN (SELECT proveedor_id, SUM(total) AS compras_totales FROM compras GROUP BY 1) c
         ON c.proveedor_id = pv.id
       WHERE pv.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' });

    const ordenes = await pool.query(
      `SELECT id, numero_orden, total, estado, fecha FROM compras
       WHERE proveedor_id=$1 ORDER BY fecha DESC LIMIT 10`, [req.params.id]);

    res.json({ ...rows[0], ordenes: ordenes.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, razon_social, nit, categoria, contacto, telefono,
            email, departamento, direccion, plazo_credito = 0, activo = true } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    // Verificar duplicado (case-insensitive, ignora espacios)
    const dup = await pool.query(
      'SELECT id FROM proveedores WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))',
      [nombre]
    );
    if (dup.rows.length) {
      return res.status(400).json({ error: `Ya existe un proveedor llamado "${nombre.trim()}"` });
    }

    const { rows } = await pool.query(
      `INSERT INTO proveedores (nombre,razon_social,nit,categoria,contacto,telefono,email,departamento,direccion,plazo_credito,activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [nombre.trim(), razon_social||null, nit||null, categoria||'General',
       contacto||null, telefono||null, email||null, departamento||null,
       direccion||null, plazo_credito, activo]);

    res.status(201).json(rows[0]);
  } catch(e) {
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un proveedor con ese nombre' });
    }
    res.status(500).json({ error: e.message });
  }
});

// PUT /:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, razon_social, nit, categoria, contacto, telefono,
            email, departamento, direccion, plazo_credito, activo } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    // Verificar duplicado excluyendo el registro actual
    const dup = await pool.query(
      'SELECT id FROM proveedores WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) AND id != $2',
      [nombre, req.params.id]
    );
    if (dup.rows.length) {
      return res.status(400).json({ error: `Ya existe otro proveedor llamado "${nombre.trim()}"` });
    }

    const { rows } = await pool.query(
      `UPDATE proveedores SET nombre=$1,razon_social=$2,nit=$3,categoria=$4,
         contacto=$5,telefono=$6,email=$7,departamento=$8,direccion=$9,
         plazo_credito=$10,activo=$11,updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [nombre, razon_social||null, nit||null, categoria||'General',
       contacto||null, telefono||null, email||null, departamento||null,
       direccion||null, plazo_credito, activo, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch(e) {
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un proveedor con ese nombre' });
    }
    res.status(500).json({ error: e.message });
  }
});

// DELETE /:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows: compras } = await pool.query(
      'SELECT COUNT(*) FROM compras WHERE proveedor_id=$1', [req.params.id]);
    if (parseInt(compras[0].count) > 0)
      return res.status(400).json({
        error: `No se puede eliminar: tiene ${compras[0].count} orden(es) de compra asociada(s)`
      });
    const { rowCount } = await pool.query('DELETE FROM proveedores WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;