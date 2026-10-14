const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const roles  = require('../middleware/roles');

// GET / — Listar clientes (query optimizado, sin N+1)
router.get('/', auth, async (req, res) => {
  try {
    const { buscar = '', tipo = '', activo = '', page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const p = [];

    if (buscar) {
      p.push('%' + buscar + '%');
      where += ` AND (c.nombre ILIKE $${p.length} OR c.nit ILIKE $${p.length})`;
    }
    if (tipo) {
      p.push(tipo);
      where += ` AND c.tipo = $${p.length}`;
    }
    if (activo !== '') {
      p.push(activo === 'true');
      where += ` AND c.activo = $${p.length}`;
    }

    // Un solo query con LEFT JOIN en lugar de 4 subqueries por fila
    const [cnt, { rows }, resumen] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM clientes c ${where}`, p),
      pool.query(`
        SELECT c.*,
          COALESCE(resumen.total_compras, 0)  AS total_compras,
          COALESCE(resumen.num_pedidos,   0)  AS num_pedidos,
          COALESCE(resumen.ultima_compra, NULL) AS ultima_compra,
          COALESCE(cobrar.saldo_pendiente, 0) AS saldo_pendiente
        FROM clientes c
        -- Totales de ventas (un JOIN en lugar de subquery por fila)
        LEFT JOIN (
          SELECT cliente_id,
                 SUM(total)  AS total_compras,
                 COUNT(*)    AS num_pedidos,
                 MAX(fecha)  AS ultima_compra
          FROM ventas
          WHERE estado IN ('FINALIZED','IN_PROCESS','PENDING')
          GROUP BY cliente_id
        ) resumen ON resumen.cliente_id = c.id
        -- Saldo pendiente (un JOIN en lugar de subquery por fila)
        LEFT JOIN (
          SELECT cliente_id,
                 SUM(saldo) AS saldo_pendiente
          FROM cuentas_cobrar
          WHERE estado IN ('pendiente','parcial','vencida')
          GROUP BY cliente_id
        ) cobrar ON cobrar.cliente_id = c.id
        ${where}
        ORDER BY c.nombre
        LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
        [...p, parseInt(limit), offset]),
      // Totales sobre TODO el conjunto filtrado (no solo la página visible)
      pool.query(`
        SELECT COUNT(*)::int AS total,
               COALESCE(SUM(r.total_compras),0)::float AS facturado,
               COALESCE(SUM(cb.saldo),0)::float        AS por_cobrar,
               (COUNT(*) FILTER (WHERE c.credito_maximo > 0))::int AS con_credito
        FROM clientes c
        LEFT JOIN (SELECT cliente_id, SUM(total) AS total_compras FROM ventas
                   WHERE estado IN ('FINALIZED','IN_PROCESS','PENDING') GROUP BY cliente_id) r ON r.cliente_id = c.id
        LEFT JOIN (SELECT cliente_id, SUM(saldo) AS saldo FROM cuentas_cobrar
                   WHERE estado IN ('pendiente','parcial','vencida') GROUP BY cliente_id) cb ON cb.cliente_id = c.id
        ${where}`, p),
    ]);

    res.json({
      data:  rows,
      total: parseInt(cnt.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit),
      resumen: resumen.rows[0],
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
        COALESCE(r.total_compras, 0)   AS total_compras,
        COALESCE(cb.saldo_pendiente, 0) AS saldo_pendiente
      FROM clientes c
      LEFT JOIN (
        SELECT cliente_id, SUM(total) AS total_compras
        FROM ventas WHERE estado IN ('FINALIZED','IN_PROCESS','PENDING')
        GROUP BY cliente_id
      ) r  ON r.cliente_id  = c.id
      LEFT JOIN (
        SELECT cliente_id, SUM(saldo) AS saldo_pendiente
        FROM cuentas_cobrar WHERE estado IN ('pendiente','parcial','vencida')
        GROUP BY cliente_id
      ) cb ON cb.cliente_id = c.id
      WHERE c.id = $1`, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });

    const [ventas, cuentas] = await Promise.all([
      pool.query(
        `SELECT id, numero_factura, total, estado, metodo_pago, fecha
         FROM ventas WHERE cliente_id = $1 ORDER BY fecha DESC LIMIT 10`,
        [req.params.id]),
      pool.query(
        `SELECT * FROM cuentas_cobrar WHERE cliente_id = $1 ORDER BY fecha_vence`,
        [req.params.id])
    ]);

    res.json({ ...rows[0], ventas: ventas.rows, cuentas: cuentas.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, tipo, nit, cui, telefono, email, direccion,
            municipio, departamento, credito_maximo = 0,
            dias_credito = 0, notas, activo = true } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    const { rows } = await pool.query(
      `INSERT INTO clientes
         (nombre, tipo, nit, cui, telefono, email, direccion,
          municipio, departamento, credito_maximo, dias_credito, notas, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [nombre.trim(), tipo || 'individual', nit || null, cui || null,
       telefono || null, email || null, direccion || null,
       municipio || null, departamento || null,
       credito_maximo, dias_credito, notas || null, activo]);

    res.status(201).json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, tipo, nit, cui, telefono, email, direccion,
            municipio, departamento, credito_maximo, dias_credito,
            notas, activo } = req.body;

    const { rows } = await pool.query(
      `UPDATE clientes SET
         nombre=$1, tipo=$2, nit=$3, cui=$4, telefono=$5, email=$6,
         direccion=$7, municipio=$8, departamento=$9,
         credito_maximo=$10, dias_credito=$11, notas=$12,
         activo=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [nombre, tipo, nit || null, cui || null, telefono || null,
       email || null, direccion || null, municipio || null,
       departamento || null, credito_maximo, dias_credito,
       notas || null, activo, req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id
//   · sin historial            → se elimina
//   · con historial            → 409 y se ofrece DESACTIVAR (?desactivar=1) o, solo admin y sin deuda,
//                                ELIMINAR DEFINITIVAMENTE (?forzar=1): sus ventas y cuentas ya pagadas se
//                                conservan, pero quedan sin cliente asociado.
router.delete('/:id', auth, roles('admin', 'supervisor'), async (req, res) => {
  try {
    const id = req.params.id;
    const { rows: cli } = await pool.query('SELECT id, nombre FROM clientes WHERE id=$1', [id]);
    if (!cli.length) return res.status(404).json({ error: 'Cliente no encontrado' });

    const [ventas, cuentas] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS n FROM ventas WHERE cliente_id=$1', [id]),
      pool.query("SELECT COUNT(*)::int AS n, COALESCE(SUM(saldo),0)::float AS saldo FROM cuentas_cobrar WHERE cliente_id=$1 AND estado <> 'pagada' AND saldo > 0", [id]),
    ]);
    const nVentas = ventas.rows[0].n, nCuentas = cuentas.rows[0].n, saldo = cuentas.rows[0].saldo;
    const esAdmin = req.user.rol === 'admin';
    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (req.query.forzar === '1') {
      if (!esAdmin) return res.status(403).json({ error: 'Solo un administrador puede eliminar definitivamente' });
      if (saldo > 0.005) return res.status(409).json({
        error: `No se puede eliminar definitivamente: el cliente debe Q ${fmt(saldo)} en ${nCuentas} cuenta(s). Cóbrala primero o desactívalo`,
        code: 'HAS_DEBT', puede_desactivar: true, puede_forzar: false });
      await pool.query('DELETE FROM clientes WHERE id=$1', [id]);   // ventas/cuentas: cliente_id → NULL
      return res.json({ ok: true, accion: 'eliminado' });
    }

    if (nVentas > 0 || nCuentas > 0) {
      if (req.query.desactivar === '1') {
        await pool.query('UPDATE clientes SET activo=false, updated_at=NOW() WHERE id=$1', [id]);
        return res.json({ ok: true, accion: 'desactivado' });
      }
      const partes = [];
      if (nVentas)  partes.push(`${nVentas} venta(s) registrada(s)`);
      if (nCuentas) partes.push(`${nCuentas} cuenta(s) por cobrar con saldo de Q ${fmt(saldo)}`);
      return res.status(409).json({
        error: `No se puede eliminar: tiene ${partes.join(' y ')}`,
        code: 'HAS_HISTORY', puede_desactivar: true, puede_forzar: esAdmin && saldo <= 0.005,
        detalle: { ventas: nVentas, cuentas_pendientes: nCuentas, saldo },
      });
    }

    await pool.query('DELETE FROM clientes WHERE id=$1', [id]);
    res.json({ ok: true, accion: 'eliminado' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
