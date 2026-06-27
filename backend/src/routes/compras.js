const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET — listar compras
router.get('/', auth, async (req, res) => {
  try {
    const { estado = '', proveedor_id, page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const p = []; let where = 'WHERE 1=1';
    if (estado)       { p.push(estado);       where += ` AND c.estado=$${p.length}`; }
    if (proveedor_id) { p.push(proveedor_id); where += ` AND c.proveedor_id=$${p.length}`; }
    const cnt = await pool.query(`SELECT COUNT(*) FROM compras c ${where}`, p);
    const { rows } = await pool.query(
      `SELECT c.*, pv.nombre AS prov_nombre, u.nombre AS creado_por
       FROM compras c
       LEFT JOIN proveedores pv ON c.proveedor_id = pv.id
       LEFT JOIN usuarios u    ON c.usuario_id    = u.id
       ${where} ORDER BY c.fecha DESC
       LIMIT $${p.length+1} OFFSET $${p.length+2}`,
      [...p, parseInt(limit), offset]);
    res.json({ data: rows, total: parseInt(cnt.rows[0].count), page: parseInt(page) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET — detalle de una compra con items
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, pv.nombre AS prov_nombre, u.nombre AS creado_por
       FROM compras c
       LEFT JOIN proveedores pv ON c.proveedor_id = pv.id
       LEFT JOIN usuarios u    ON c.usuario_id    = u.id
       WHERE c.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Compra no encontrada' });
    const { rows: items } = await pool.query(
      `SELECT dc.*, p.nombre AS prod_nombre, p.codigo, p.unidad_medida
       FROM detalle_compras dc
       JOIN productos p ON dc.producto_id = p.id
       WHERE dc.compra_id = $1`, [req.params.id]);
    res.json({ ...rows[0], items });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST — crear orden de compra
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { proveedor_id, sucursal_id = 1, items = [], observaciones, fecha_entrega } = req.body;
    if (!proveedor_id)  return res.status(400).json({ error: 'Proveedor requerido' });
    if (!items.length)  return res.status(400).json({ error: 'Debe agregar productos' });

    let subtotal = 0;
    const lineItems = [];
    for (const item of items) {
      const sub = parseFloat(item.precio_unitario) * parseFloat(item.cantidad);
      subtotal += sub;
      lineItems.push({ ...item, subtotal: sub });
    }
    const impuesto = subtotal * 0.12;
    const total    = subtotal + impuesto;

    // Generar número de orden
    const { rows: last } = await client.query(
      "SELECT numero_orden FROM compras ORDER BY id DESC LIMIT 1");
    let nextNum = 1;
    if (last.length) {
      const m = last[0].numero_orden.match(/(\d+)$/);
      if (m) nextNum = parseInt(m[1]) + 1;
    }
    const numero_orden = `OC-${new Date().getFullYear()}-${String(nextNum).padStart(4,'0')}`;

    const { rows: cr } = await client.query(
      `INSERT INTO compras (numero_orden, proveedor_id, sucursal_id, usuario_id,
         subtotal, impuesto, total, estado, observaciones, fecha_entrega)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pendiente',$8,$9) RETURNING *`,
      [numero_orden, proveedor_id, sucursal_id, req.user.id,
       subtotal.toFixed(2), impuesto.toFixed(2), total.toFixed(2),
       observaciones || null, fecha_entrega || null]);

    for (const li of lineItems) {
      await client.query(
        `INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [cr[0].id, li.producto_id, li.cantidad,
         parseFloat(li.precio_unitario).toFixed(2), li.subtotal.toFixed(2)]);
    }
    await client.query('COMMIT');
    res.status(201).json(cr[0]);
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally { client.release(); }
});

// PATCH — cambiar estado (aprobar / cancelar)
router.patch('/:id/estado', auth, async (req, res) => {
  try {
    const { estado } = req.body;
    const allowed = ['aprobada', 'en_transito', 'cancelada'];
    if (!allowed.includes(estado))
      return res.status(400).json({ error: 'Estado inválido' });
    const { rows } = await pool.query(
      `UPDATE compras SET estado=$1 WHERE id=$2 RETURNING *`,
      [estado, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH — recibir orden (actualiza inventario)
router.patch('/:id/recibir', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: comp } = await client.query(
      'SELECT * FROM compras WHERE id=$1', [req.params.id]);
    if (!comp.length) return res.status(404).json({ error: 'Compra no encontrada' });
    if (comp[0].estado === 'recibida')
      return res.status(400).json({ error: 'Esta orden ya fue recibida' });

    const { rows: items } = await client.query(
      'SELECT * FROM detalle_compras WHERE compra_id=$1', [req.params.id]);
    const sucId = comp[0].sucursal_id || 1;

    for (const item of items) {
      // Buscar o crear registro de inventario
      const { rows: inv } = await client.query(
        'SELECT stock_actual FROM inventario WHERE producto_id=$1 AND sucursal_id=$2',
        [item.producto_id, sucId]);
      const anterior = inv.length ? parseFloat(inv[0].stock_actual) : 0;
      const nuevo    = anterior + parseFloat(item.cantidad);

      if (inv.length) {
        await client.query(
          `UPDATE inventario SET stock_actual=$1, updated_at=NOW()
           WHERE producto_id=$2 AND sucursal_id=$3`,
          [nuevo, item.producto_id, sucId]);
      } else {
        await client.query(
          `INSERT INTO inventario (producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo)
           VALUES ($1,$2,$3,0,0)`,
          [item.producto_id, sucId, nuevo]);
      }

      await client.query(
        `INSERT INTO movimientos_inventario
           (producto_id, sucursal_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
         VALUES ($1,$2,$3,'entrada',$4,$5,$6,$7)`,
        [item.producto_id, sucId, req.user.id,
         item.cantidad, anterior, nuevo, 'Compra ' + comp[0].numero_orden]);
    }

    const { rows } = await client.query(
      `UPDATE compras SET estado='recibida' WHERE id=$1 RETURNING *`,
      [req.params.id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;
