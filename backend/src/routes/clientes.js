const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET / — Listar clientes (query optimizado, sin N+1)
router.get('/', auth, async (req, res) => {
  try {
    const { buscar = '', tipo = '', page = 1, limit = 15 } = req.query;
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

    // Un solo query con LEFT JOIN en lugar de 4 subqueries por fila
    const [cnt, { rows }] = await Promise.all([
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
        [...p, parseInt(limit), offset])
    ]);

    res.json({
      data:  rows,
      total: parseInt(cnt.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit)
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

    // Verificar duplicado (case-insensitive, ignora espacios)
    const dup = await pool.query(
      'SELECT id FROM clientes WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))',
      [nombre]
    );
    if (dup.rows.length) {
      return res.status(400).json({ error: `Ya existe un cliente llamado "${nombre.trim()}"` });
    }

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
  } catch(e) {
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un cliente con ese nombre' });
    }
    res.status(500).json({ error: e.message });
  }
});

// PUT /:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, tipo, nit, cui, telefono, email, direccion,
            municipio, departamento, credito_maximo, dias_credito,
            notas, activo } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    // Verificar duplicado excluyendo el registro actual
    const dup = await pool.query(
      'SELECT id FROM clientes WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) AND id != $2',
      [nombre, req.params.id]
    );
    if (dup.rows.length) {
      return res.status(400).json({ error: `Ya existe otro cliente llamado "${nombre.trim()}"` });
    }

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
  } catch(e) {
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un cliente con ese nombre' });
    }
    res.status(500).json({ error: e.message });
  }
});

// DELETE /:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;

    const [ventas, cuentas] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM ventas WHERE cliente_id=$1', [id]),
      pool.query("SELECT COUNT(*) FROM cuentas_cobrar WHERE cliente_id=$1 AND estado NOT IN ('pagada')", [id])
    ]);

    if (parseInt(ventas.rows[0].count) > 0)
      return res.status(400).json({
        error: `No se puede eliminar: tiene ${ventas.rows[0].count} venta(s) registrada(s)`
      });
    if (parseInt(cuentas.rows[0].count) > 0)
      return res.status(400).json({
        error: `No se puede eliminar: tiene ${cuentas.rows[0].count} cuenta(s) por cobrar pendiente(s)`
      });

    const { rowCount } = await pool.query('DELETE FROM clientes WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;