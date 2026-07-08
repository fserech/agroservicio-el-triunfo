const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// Offset fijo Guatemala = UTC-6
// Usamos (fecha - INTERVAL '6 hours')::date para convertir UTC → fecha local GT
const GT = `INTERVAL '6 hours'`;

// Helper de porcentaje de cambio
const pct = (actual, anterior) => {
  const a = parseFloat(actual);
  const b = parseFloat(anterior);
  if (b === 0) return a > 0 ? 100 : 0;
  return +((( a - b) / b) * 100).toFixed(1);
};

// ── KPIs principales con comparativas ────────────────────────────────────────
router.get('/kpis', auth, async (req, res) => {
  try {
    const [
      ventasHoy, ventasAyer,
      ventasMes, ventasMesAnt,
      ventasAnio, ventasAnioAnt,
      ventasSemana, ventasSemanaAnt,
      inventario, clientes, cuentas, stockCritico
    ] = await Promise.all([

      // Hoy (fecha en GT)
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM ventas
        WHERE (fecha - ${GT})::date = (NOW() - ${GT})::date
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      // Ayer
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM ventas
        WHERE (fecha - ${GT})::date = (NOW() - ${GT})::date - 1
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      // Este mes
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM ventas
        WHERE DATE_TRUNC('month', (fecha - ${GT})::date)
              = DATE_TRUNC('month', (NOW() - ${GT})::date)
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      // Mes anterior
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM ventas
        WHERE DATE_TRUNC('month', (fecha - ${GT})::date)
              = DATE_TRUNC('month', (NOW() - ${GT})::date) - INTERVAL '1 month'
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      // Este año
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM ventas
        WHERE DATE_TRUNC('year', (fecha - ${GT})::date)
              = DATE_TRUNC('year', (NOW() - ${GT})::date)
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      // Año anterior
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM ventas
        WHERE DATE_TRUNC('year', (fecha - ${GT})::date)
              = DATE_TRUNC('year', (NOW() - ${GT})::date) - INTERVAL '1 year'
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      // Últimos 7 días
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM ventas
        WHERE (fecha - ${GT})::date >= (NOW() - ${GT})::date - 6
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      // 7 días anteriores
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM ventas
        WHERE (fecha - ${GT})::date BETWEEN
              (NOW() - ${GT})::date - 13
          AND (NOW() - ${GT})::date - 7
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')`),

      pool.query(`
        SELECT COALESCE(SUM(p.precio_venta * i.stock_actual),0) AS valor,
               COUNT(*) AS total_productos
        FROM inventario i JOIN productos p ON i.producto_id = p.id
        WHERE p.activo = true`),

      pool.query(`SELECT COUNT(*) AS activos FROM clientes WHERE activo = true`),

      pool.query(`
        SELECT COALESCE(SUM(saldo),0) AS total FROM cuentas_cobrar
        WHERE estado IN ('pendiente','parcial','vencida')`),

      pool.query(`
        SELECT COUNT(*) AS criticos FROM inventario
        WHERE stock_actual <= stock_minimo AND stock_minimo > 0`)
    ]);

    res.json({
      ventas_hoy:          parseFloat(ventasHoy.rows[0].total),
      ventas_hoy_count:    parseInt(ventasHoy.rows[0].count),
      ventas_ayer:         parseFloat(ventasAyer.rows[0].total),
      ventas_hoy_pct:      pct(ventasHoy.rows[0].total, ventasAyer.rows[0].total),

      ventas_mes:          parseFloat(ventasMes.rows[0].total),
      ventas_mes_count:    parseInt(ventasMes.rows[0].count),
      ventas_mes_ant:      parseFloat(ventasMesAnt.rows[0].total),
      ventas_mes_pct:      pct(ventasMes.rows[0].total, ventasMesAnt.rows[0].total),

      ventas_anio:         parseFloat(ventasAnio.rows[0].total),
      ventas_anio_count:   parseInt(ventasAnio.rows[0].count),
      ventas_anio_ant:     parseFloat(ventasAnioAnt.rows[0].total),
      ventas_anio_pct:     pct(ventasAnio.rows[0].total, ventasAnioAnt.rows[0].total),

      ventas_semana:       parseFloat(ventasSemana.rows[0].total),
      ventas_semana_count: parseInt(ventasSemana.rows[0].count),
      ventas_semana_ant:   parseFloat(ventasSemanaAnt.rows[0].total),
      ventas_semana_pct:   pct(ventasSemana.rows[0].total, ventasSemanaAnt.rows[0].total),

      valor_inventario:    parseFloat(inventario.rows[0].valor),
      total_productos:     parseInt(inventario.rows[0].total_productos),
      clientes_activos:    parseInt(clientes.rows[0].activos),
      cuentas_por_cobrar:  parseFloat(cuentas.rows[0].total),
      stock_critico:       parseInt(stockCritico.rows[0].criticos),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Gráfica línea de tendencia últimos 30 días ────────────────────────────────
router.get('/ventas-chart', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      WITH dias AS (
        SELECT generate_series(
          (NOW() - ${GT})::date - 29,
          (NOW() - ${GT})::date,
          '1 day'::interval
        )::date AS dia
      ),
      ventas_dia AS (
        SELECT (fecha - ${GT})::date AS dia,
               COALESCE(SUM(total),0) AS total,
               COUNT(*) AS count
        FROM ventas
        WHERE (fecha - ${GT})::date >= (NOW() - ${GT})::date - 29
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

// ── Gráfica barras últimos 12 meses ──────────────────────────────────────────
router.get('/ventas-meses', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      WITH meses AS (
        SELECT generate_series(
          DATE_TRUNC('month', (NOW() - ${GT})::date) - INTERVAL '11 months',
          DATE_TRUNC('month', (NOW() - ${GT})::date),
          '1 month'::interval
        )::date AS mes
      ),
      ventas_mes AS (
        SELECT DATE_TRUNC('month', (fecha - ${GT})::date)::date AS mes,
               COALESCE(SUM(total),0) AS total,
               COUNT(*) AS count
        FROM ventas
        WHERE (fecha - ${GT})::date >= DATE_TRUNC('month', (NOW() - ${GT})::date) - INTERVAL '11 months'
          AND estado IN ('FINALIZED','IN_PROCESS','PENDING')
        GROUP BY 1
      )
      SELECT m.mes, COALESCE(v.total,0) AS total, COALESCE(v.count,0) AS count
      FROM meses m
      LEFT JOIN ventas_mes v ON v.mes = m.mes
      ORDER BY m.mes`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Top productos del mes ─────────────────────────────────────────────────────
router.get('/top-productos', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.nombre, p.codigo, p.unidad_medida,
             SUM(dv.cantidad) AS total_vendido,
             SUM(dv.subtotal) AS total_monto
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      JOIN ventas    v ON dv.venta_id    = v.id
      WHERE v.estado IN ('FINALIZED','IN_PROCESS','PENDING')
        AND DATE_TRUNC('month', (v.fecha - ${GT})::date)
            = DATE_TRUNC('month', (NOW() - ${GT})::date)
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
      (SELECT 'venta' AS tipo, numero_factura AS ref, total AS valor, estado, fecha
       FROM ventas ORDER BY fecha DESC LIMIT 6)
      UNION ALL
      (SELECT 'compra' AS tipo, numero_orden AS ref, total AS valor, estado, fecha
       FROM compras ORDER BY fecha DESC LIMIT 6)
      ORDER BY fecha DESC LIMIT 12`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Resumen por vendedor ──────────────────────────────────────────────────────
router.get('/vendedores', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.nombre AS vendedor, u.username,
             COUNT(v.id) AS total_ventas,
             COALESCE(SUM(v.total),0) AS monto_total
      FROM ventas v
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE DATE_TRUNC('month', (v.fecha - ${GT})::date)
            = DATE_TRUNC('month', (NOW() - ${GT})::date)
        AND v.estado IN ('FINALIZED','IN_PROCESS','PENDING')
      GROUP BY u.id, u.nombre, u.username
      ORDER BY monto_total DESC`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;