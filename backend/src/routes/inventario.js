const router = require('express').Router();
const pool  = require('../db/pool');
const auth  = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { estado } = req.query;
    let having = '';
    if (estado === 'critico')   having = "HAVING COALESCE(i.stock_actual,0) > 0 AND COALESCE(i.stock_actual,0) <= i.stock_minimo";
    if (estado === 'sin_stock') having = "HAVING COALESCE(i.stock_actual,0) = 0";
    if (estado === 'bajo')      having = "HAVING COALESCE(i.stock_actual,0) > i.stock_minimo AND COALESCE(i.stock_actual,0) <= i.stock_minimo*1.5";
    const { rows } = await pool.query(
      `SELECT p.id,p.codigo,p.nombre,p.unidad_medida,c.nombre as cat,
        COALESCE(i.stock_actual,0) as stock_actual,
        COALESCE(i.stock_minimo,0) as stock_minimo,
        COALESCE(i.stock_maximo,0) as stock_maximo,
        COALESCE(i.ubicacion_bodega,'') as ubicacion_bodega,
        i.updated_at,
        CASE WHEN COALESCE(i.stock_actual,0)=0 THEN 'sin_stock'
             WHEN COALESCE(i.stock_actual,0)<=i.stock_minimo THEN 'critico'
             WHEN COALESCE(i.stock_actual,0)<=i.stock_minimo*1.5 THEN 'bajo'
             ELSE 'normal' END as estado
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id=c.id
       LEFT JOIN inventario i ON i.producto_id=p.id AND i.sucursal_id=1
       WHERE p.activo=true
       GROUP BY p.id,p.codigo,p.nombre,p.unidad_medida,c.nombre,
         i.stock_actual,i.stock_minimo,i.stock_maximo,i.ubicacion_bodega,i.updated_at
       ${having}
       ORDER BY
         CASE WHEN COALESCE(i.stock_actual,0)=0 THEN 0
              WHEN COALESCE(i.stock_actual,0)<=i.stock_minimo THEN 1
              WHEN COALESCE(i.stock_actual,0)<=i.stock_minimo*1.5 THEN 2
              ELSE 3 END, p.nombre`);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.post('/ajuste', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { producto_id, tipo, cantidad, motivo } = req.body;
    await client.query('BEGIN');
    const { rows: inv } = await client.query(
      'SELECT stock_actual FROM inventario WHERE producto_id=$1 AND sucursal_id=1', [producto_id]);
    if (!inv.length) return res.status(404).json({ error: 'Producto sin inventario' });
    const anterior = parseFloat(inv[0].stock_actual);
    let nuevo = tipo === 'entrada' ? anterior + parseFloat(cantidad) : anterior - parseFloat(cantidad);
    if (nuevo < 0) nuevo = 0;
    await client.query(
      'UPDATE inventario SET stock_actual=$1,updated_at=NOW() WHERE producto_id=$2 AND sucursal_id=1',
      [nuevo, producto_id]);
    await client.query(
      `INSERT INTO movimientos_inventario (producto_id,sucursal_id,usuario_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo)
       VALUES ($1,1,$2,$3,$4,$5,$6,$7)`,
      [producto_id, req.user.id, tipo, cantidad, anterior, nuevo, motivo || tipo]);
    await client.query('COMMIT');
    res.json({ message: 'Ajuste registrado', stock_anterior: anterior, stock_nuevo: nuevo });
  } catch(err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

router.get('/movimientos', auth, async (req, res) => {
  try {
    const { producto_id, page=1, limit=50 } = req.query;
    const offset = (parseInt(page)-1)*parseInt(limit);
    let where = ''; const p = [];
    if (producto_id) { p.push(producto_id); where = `WHERE m.producto_id=$1`; }
    const { rows } = await pool.query(
      `SELECT m.*,p.nombre as prod_nombre,p.codigo,u.nombre as usuario
       FROM movimientos_inventario m
       LEFT JOIN productos p ON m.producto_id=p.id
       LEFT JOIN usuarios u ON m.usuario_id=u.id
       ${where} ORDER BY m.created_at DESC
       LIMIT $${p.length+1} OFFSET $${p.length+2}`,
      [...p, parseInt(limit), offset]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;