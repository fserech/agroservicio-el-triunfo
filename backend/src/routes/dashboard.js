const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ── KPIs principales ──────────────────────────────────────────────────────────
router.get('/kpis', auth, async (req, res) => {
  try {
    // Guatemala = UTC-6. Usar AT TIME ZONE para comparar fecha local
    const [ventasHoy, ventasMes, inventario, clientes, cuentas, stockCritico] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count
        FROM ventas
        WHERE (fecha AT TIME ZONE 'America/Guatemala')::date
              = (NOW() AT TIME ZONE 'America/Guatemala')::date
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count
        FROM ventas
        WHERE DATE_TRUNC('month', fecha AT TIME ZONE 'America/Guatemala')
              = DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Guatemala')
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      pool.query(`
        SELECT COALESCE(SUM(p.precio_venta * i.stock_actual),0) AS valor,
               COUNT(*) AS total_productos
        FROM inventario i
        JOIN productos p ON i.producto_id = p.id
        WHERE p.activo = true`),

      pool.query(`SELECT COUNT(*) AS activos FROM clientes WHERE activo = true`),

      pool.query(`
        SELECT COALESCE(SUM(saldo),0) AS total
        FROM cuentas_cobrar
        WHERE estado IN ('pendiente','parcial','vencida')`),

      pool.query(`
        SELECT COUNT(*) AS criticos
        FROM inventario i
        WHERE i.stock_actual <= i.stock_minimo AND i.stock_minimo > 0`)
    ]);

    res.json({
      ventas_hoy:         parseFloat(ventasHoy.rows[0].total),
      ventas_hoy_count:   parseInt(ventasHoy.rows[0].count),
      ventas_mes:         parseFloat(ventasMes.rows[0].total),
      ventas_mes_count:   parseInt(ventasMes.rows[0].count),
      valor_inventario:   parseFloat(inventario.rows[0].valor),
      total_productos:    parseInt(inventario.rows[0].total_productos),
      clientes_activos:   parseInt(clientes.rows[0].activos),
      cuentas_por_cobrar: parseFloat(cuentas.rows[0].total),
      stock_critico:      parseInt(stockCritico.rows[0].criticos),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Gráfica de barras últimos 30 días ─────────────────────────────────────────
router.get('/ventas-chart', auth, async (req, res) => {
  try {
    // Generar todos los días de los últimos 30 para que no falten días sin ventas
    const { rows } = await pool.query(`
      WITH dias AS (
        SELECT generate_series(
          (NOW() AT TIME ZONE 'America/Guatemala')::date - 29,
          (NOW() AT TIME ZONE 'America/Guatemala')::date,
          '1 day'::interval
        )::date AS dia
      ),
      ventas_dia AS (
        SELECT (fecha AT TIME ZONE 'America/Guatemala')::date AS dia,
               COALESCE(SUM(total),0) AS total,
               COUNT(*) AS count
        FROM ventas
        WHERE fecha >= NOW() - INTERVAL '30 days'
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')
        GROUP BY 1
      )
      SELECT d.dia, COALESCE(v.total,0) AS total, COALESCE(v.count,0) AS count
      FROM dias d
      LEFT JOIN ventas_dia v ON v.dia = d.dia
      ORDER BY d.dia`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Top productos del mes ─────────────────────────────────────────────────────
router.get('/top-productos', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.nombre, p.codigo, p.unidad_medida,
             SUM(dv.cantidad)  AS total_vendido,
             SUM(dv.subtotal)  AS total_monto
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      JOIN ventas    v ON dv.venta_id    = v.id
      WHERE v.estado IN ('FINALIZED','IN_PROCESS','PENDING')
        AND v.fecha >= DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Guatemala')
      GROUP BY p.id, p.nombre, p.codigo, p.unidad_medida
      ORDER BY total_monto DESC
      LIMIT 10`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Actividad reciente ────────────────────────────────────────────────────────
router.get('/actividad', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      (SELECT 'venta'  AS tipo, numero_factura AS ref, total AS valor,
              estado, fecha FROM ventas  ORDER BY fecha DESC LIMIT 6)
      UNION ALL
      (SELECT 'compra' AS tipo, numero_orden   AS ref, total AS valor,
              estado, fecha FROM compras ORDER BY fecha DESC LIMIT 6)
      ORDER BY fecha DESC LIMIT 12`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Resumen por vendedor (mes actual) ────────────────────────────────────────
router.get('/vendedores', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.nombre AS vendedor, u.username,
             COUNT(v.id)        AS total_ventas,
             COALESCE(SUM(v.total),0) AS monto_total
      FROM ventas v
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.fecha >= DATE_TRUNC('month', NOW())
        AND v.estado IN ('FINALIZED','IN_PROCESS','PENDING')
      GROUP BY u.id, u.nombre, u.username
      ORDER BY monto_total DESC`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
