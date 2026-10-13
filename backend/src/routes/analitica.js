/**
 * analitica.js — KPIs reales + pronóstico de demanda por producto
 *
 *   GET /api/analitica/resumen?dias=30        KPIs del periodo vs periodo anterior
 *   GET /api/analitica/tendencia?dias=90      serie diaria + promedio móvil + pronóstico 14 d
 *   GET /api/analitica/distribucion?dias=30   categorías, top productos, pagos, vendedores, mapa de calor, combos
 *   GET /api/analitica/productos?semanas=16   ranking y predicción de demanda por producto
 *
 * Notas de datos
 *  • Una "venta" cuenta si está FINALIZED, IN_PROCESS o PENDING (igual que el dashboard original).
 *  • Las fechas se guardan como TIMESTAMP en UTC; aquí se convierten a hora de Guatemala.
 *  • El margen usa el precio_compra ACTUAL del producto (el esquema no guarda costo histórico).
 *  • Costos y márgenes solo se devuelven a admin, supervisor y contador.
 */
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { log } = require('../utils/logger');
const { holtDamped, dailyForecast, percentRank, mean, std, clamp, round2 } = require('../utils/forecast');

// ─── Helpers SQL ──────────────────────────────────────────────────────────────
const TZ      = 'America/Guatemala';
const ESTADOS = `('FINALIZED','IN_PROCESS','PENDING')`;
const LOCAL   = (col = 'v.fecha') => `((${col} AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}')`;
const HOY     = `(NOW() AT TIME ZONE '${TZ}')::date`;

const VE_MARGEN = ['admin', 'supervisor', 'contador'];
const puedeVerMargen = (req) => VE_MARGEN.includes(req.user?.rol);

const parseNum = (v, def, min, max) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};
const delta = (act, prev) => (prev ? ((act - prev) / Math.abs(prev)) * 100 : act > 0 ? null : 0);

const fail = (res, ruta, e) => {
  log('ERROR', `analitica ${ruta}`, { error: e.message });
  res.status(500).json({ error: 'No se pudo calcular la analítica' });
};

