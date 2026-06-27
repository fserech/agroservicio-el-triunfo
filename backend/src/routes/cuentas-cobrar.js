const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET — listar cuentas por cobrar
router.get('/', auth, async (req, res) => {
  try {
    const { estado = '', cliente_id } = req.query;
    const p = []; let where = 'WHERE 1=1';
    if (estado)     { p.push(estado);     where += ` AND cc.estado=$${p.length}`; }
    if (cliente_id) { p.push(cliente_id); where += ` AND cc.cliente_id=$${p.length}`; }

    // Marcar vencidas automáticamente
    await pool.query(
      `UPDATE cuentas_cobrar SET estado='vencida', updated_at=NOW()
       WHERE estado IN ('pendiente','parcial') AND fecha_vence < CURRENT_DATE AND saldo > 0`);

    const { rows } = await pool.query(
      `SELECT cc.*, c.nombre AS cliente_nombre, v.numero_factura
       FROM cuentas_cobrar cc
       LEFT JOIN clientes c ON cc.cliente_id = c.id
       LEFT JOIN ventas   v ON cc.venta_id   = v.id
       ${where}
       ORDER BY
         CASE cc.estado WHEN 'vencida' THEN 0 WHEN 'pendiente' THEN 1
           WHEN 'parcial' THEN 2 ELSE 3 END,
         cc.fecha_vence`, p);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST — registrar pago parcial o total
router.post('/:id/pago', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { monto, metodo_pago = 'efectivo' } = req.body;
    if (!monto || parseFloat(monto) <= 0)
      return res.status(400).json({ error: 'Monto inválido' });

    const { rows: cc } = await client.query(
      'SELECT * FROM cuentas_cobrar WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!cc.length)                return res.status(404).json({ error: 'Cuenta no encontrada' });
    if (cc[0].estado === 'pagada') return res.status(400).json({ error: 'Esta cuenta ya está pagada' });

    const saldoActual = parseFloat(cc[0].saldo);
    const montoPago   = Math.min(parseFloat(monto), saldoActual);
    const nuevoPagado = parseFloat(cc[0].monto_pagado) + montoPago;

    // 1. Actualizar monto_pagado — PostgreSQL recalcula saldo GENERATED automáticamente
    await client.query(
      `UPDATE cuentas_cobrar SET monto_pagado=$1, updated_at=NOW() WHERE id=$2`,
      [nuevoPagado.toFixed(2), req.params.id]);

    // 2. Leer el saldo generado usando la MISMA conexión (client) para ver los cambios no commiteados
    const { rows: after } = await client.query(
      'SELECT saldo FROM cuentas_cobrar WHERE id=$1', [req.params.id]);

    const saldoFinal  = parseFloat(after[0].saldo);
    const nuevoEstado = saldoFinal <= 0.01 ? 'pagada' : 'parcial';

    // 3. Actualizar estado basado en el saldo real de la BD
    await client.query(
      'UPDATE cuentas_cobrar SET estado=$1 WHERE id=$2',
      [nuevoEstado, req.params.id]);

    await client.query('COMMIT');

    // 4. Devolver fila completa actualizada (ahora sí con pool, ya está commiteado)
    const { rows: updated } = await pool.query(
      `SELECT cc.*, c.nombre AS cliente_nombre, v.numero_factura
       FROM cuentas_cobrar cc
       LEFT JOIN clientes c ON cc.cliente_id = c.id
       LEFT JOIN ventas   v ON cc.venta_id   = v.id
       WHERE cc.id=$1`, [req.params.id]);

    res.json(updated[0]);
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;