const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET — listar ventas con paginación y filtros
router.get('/', auth, async (req, res) => {
  try {
    const { estado = '', desde = '', hasta = '', cliente_id, page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const p = []; let where = 'WHERE 1=1';
    if (estado)     { p.push(estado);     where += ` AND v.estado=$${p.length}`; }
    if (desde)      { p.push(desde);      where += ` AND v.fecha::date>=$${p.length}`; }
    if (hasta)      { p.push(hasta);      where += ` AND v.fecha::date<=$${p.length}`; }
    if (cliente_id) { p.push(cliente_id); where += ` AND v.cliente_id=$${p.length}`; }
    const cnt = await pool.query(`SELECT COUNT(*) FROM ventas v ${where}`, p);
    const { rows } = await pool.query(
      `SELECT v.*,
         c.nombre AS cliente_nombre, c.nit AS cliente_nit,
         u.nombre AS vendedor
       FROM ventas v
       LEFT JOIN clientes  c ON v.cliente_id  = c.id
       LEFT JOIN usuarios  u ON v.usuario_id  = u.id
       ${where} ORDER BY v.fecha DESC
       LIMIT $${p.length+1} OFFSET $${p.length+2}`,
      [...p, parseInt(limit), offset]);
    res.json({ data: rows, total: parseInt(cnt.rows[0].count), page: parseInt(page) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET — detalle de venta con items
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*, c.nombre AS cliente_nombre, c.nit AS cliente_nit, u.nombre AS vendedor
       FROM ventas v
       LEFT JOIN clientes c ON v.cliente_id = c.id
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Venta no encontrada' });
    const { rows: items } = await pool.query(
      `SELECT dv.*, p.nombre AS prod_nombre, p.codigo, p.unidad_medida
       FROM detalle_ventas dv
       JOIN productos p ON dv.producto_id = p.id
       WHERE dv.venta_id=$1`, [req.params.id]);
    res.json({ ...rows[0], items });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST — crear venta
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      cliente_id,
      sucursal_id  = 1,
      items        = [],
      metodo_pago  = 'efectivo',
      observaciones,
      fecha_vence  = null,
      tasa_interes = 0,
    } = req.body;

    // Leer aplica_iva explícitamente — evita que false sea sobreescrito por default JS
    const ivaActivo = req.body.aplica_iva === true;

    if (!items.length)
      return res.status(400).json({ error: 'Debe agregar productos' });

    if (metodo_pago === 'credito' && !fecha_vence)
      return res.status(400).json({ error: 'La fecha de vencimiento es requerida para ventas a crédito' });

    // ── Validar stock y calcular subtotal ──
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const { rows: pr } = await client.query(
        'SELECT precio_venta FROM productos WHERE id=$1 AND activo=true',
        [item.producto_id]);
      if (!pr.length)
        throw new Error(`Producto ${item.producto_id} no encontrado o inactivo`);

      const { rows: inv } = await client.query(
        'SELECT stock_actual FROM inventario WHERE producto_id=$1 AND sucursal_id=$2',
        [item.producto_id, sucursal_id]);
      const stockDisp = inv.length ? parseFloat(inv[0].stock_actual) : 0;
      if (stockDisp < parseFloat(item.cantidad))
        throw new Error(`Stock insuficiente. Disponible: ${stockDisp}`);

      const precio = parseFloat(item.precio_unitario || pr[0].precio_venta);
      const sub    = precio * parseFloat(item.cantidad);
      subtotal += sub;
      lineItems.push({ ...item, precio_unitario: precio, subtotal: sub });
    }

    // ── Cálculo de impuesto e interés ──
    const impuesto     = ivaActivo ? subtotal * 0.12 : 0;
    const totalBase    = subtotal + impuesto;
    const tasaNum      = parseFloat(tasa_interes) || 0;
    const montoInteres = (metodo_pago === 'credito' && tasaNum > 0)
                           ? totalBase * (tasaNum / 100)
                           : 0;
    const total        = totalBase + montoInteres;

    // ── Número de factura ──
    const { rows: cfg } = await client.query(
      "SELECT valor FROM configuracion WHERE clave='factura_prefijo'");
    const prefijo = cfg[0]?.valor || 'F-';
    const { rows: lastV } = await client.query(
      "SELECT numero_factura FROM ventas ORDER BY id DESC LIMIT 1");
    let nextNum = 1;
    if (lastV.length) {
      const m = lastV[0].numero_factura.match(/(\d+)$/);
      if (m) nextNum = parseInt(m[1]) + 1;
    }
    const numero_factura = prefijo + String(nextNum).padStart(4, '0');

    // ── Construir observaciones con metadatos ──
    const tags = [];
    if (metodo_pago === 'credito' && fecha_vence) tags.push(`[vence:${fecha_vence}]`);
    if (metodo_pago === 'credito' && tasaNum > 0) tags.push(`[interes:${tasaNum}%]`);
    if (!ivaActivo)                               tags.push(`[sin_iva]`);
    const obsFinal = [observaciones, ...tags].filter(Boolean).join(' ') || null;

    // ── Insertar venta ──
    const { rows: vr } = await client.query(
      `INSERT INTO ventas
         (numero_factura, cliente_id, sucursal_id, usuario_id,
          subtotal, impuesto, total, estado, metodo_pago, observaciones,
          tasa_interes, monto_interes, aplica_iva)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        numero_factura,
        cliente_id || null,
        sucursal_id,
        req.user.id,
        subtotal.toFixed(2),
        impuesto.toFixed(2),
        total.toFixed(2),
        metodo_pago,
        obsFinal,
        tasaNum.toFixed(2),
        montoInteres.toFixed(2),
        ivaActivo,
      ]);
    const venta = vr[0];

    // ── Insertar detalle ──
    for (const li of lineItems) {
      await client.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [venta.id, li.producto_id, li.cantidad,
         li.precio_unitario.toFixed(2), li.subtotal.toFixed(2)]);
    }

    await client.query('COMMIT');
    res.status(201).json(venta);
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally { client.release(); }
});

// PATCH — cambiar estado de venta
router.patch('/:id/estado', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { estado } = req.body;
    const { rows: old } = await client.query('SELECT * FROM ventas WHERE id=$1', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Venta no encontrada' });
    const venta = old[0];

    if (venta.estado === 'CANCEL' || venta.estado === 'FINALIZED')
      return res.status(400).json({ error: `No se puede cambiar desde estado ${venta.estado}` });

    if (estado === 'FINALIZED') {
      const { rows: items } = await client.query(
        'SELECT * FROM detalle_ventas WHERE venta_id=$1', [venta.id]);
      const sucId = venta.sucursal_id || 1;

      for (const item of items) {
        const { rows: inv } = await client.query(
          'SELECT stock_actual FROM inventario WHERE producto_id=$1 AND sucursal_id=$2',
          [item.producto_id, sucId]);
        if (!inv.length) continue;
        const anterior = parseFloat(inv[0].stock_actual);
        const nuevo    = Math.max(0, anterior - parseFloat(item.cantidad));
        await client.query(
          `UPDATE inventario SET stock_actual=$1, updated_at=NOW()
           WHERE producto_id=$2 AND sucursal_id=$3`,
          [nuevo, item.producto_id, sucId]);
        await client.query(
          `INSERT INTO movimientos_inventario
             (producto_id, sucursal_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
           VALUES ($1,$2,$3,'salida',$4,$5,$6,$7)`,
          [item.producto_id, sucId, req.user.id,
           item.cantidad, anterior, nuevo, 'Venta ' + venta.numero_factura]);
      }

      if (venta.metodo_pago === 'credito' && venta.cliente_id) {
        let fechaVence = null;
        const obs = venta.observaciones || '';
        const match = obs.match(/\[vence:(\d{4}-\d{2}-\d{2})\]/);
        if (match) {
          fechaVence = match[1];
        } else {
          const { rows: cli } = await client.query(
            'SELECT dias_credito FROM clientes WHERE id=$1', [venta.cliente_id]);
          const dias = cli[0]?.dias_credito || 30;
          const d = new Date();
          d.setDate(d.getDate() + dias);
          fechaVence = d.toISOString().split('T')[0];
        }
        await client.query(
          `INSERT INTO cuentas_cobrar
             (venta_id, cliente_id, monto_total, monto_pagado, fecha_vence, estado)
           VALUES ($1,$2,$3,0,$4,'pendiente')
           ON CONFLICT DO NOTHING`,
          [venta.id, venta.cliente_id, venta.total, fechaVence]);
      }
    }

    const { rows } = await client.query(
      'UPDATE ventas SET estado=$1 WHERE id=$2 RETURNING *',
      [estado, req.params.id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;