// ══════════════════════════════════════════════════════════════════════════════
// RESUMEN — KPIs con comparación contra el periodo anterior
// ══════════════════════════════════════════════════════════════════════════════
router.get('/resumen', auth, async (req, res) => {
  try {
    const dias = parseNum(req.query.dias, 30, 7, 365);
    const margenOk = puedeVerMargen(req);
    const ventana = `v.fecha >= NOW() - make_interval(days => $1::int * 2 + 2)`;

    const [per, lin, diario, cxc, inv] = await Promise.all([
      pool.query(`
        SELECT CASE WHEN d > ${HOY} - $1::int THEN 'act' ELSE 'prev' END AS per,
               COUNT(*)::int AS n,
               COALESCE(SUM(total),0)::float AS total,
               COUNT(DISTINCT cliente_id)::int AS clientes
        FROM (SELECT v.total, v.cliente_id, ${LOCAL()}::date AS d
              FROM ventas v WHERE v.estado IN ${ESTADOS} AND ${ventana}) x
        WHERE d > ${HOY} - $1::int * 2
        GROUP BY 1`, [dias]),

      pool.query(`
        SELECT CASE WHEN d > ${HOY} - $1::int THEN 'act' ELSE 'prev' END AS per,
               COALESCE(SUM(cantidad),0)::float AS unidades,
               COALESCE(SUM(subtotal),0)::float AS ingreso,
               COALESCE(SUM(cantidad * precio_compra),0)::float AS costo
        FROM (SELECT dv.cantidad, dv.subtotal, p.precio_compra, ${LOCAL()}::date AS d
              FROM detalle_ventas dv
              JOIN ventas v    ON v.id = dv.venta_id
              JOIN productos p ON p.id = dv.producto_id
              WHERE v.estado IN ${ESTADOS} AND ${ventana}) x
        WHERE d > ${HOY} - $1::int * 2
        GROUP BY 1`, [dias]),

      pool.query(`
        WITH dias AS (
          SELECT generate_series((${HOY} - ($1::int - 1))::timestamp, ${HOY}::timestamp, '1 day'::interval)::date AS dia
        ),
        vd AS (
          SELECT ${LOCAL()}::date AS dia, SUM(v.total) AS total, COUNT(*) AS n
          FROM ventas v
          WHERE v.estado IN ${ESTADOS} AND v.fecha >= NOW() - make_interval(days => $1::int + 2)
          GROUP BY 1
        ),
        ld AS (
          SELECT ${LOCAL()}::date AS dia, SUM(dv.cantidad) AS unid,
                 SUM(dv.subtotal - dv.cantidad * p.precio_compra) AS utilidad
          FROM detalle_ventas dv
          JOIN ventas v    ON v.id = dv.venta_id
          JOIN productos p ON p.id = dv.producto_id
          WHERE v.estado IN ${ESTADOS} AND v.fecha >= NOW() - make_interval(days => $1::int + 2)
          GROUP BY 1
        )
        SELECT d.dia::text AS dia,
               COALESCE(vd.total,0)::float AS total,
               COALESCE(vd.n,0)::int       AS n,
               COALESCE(ld.unid,0)::float  AS unidades,
               COALESCE(ld.utilidad,0)::float AS utilidad
        FROM dias d
        LEFT JOIN vd USING (dia)
        LEFT JOIN ld USING (dia)
        ORDER BY d.dia`, [dias]),

      pool.query(`
        SELECT COALESCE(SUM(saldo),0)::float AS total,
               COUNT(*)::int AS n_abiertas,
               COALESCE(SUM(saldo) FILTER (WHERE fecha_vence < ${HOY} OR estado = 'vencida'),0)::float AS vencido,
               (COUNT(*) FILTER (WHERE fecha_vence < ${HOY} OR estado = 'vencida'))::int AS n_vencidas
        FROM cuentas_cobrar WHERE estado IN ('pendiente','parcial','vencida')`),

      pool.query(`
        SELECT COALESCE(SUM(i.stock_actual * p.precio_compra),0)::float AS valor_costo,
               COALESCE(SUM(i.stock_actual * p.precio_venta),0)::float  AS valor_venta,
               (COUNT(*) FILTER (WHERE i.stock_actual <= i.stock_minimo))::int AS criticos,
               COUNT(DISTINCT p.id)::int AS productos
        FROM inventario i JOIN productos p ON p.id = i.producto_id
        WHERE p.activo = true`),
    ]);

    const P = { act: { n: 0, total: 0, clientes: 0 }, prev: { n: 0, total: 0, clientes: 0 } };
    per.rows.forEach((r) => { P[r.per] = r; });
    const L = { act: { unidades: 0, ingreso: 0, costo: 0 }, prev: { unidades: 0, ingreso: 0, costo: 0 } };
    lin.rows.forEach((r) => { L[r.per] = r; });

    const armar = (p, l) => ({
      ventas: p.total,
      transacciones: p.n,
      ticket: p.n ? p.total / p.n : 0,
      unidades: l.unidades,
      clientes: p.clientes,
      utilidad: margenOk ? l.ingreso - l.costo : null,
      margen: margenOk ? (l.ingreso ? ((l.ingreso - l.costo) / l.ingreso) * 100 : 0) : null,
    });
    const actual = armar(P.act, L.act);
    const anterior = armar(P.prev, L.prev);
    const d = {};
    Object.keys(actual).forEach((k) => {
      d[k] = actual[k] === null ? null : delta(actual[k], anterior[k]);
    });

    res.json({
      dias,
      puede_ver_margen: margenOk,
      actual, anterior, delta: d,
      diario: diario.rows.map((r) => ({ ...r, utilidad: margenOk ? r.utilidad : null })),
      cuentas_cobrar: cxc.rows[0],
      inventario: margenOk ? inv.rows[0] : { ...inv.rows[0], valor_costo: null },
    });
  } catch (e) { fail(res, 'resumen', e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// TENDENCIA — histórico diario + promedio móvil + pronóstico
// ══════════════════════════════════════════════════════════════════════════════
router.get('/tendencia', auth, async (req, res) => {
  try {
    const dias = parseNum(req.query.dias, 90, 30, 365);
    const horizonte = parseNum(req.query.horizonte, 14, 7, 30);

    const { rows } = await pool.query(`
      WITH dias AS (
        SELECT generate_series((${HOY} - ($1::int - 1))::timestamp, ${HOY}::timestamp, '1 day'::interval)::date AS dia
      ),
      vd AS (
        SELECT ${LOCAL()}::date AS dia, SUM(v.total) AS total, COUNT(*) AS n
        FROM ventas v
        WHERE v.estado IN ${ESTADOS} AND v.fecha >= NOW() - make_interval(days => $1::int + 2)
        GROUP BY 1
      )
      SELECT d.dia::text AS dia, COALESCE(vd.total,0)::float AS total, COALESCE(vd.n,0)::int AS n
      FROM dias d LEFT JOIN vd USING (dia) ORDER BY d.dia`, [dias]);

    const historico = rows.map((r, i) => {
      const ventana = rows.slice(Math.max(0, i - 6), i + 1).map((x) => x.total);
      return { ...r, promedio_7d: round2(mean(ventana)) };
    });

    const pron = dailyForecast(rows, horizonte);
    const total_hist = rows.reduce((s, r) => s + r.total, 0);
    const proy = pron.ok ? pron.puntos.reduce((s, p) => s + p.valor, 0) : null;
    const ultimos = rows.slice(-horizonte).reduce((s, r) => s + r.total, 0);

    res.json({
      dias, horizonte, historico,
      pronostico: pron,
      resumen: {
        total_historico: total_hist,
        proyeccion_total: proy,
        ultimos_dias_total: ultimos,
        cambio_esperado_pct: proy !== null ? delta(proy, ultimos) : null,
      },
    });
  } catch (e) { fail(res, 'tendencia', e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// DISTRIBUCIÓN — categorías, top productos, pagos, vendedores, mapa de calor, combos
// ══════════════════════════════════════════════════════════════════════════════
router.get('/distribucion', auth, async (req, res) => {
  try {
    const dias = parseNum(req.query.dias, 30, 7, 365);
    const margenOk = puedeVerMargen(req);

    const lineas = `
      WITH lineas AS (
        SELECT ${LOCAL()}::date AS d, v.id AS venta_id, dv.producto_id, dv.cantidad, dv.subtotal,
               p.nombre, p.codigo, p.unidad_medida, p.precio_compra,
               COALESCE(c.nombre, 'Sin categoría') AS categoria
        FROM detalle_ventas dv
        JOIN ventas v    ON v.id = dv.venta_id
        JOIN productos p ON p.id = dv.producto_id
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE v.estado IN ${ESTADOS} AND v.fecha >= NOW() - make_interval(days => $1::int * 2 + 2)
      )`;
    const ACT  = `d > ${HOY} - $1::int`;
    const PREV = `d <= ${HOY} - $1::int AND d > ${HOY} - $1::int * 2`;

    const [cats, top, pagos, vend, heat, combos] = await Promise.all([
      pool.query(`${lineas}
        SELECT categoria,
               COALESCE(SUM(subtotal) FILTER (WHERE ${ACT}),0)::float  AS ingreso,
               COALESCE(SUM(cantidad) FILTER (WHERE ${ACT}),0)::float  AS unidades,
               COALESCE(SUM(subtotal - cantidad * precio_compra) FILTER (WHERE ${ACT}),0)::float AS utilidad,
               COALESCE(SUM(subtotal) FILTER (WHERE ${PREV}),0)::float AS ingreso_prev
        FROM lineas GROUP BY categoria
        HAVING SUM(subtotal) FILTER (WHERE ${ACT}) > 0
        ORDER BY ingreso DESC`, [dias]),

      pool.query(`${lineas}
        SELECT producto_id AS id, nombre, codigo, unidad_medida, categoria,
               COALESCE(SUM(subtotal) FILTER (WHERE ${ACT}),0)::float  AS ingreso,
               COALESCE(SUM(cantidad) FILTER (WHERE ${ACT}),0)::float  AS unidades,
               COALESCE(SUM(subtotal - cantidad * precio_compra) FILTER (WHERE ${ACT}),0)::float AS utilidad,
               COALESCE(SUM(subtotal) FILTER (WHERE ${PREV}),0)::float AS ingreso_prev
        FROM lineas GROUP BY producto_id, nombre, codigo, unidad_medida, categoria
        HAVING SUM(subtotal) FILTER (WHERE ${ACT}) > 0
        ORDER BY ingreso DESC LIMIT 10`, [dias]),

      pool.query(`
        SELECT COALESCE(metodo_pago,'efectivo') AS metodo, COUNT(*)::int AS n, COALESCE(SUM(total),0)::float AS total
        FROM ventas v
        WHERE v.estado IN ${ESTADOS} AND v.fecha >= NOW() - make_interval(days => $1::int + 2)
          AND ${LOCAL()}::date > ${HOY} - $1::int
        GROUP BY 1 ORDER BY total DESC`, [dias]),

      pool.query(`
        SELECT u.nombre AS vendedor, COUNT(v.id)::int AS n, COALESCE(SUM(v.total),0)::float AS total
        FROM ventas v JOIN usuarios u ON u.id = v.usuario_id
        WHERE v.estado IN ${ESTADOS} AND v.fecha >= NOW() - make_interval(days => $1::int + 2)
          AND ${LOCAL()}::date > ${HOY} - $1::int
        GROUP BY u.id, u.nombre ORDER BY total DESC LIMIT 8`, [dias]),

      pool.query(`
        SELECT EXTRACT(DOW  FROM ${LOCAL()})::int AS dow,
               EXTRACT(HOUR FROM ${LOCAL()})::int AS hora,
               COUNT(*)::int AS n, COALESCE(SUM(v.total),0)::float AS total
        FROM ventas v
        WHERE v.estado IN ${ESTADOS} AND v.fecha >= NOW() - INTERVAL '92 days'
        GROUP BY 1,2`),

      pool.query(`
        WITH vv AS (
          SELECT v.id FROM ventas v
          WHERE v.estado IN ${ESTADOS} AND v.fecha >= NOW() - INTERVAL '90 days'
        )
        SELECT pa.nombre AS a, pb.nombre AS b,
               COUNT(DISTINCT da.venta_id)::int AS veces,
               (COUNT(DISTINCT da.venta_id) * 100.0 / NULLIF((SELECT COUNT(*) FROM vv),0))::float AS pct
        FROM detalle_ventas da
        JOIN detalle_ventas db ON db.venta_id = da.venta_id AND db.producto_id > da.producto_id
        JOIN vv ON vv.id = da.venta_id
        JOIN productos pa ON pa.id = da.producto_id
        JOIN productos pb ON pb.id = db.producto_id
        GROUP BY pa.nombre, pb.nombre
        ORDER BY veces DESC, pa.nombre LIMIT 6`),
    ]);

    const quitar = (rows) => (margenOk ? rows : rows.map((r) => ({ ...r, utilidad: null })));

    res.json({
      dias,
      categorias:  quitar(cats.rows),
      top_productos: quitar(top.rows),
      metodos_pago: pagos.rows,
      vendedores:  vend.rows,
      mapa_calor:  { dias: 90, celdas: heat.rows },
      combos:      combos.rows,
    });
  } catch (e) { fail(res, 'distribucion', e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTOS — ranking + predicción de demanda (los "más vendibles")
// ══════════════════════════════════════════════════════════════════════════════
router.get('/productos', auth, async (req, res) => {
  try {
    const W = parseNum(req.query.semanas, 16, 8, 26);          // semanas de historial
    const dias = W * 7;
    const margenOk = puedeVerMargen(req);
    const ventana = `v.fecha >= NOW() - make_interval(days => $1::int + 2)
                     AND ${HOY} - ${LOCAL()}::date BETWEEN 0 AND $1::int - 1`;

    const [base, semanal, agg, hist] = await Promise.all([
      pool.query(`
        SELECT p.id, p.codigo, p.nombre, p.unidad_medida AS unidad,
               p.precio_compra::float AS precio_compra, p.precio_venta::float AS precio_venta,
               COALESCE(c.nombre,'Sin categoría') AS categoria,
               COALESCE(SUM(i.stock_actual),0)::float AS stock,
               COALESCE(SUM(i.stock_minimo),0)::float AS stock_minimo
        FROM productos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        LEFT JOIN inventario i ON i.producto_id = p.id
        WHERE p.activo = true
        GROUP BY p.id, c.nombre`),

      // Cubetas móviles de 7 días terminando hoy: k=0 → últimos 7 días (sin semana parcial)
      pool.query(`
        SELECT dv.producto_id, ((${HOY} - ${LOCAL()}::date) / 7)::int AS k,
               SUM(dv.cantidad)::float AS unid
        FROM detalle_ventas dv JOIN ventas v ON v.id = dv.venta_id
        WHERE v.estado IN ${ESTADOS} AND ${ventana}
        GROUP BY 1,2`, [dias]),

      pool.query(`
        SELECT dv.producto_id,
               COUNT(DISTINCT v.id)::int AS ventas,
               COUNT(DISTINCT v.cliente_id)::int AS clientes,
               MAX(${LOCAL()}::date)::text AS ultima_venta,
               SUM(dv.cantidad)::float AS unidades,
               SUM(dv.subtotal)::float AS ingreso,
               SUM(dv.cantidad * p.precio_compra)::float AS costo
        FROM detalle_ventas dv
        JOIN ventas v    ON v.id = dv.venta_id
        JOIN productos p ON p.id = dv.producto_id
        WHERE v.estado IN ${ESTADOS} AND ${ventana}
        GROUP BY 1`, [dias]),

      pool.query(`
        SELECT (${HOY} - MIN(${LOCAL()}::date))::int AS dias
        FROM ventas v WHERE v.estado IN ${ESTADOS}`),
    ]);

    // Series semanales por producto (antiguo → reciente)
    const series = new Map();
    semanal.rows.forEach((r) => {
      if (r.k < 0 || r.k >= W) return;
      if (!series.has(r.producto_id)) series.set(r.producto_id, Array(W).fill(0));
      series.get(r.producto_id)[W - 1 - r.k] = r.unid;
    });
    const aggMap = new Map(agg.rows.map((r) => [r.producto_id, r]));

    // ── 1. métricas por producto ────────────────────────────────────────────
    const items = base.rows.map((p) => {
      const a = aggMap.get(p.id) || { ventas: 0, clientes: 0, ultima_venta: null, unidades: 0, ingreso: 0, costo: 0 };
      const serie = series.get(p.id) || Array(W).fill(0);
      const f = holtDamped(serie, 4);

      const ult4 = mean(serie.slice(-4));
      const prev4 = mean(serie.slice(-8, -4));
      const tendencia = prev4 > 0 ? ((ult4 - prev4) / prev4) * 100 : ult4 > 0 ? 100 : 0;

      const semConVenta = serie.filter((v) => v > 0).length;
      const m = mean(serie);
      const cv = m > 0 ? std(serie) / m : 0;
      const sinRotacion = serie.slice(-8).every((v) => v === 0);
      const esNuevo = !sinRotacion && serie.slice(0, -4).every((v) => v === 0) && W >= 8 && hist.rows[0]?.dias > 35;

      const demanda30 = (f.forecast.reduce((s, v) => s + v, 0) * 30) / 28;
      const banda = (1.28 * f.rmse * 2 * 30) / 28;
      const precioProm = a.unidades > 0 ? a.ingreso / a.unidades : p.precio_venta;
      const margenPct = a.ingreso > 0
        ? ((a.ingreso - a.costo) / a.ingreso) * 100
        : p.precio_venta > 0 ? ((p.precio_venta - p.precio_compra) / p.precio_venta) * 100 : 0;

      const demandaDia = demanda30 / 30;
      const cobertura = demandaDia > 0.001 ? p.stock / demandaDia : null;
      const sugerido = demanda30 > 0 ? Math.max(0, Math.ceil(demanda30 + p.stock_minimo - p.stock)) : 0;

      let riesgo = 'ok';
      if (cobertura !== null && cobertura < 14) riesgo = 'quiebre';
      else if (p.stock_minimo > 0 && p.stock <= p.stock_minimo) riesgo = 'bajo';
      else if (cobertura !== null && cobertura > 120) riesgo = 'exceso';
      else if (sinRotacion && p.stock > 0) riesgo = 'exceso';

      const confianza = semConVenta >= 10 && cv <= 0.8 ? 'alta' : semConVenta >= 6 ? 'media' : 'baja';

      return {
        id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: p.categoria, unidad: p.unidad,
        stock: p.stock, stock_minimo: p.stock_minimo, precio_venta: p.precio_venta,
        ventas: a.ventas, clientes: a.clientes, ultima_venta: a.ultima_venta,
        unidades: a.unidades, ingreso: a.ingreso,
        _costo: a.costo, _precio_compra: p.precio_compra, _margen: margenPct,
        serie,
        pronostico: f.forecast.map((v, i) => {
          const s = 1.28 * f.rmse * Math.sqrt(i + 1);
          return { valor: round2(v), min: round2(Math.max(0, v - s)), max: round2(v + s) };
        }),
        demanda_30d: round2(demanda30),
        demanda_min: round2(Math.max(0, demanda30 - banda)),
        demanda_max: round2(demanda30 + banda),
        ingreso_proy_30d: round2(demanda30 * precioProm),
        tendencia_pct: round2(clamp(tendencia, -300, 300)),
        consistencia: Math.round((semConVenta / W) * 100),
        confianza, riesgo, sugerido,
        cobertura_dias: cobertura === null ? null : Math.round(cobertura),
        _sinRotacion: sinRotacion, _esNuevo: esNuevo,
      };
    });

    // ── 2. score de potencial (0–100) con rangos percentiles ────────────────
    const vendibles = items.filter((i) => i.ingreso_proy_30d > 0 && !i._sinRotacion);
    const prIngreso = percentRank(vendibles.map((i) => i.ingreso_proy_30d));
    const prMargen = percentRank(vendibles.map((i) => i._margen));
    vendibles.forEach((it, idx) => {
      const momentum = clamp((it.tendencia_pct + 50) / 150, 0, 1);
      it.score = Math.round(100 * (0.40 * prIngreso[idx] + 0.25 * momentum + 0.15 * prMargen[idx] + 0.20 * (it.consistencia / 100)));
    });
    items.forEach((it) => { if (it.score === undefined) it.score = 0; });

    // ── 3. clasificación y ABC ──────────────────────────────────────────────
    const totalIngreso = items.reduce((s, i) => s + i.ingreso, 0);
    // Clase por posición acumulada: A = primeros 80 % del ingreso, B = hasta 95 %, C = resto
    let acum = 0;
    [...items].filter((i) => i.ingreso > 0).sort((x, y) => y.ingreso - x.ingreso).forEach((it) => {
      const antes = acum / totalIngreso;
      acum += it.ingreso;
      it.abc = antes < 0.80 ? 'A' : antes < 0.95 ? 'B' : 'C';
    });
    items.forEach((it) => { if (it.abc === undefined) it.abc = null; });

    items.forEach((it) => {
      if (it._sinRotacion) it.clase = 'sin_rotacion';
      else if (it._esNuevo) it.clase = 'nuevo';
      else if (it.score >= 70 && it.tendencia_pct >= 0) it.clase = 'estrella';
      else if (it.tendencia_pct >= 15) it.clase = 'creciendo';
      else if (it.tendencia_pct <= -15) it.clase = 'declive';
      else it.clase = 'estable';
    });

    // ── 4. salida (oculta costos a roles sin permiso) ───────────────────────
    const salida = items
      .sort((a, b) => b.score - a.score || b.ingreso - a.ingreso)
      .slice(0, 300)
      .map((it) => {
        const { _costo, _precio_compra, _margen, _sinRotacion, _esNuevo, ...pub } = it;
        return {
          ...pub,
          margen_pct: margenOk ? round2(_margen) : null,
          utilidad: margenOk ? round2(it.ingreso - _costo) : null,
          inversion_sugerida: margenOk ? round2(it.sugerido * _precio_compra) : null,
        };
      });

    res.json({
      semanas: W,
      historial_dias: hist.rows[0]?.dias ?? 0,
      puede_ver_margen: margenOk,
      resumen: {
        productos_activos: items.length,
        con_ventas: items.filter((i) => i.ingreso > 0).length,
        ingreso_historico: round2(totalIngreso),
        ingreso_proy_30d: round2(items.reduce((s, i) => s + i.ingreso_proy_30d, 0)),
        riesgo_quiebre: items.filter((i) => i.riesgo === 'quiebre' || i.riesgo === 'bajo').length,
        sobrestock: items.filter((i) => i.riesgo === 'exceso').length,
        sin_rotacion: items.filter((i) => i.clase === 'sin_rotacion').length,
        inversion_sugerida: margenOk
          ? round2(salida.reduce((s, i) => s + (i.inversion_sugerida || 0), 0)) : null,
      },
      productos: salida,
    });
  } catch (e) { fail(res, 'productos', e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRIDAD — chequeos cruzados entre módulos (ventas, cuentas por cobrar, inventario, clientes)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/integridad', auth, async (req, res) => {
  try {
    if (!puedeVerMargen(req)) return res.status(403).json({ error: 'Sin permiso para esta acción' });

    const q = (sql) => pool.query(sql).then((r) => r.rows[0].n);
    const [dup, sinCuenta, montoDist, totalIncons, stockNeg, cliDup, cxcMod] = await Promise.all([
      q(`SELECT COUNT(*)::int AS n FROM (SELECT venta_id FROM cuentas_cobrar WHERE venta_id IS NOT NULL
         GROUP BY venta_id HAVING COUNT(*) > 1) x`),
      q(`SELECT COUNT(*)::int AS n FROM ventas v
         WHERE v.metodo_pago = 'credito' AND v.estado IN ${ESTADOS}
           AND NOT EXISTS (SELECT 1 FROM cuentas_cobrar c WHERE c.venta_id = v.id)`),
      q(`SELECT COUNT(*)::int AS n FROM cuentas_cobrar c JOIN ventas v ON v.id = c.venta_id
         WHERE ABS(c.monto_total - v.total) > 0.01`),
      q(`SELECT COUNT(*)::int AS n FROM ventas v
         LEFT JOIN (SELECT venta_id, SUM(subtotal) AS s FROM detalle_ventas GROUP BY venta_id) d ON d.venta_id = v.id
         WHERE v.estado IN ${ESTADOS}
           AND (ABS(v.total - (v.subtotal + v.impuesto)) > 0.05 OR (d.s IS NOT NULL AND ABS(v.subtotal - d.s) > 0.05))`),
      q(`SELECT COUNT(*)::int AS n FROM inventario WHERE stock_actual < 0`),
      q(`SELECT COUNT(*)::int AS n FROM (SELECT 1 FROM clientes GROUP BY nombre, COALESCE(nit,'')
         HAVING COUNT(*) > 1) x`),
      pool.query(`SELECT COALESCE(SUM(saldo),0)::float AS saldo FROM cuentas_cobrar
         WHERE estado IN ('pendiente','parcial','vencida')`).then((r) => r.rows[0].saldo),
    ]);

    const checks = [
      { id: 'cxc_duplicadas',  titulo: 'Cuentas por cobrar duplicadas',      n: dup,
        detalle: 'Facturas con más de una cuenta por cobrar (inflan el saldo pendiente)' },
      { id: 'credito_sin_cxc', titulo: 'Ventas a crédito sin cuenta por cobrar', n: sinCuenta,
        detalle: 'Ventas con método crédito que no aparecen en Cuentas por Cobrar' },
      { id: 'cxc_monto',       titulo: 'Monto de cuenta ≠ total de la venta', n: montoDist,
        detalle: 'La cuenta por cobrar no coincide con el total facturado' },
      { id: 'venta_totales',   titulo: 'Ventas con totales inconsistentes',   n: totalIncons,
        detalle: 'Subtotal + IVA ≠ total, o el subtotal no coincide con el detalle de productos' },
      { id: 'stock_negativo',  titulo: 'Inventario con stock negativo',       n: stockNeg,
        detalle: 'Productos con existencias menores a cero' },
      { id: 'clientes_dup',    titulo: 'Clientes duplicados',                 n: cliDup,
        detalle: 'Mismo nombre y NIT registrados más de una vez' },
    ].map((c) => ({ ...c, estado: c.n === 0 ? 'ok' : 'warn' }));

    res.json({
      ok: checks.every((c) => c.estado === 'ok'),
      revisado: new Date().toISOString(),
      saldo_cuentas_cobrar: cxcMod,
      checks,
    });
  } catch (e) { fail(res, 'integridad', e); }
});

module.exports = router;
