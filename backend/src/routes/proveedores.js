const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');

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

    const { rows } = await pool.query(
      `INSERT INTO proveedores (nombre,razon_social,nit,categoria,contacto,telefono,email,departamento,direccion,plazo_credito,activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [nombre.trim(), razon_social||null, nit||null, categoria||'General',
       contacto||null, telefono||null, email||null, departamento||null,
       direccion||null, plazo_credito, activo]);

    res.status(201).json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, razon_social, nit, categoria, contacto, telefono,
            email, departamento, direccion, plazo_credito, activo } = req.body;
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
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id
//   · sin órdenes de compra    → se elimina
//   · con órdenes              → 409 y se ofrece DESACTIVAR (?desactivar=1) o, solo admin y sin órdenes
//                                abiertas, ELIMINAR DEFINITIVAMENTE (?forzar=1): las órdenes se conservan
//                                pero quedan sin proveedor asociado.
router.delete('/:id', auth, roles('admin', 'supervisor'), async (req, res) => {
  try {
    const id = req.params.id;
    const { rows: pv } = await pool.query('SELECT id FROM proveedores WHERE id=$1', [id]);
    if (!pv.length) return res.status(404).json({ error: 'Proveedor no encontrado' });

    const { rows: c } = await pool.query(
      `SELECT COUNT(*)::int AS n,
              (COUNT(*) FILTER (WHERE estado IN ('pendiente','aprobada','en_transito')))::int AS abiertas
       FROM compras WHERE proveedor_id=$1`, [id]);
    const n = c[0].n, abiertas = c[0].abiertas;
    const esAdmin = req.user.rol === 'admin';

    if (req.query.forzar === '1') {
      if (!esAdmin) return res.status(403).json({ error: 'Solo un administrador puede eliminar definitivamente' });
      if (abiertas > 0) return res.status(409).json({
        error: `No se puede eliminar definitivamente: tiene ${abiertas} orden(es) de compra abierta(s). Recíbelas o cancélalas primero, o desactiva al proveedor`,
        code: 'HAS_OPEN', puede_desactivar: true, puede_forzar: false });
      await pool.query('DELETE FROM proveedores WHERE id=$1', [id]);   // compras: proveedor_id → NULL
      return res.json({ ok: true, accion: 'eliminado' });
    }

    if (n > 0) {
      if (req.query.desactivar === '1') {
        await pool.query('UPDATE proveedores SET activo=false, updated_at=NOW() WHERE id=$1', [id]);
        return res.json({ ok: true, accion: 'desactivado' });
      }
      return res.status(409).json({
        error: `No se puede eliminar: tiene ${n} orden(es) de compra asociada(s)`,
        code: 'HAS_HISTORY', puede_desactivar: true, puede_forzar: esAdmin && abiertas === 0, detalle: { ordenes: n, abiertas },
      });
    }

    await pool.query('DELETE FROM proveedores WHERE id=$1', [id]);
    res.json({ ok: true, accion: 'eliminado' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
