const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const multer = require('multer');
const XLSX   = require('xlsx');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo archivos .xlsx o .xls'), ok);
  }
});

// ─── Helper: auto-código ──────────────────────────────────────────────────
async function generarCodigo(pool, categoriaId) {
  let prefijo = 'PROD';
  if (categoriaId) {
    const { rows } = await pool.query('SELECT nombre FROM categorias WHERE id=$1', [categoriaId]);
    if (rows.length) {
      const n = rows[0].nombre.toUpperCase();
      if (n.includes('FERTILIZ'))                                 prefijo = 'FERT';
      else if (n.includes('HERB') || n.includes('FUNGU') ||
               n.includes('INSECT') || n.includes('AGROQU'))     prefijo = 'AGRQ';
      else if (n.includes('SEMIL'))                               prefijo = 'SEM';
      else if (n.includes('HERRAM'))                              prefijo = 'HER';
      else if (n.includes('EQUIP'))                               prefijo = 'EQP';
      else if (n.includes('RIEGO'))                               prefijo = 'RIE';
      else if (n.includes('VET'))                                 prefijo = 'VET';
      else if (n.includes('EMPAQ'))                               prefijo = 'EMP';
      else prefijo = n.substring(0, 4).replace(/[^A-Z]/g, 'X');
    }
  }
  const { rows } = await pool.query(
    `SELECT codigo FROM productos WHERE codigo LIKE $1 ORDER BY codigo DESC LIMIT 1`,
    [prefijo + '-%']);
  let next = 1;
  if (rows.length) {
    const m = rows[0].codigo.split('-').pop();
    next = (parseInt(m) || 0) + 1;
  }
  return `${prefijo}-${String(next).padStart(3,'0')}`;
}

// ─── GET / — Listar productos ─────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { buscar='', categoria='', activo='true', page=1, limit=15 } = req.query;
    const offset = (parseInt(page)-1) * parseInt(limit);
    const p = []; let where = 'WHERE 1=1';
    if (buscar)   { p.push('%'+buscar+'%'); where += ` AND (p.nombre ILIKE $${p.length} OR p.codigo ILIKE $${p.length})`; }
    if (categoria){ p.push(categoria);      where += ` AND p.categoria_id=$${p.length}`; }
    if (activo!==''){ p.push(activo==='true'); where += ` AND p.activo=$${p.length}`; }

    const cnt = await pool.query(`SELECT COUNT(*) FROM productos p ${where}`, p);
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS cat_nombre,
         COALESCE(i.stock_actual,0)   AS stock_actual,
         COALESCE(i.stock_minimo,0)   AS stock_minimo,
         COALESCE(i.stock_maximo,0)   AS stock_maximo,
         i.ubicacion_bodega,
         CASE
           WHEN COALESCE(i.stock_actual,0) <= 0                         THEN 'sin_stock'
           WHEN COALESCE(i.stock_actual,0) <= COALESCE(i.stock_minimo,0) THEN 'critico'
           WHEN COALESCE(i.stock_actual,0) <= COALESCE(i.stock_minimo,0)*1.5 THEN 'bajo'
           ELSE 'normal'
         END AS estado_stock,
         CASE WHEN p.precio_venta > 0
           THEN ROUND(((p.precio_venta - p.precio_compra)/p.precio_venta)*100, 1)
           ELSE 0 END AS margen
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN inventario  i ON i.producto_id = p.id AND i.sucursal_id = 1
       ${where} ORDER BY p.nombre
       LIMIT $${p.length+1} OFFSET $${p.length+2}`,
      [...p, parseInt(limit), offset]);
    res.json({ data: rows, total: parseInt(cnt.rows[0].count), page: parseInt(page) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS cat_nombre,
         COALESCE(i.stock_actual,0) AS stock_actual,
         COALESCE(i.stock_minimo,0) AS stock_minimo,
         COALESCE(i.stock_maximo,0) AS stock_maximo,
         i.ubicacion_bodega
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN inventario  i ON i.producto_id = p.id AND i.sucursal_id = 1
       WHERE p.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST / — Crear producto ──────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { nombre, descripcion, categoria_id, precio_compra, precio_venta,
            unidad_medida, activo=true,
            stock_inicial=0, stock_minimo=0, stock_maximo=0, ubicacion_bodega } = req.body;

    if (!nombre?.trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    // Verificar duplicado (case-insensitive, ignora espacios)
    const dup = await client.query(
      'SELECT id FROM productos WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))',
      [nombre]
    );
    if (dup.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Ya existe un producto llamado "${nombre.trim()}"` });
    }

    let codigo = req.body.codigo?.trim() || null;
    if (!codigo) codigo = await generarCodigo(pool, categoria_id);

    const { rows } = await client.query(
      `INSERT INTO productos (codigo,nombre,descripcion,categoria_id,precio_compra,precio_venta,unidad_medida,activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [codigo, nombre.trim(), descripcion||null, categoria_id||null,
       precio_compra, precio_venta, unidad_medida||'unidad', activo]);
    const prod = rows[0];

    // Crear registro inventario
    await client.query(
      `INSERT INTO inventario (producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo, ubicacion_bodega)
       VALUES ($1,1,$2,$3,$4,$5) ON CONFLICT (producto_id, sucursal_id) DO NOTHING`,
      [prod.id, stock_inicial, stock_minimo, stock_maximo, ubicacion_bodega||null]);

    // Movimiento inicial si hay stock
    if (parseFloat(stock_inicial) > 0) {
      await client.query(
        `INSERT INTO movimientos_inventario
           (producto_id, sucursal_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
         VALUES ($1,1,$2,'entrada',$3,0,$3,'Stock inicial')`,
        [prod.id, req.user.id, stock_inicial]);
    }

    await client.query('SELECT sync_all_sequences()');
    await client.query('COMMIT');
    res.status(201).json(prod);
  } catch(e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un producto con ese nombre o código' });
    }
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ─── PUT /:id — Actualizar producto ──────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, codigo, descripcion, categoria_id,
            precio_compra, precio_venta, unidad_medida, activo } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    // Verificar duplicado excluyendo el registro actual
    const dup = await pool.query(
      'SELECT id FROM productos WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) AND id != $2',
      [nombre, req.params.id]
    );
    if (dup.rows.length) {
      return res.status(400).json({ error: `Ya existe otro producto llamado "${nombre.trim()}"` });
    }

    const { rows } = await pool.query(
      `UPDATE productos SET
         nombre=$1, codigo=$2, descripcion=$3, categoria_id=$4,
         precio_compra=$5, precio_venta=$6, unidad_medida=$7,
         activo=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [nombre, codigo||null, descripcion||null, categoria_id||null,
       precio_compra, precio_venta, unidad_medida, activo, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch(e) {
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un producto con ese nombre o código' });
    }
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /:id — Eliminar producto ─────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;

    // Verificar si tiene ventas
    const { rows: dv } = await pool.query(
      'SELECT COUNT(*) FROM detalle_ventas WHERE producto_id=$1', [id]);
    if (parseInt(dv[0].count) > 0)
      return res.status(400).json({
        error: `No se puede eliminar: el producto aparece en ${dv[0].count} venta(s)`
      });

    // Verificar si tiene compras
    const { rows: dc } = await pool.query(
      'SELECT COUNT(*) FROM detalle_compras WHERE producto_id=$1', [id]);
    if (parseInt(dc[0].count) > 0)
      return res.status(400).json({
        error: `No se puede eliminar: el producto aparece en ${dc[0].count} orden(es) de compra`
      });

    // Verificar si tiene movimientos en inventario
    const { rows: mi } = await pool.query(
      'SELECT COUNT(*) FROM movimientos_inventario WHERE producto_id=$1', [id]);
    if (parseInt(mi[0].count) > 0)
      return res.status(400).json({
        error: `No se puede eliminar: tiene ${mi[0].count} movimiento(s) de inventario registrado(s). Desactívalo en su lugar.`
      });

    // Eliminar inventario y luego producto
    await pool.query('DELETE FROM inventario WHERE producto_id=$1', [id]);
    const { rowCount } = await pool.query('DELETE FROM productos WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json({ ok: true, message: 'Producto eliminado correctamente' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /plantilla-excel ─────────────────────────────────────────────────
router.get('/plantilla-excel', auth, async (req, res) => {
  try {
    let catList = 'Fertilizantes, Agroquímicos, Semillas, Herramientas, Equipos, Veterinaria, Riego, Empaques';
    try {
      const { rows } = await pool.query('SELECT nombre FROM categorias ORDER BY nombre');
      if (rows.length) catList = rows.map(r => r.nombre).join(', ');
    } catch {}

    const wb   = XLSX.utils.book_new();
    const data = [
      ['codigo','nombre','descripcion','categoria','precio_compra','precio_venta','unidad_medida','stock_inicial','stock_minimo','stock_maximo','ubicacion_bodega'],
      ['(automático)','Herbicida Glifosato 1L','Herbicida sistémico','Agroquímicos',45.00,65.00,'lt',50,20,200,'Pasillo A-1'],
      ['(automático)','Fertilizante 20-20-0 50lb','','Fertilizantes',85.00,120.00,'qq',100,30,500,'Pasillo B-2'],
      ['(automático)','Maiz HB-83 1 saco','Semilla certificada','Semillas',280.00,380.00,'saco',20,10,100,'Bodega Fría'],
      ['PROD-CUSTOM','Ejemplo con código propio','','',10.00,18.00,'unidad',50,15,200,'Pasillo C-3'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [16,35,30,18,14,14,14,13,13,13,18].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    const inst = [
      ['=== INSTRUCCIONES PARA IMPORTAR PRODUCTOS ==='],[''],
      ['CAMPO','REQUERIDO','DESCRIPCIÓN','EJEMPLO'],
      ['codigo','No','Escribe (automático) para generar código solo','(automático)'],
      ['nombre','SÍ','Nombre completo del producto','Herbicida Glifosato 1L'],
      ['descripcion','No','Descripción adicional','Herbicida sistémico'],
      ['categoria','No','Nombre EXACTO de la categoría','Agroquímicos'],
      ['precio_compra','SÍ','Precio de costo (solo números)','45.00'],
      ['precio_venta','SÍ','Precio de venta (solo números)','65.00'],
      ['unidad_medida','SÍ','unidad / qq / lb / kg / lt / saco / caja / m','lt'],
      ['stock_inicial','No','Cantidad inicial en bodega','50'],
      ['stock_minimo','No','Nivel mínimo para alerta de reorden','20'],
      ['stock_maximo','No','Capacidad máxima','200'],
      ['ubicacion_bodega','No','Pasillo o ubicación física','Pasillo A-1'],
      [''],['=== CATEGORÍAS DISPONIBLES ==='],
      [catList],[''],
      ['=== UNIDADES DE MEDIDA VÁLIDAS ==='],
      ['unidad, qq, lb, kg, lt, m, saco, caja, rollo, sobre, par'],
    ];
    const wsI = XLSX.utils.aoa_to_sheet(inst);
    wsI['!cols'] = [18,11,50,30].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false });
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition','attachment; filename="plantilla-productos.xlsx"');
    res.setHeader('Content-Length', buf.length);
    res.end(buf);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /importar-excel ─────────────────────────────────────────────────
// Nota: aquí la detección de duplicados por nombre/código YA existe (usa
// LOWER(nombre)=LOWER($1)) y decide si actualizar en vez de crear, por lo
// que "abono"/"ABONO" en el Excel se tratan como el mismo producto.
router.post('/importar-excel', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  const result = { created: 0, updated: 0, errors: 0, errorDetails: [] };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    const { rows: cats } = await client.query('SELECT id, LOWER(nombre) AS nombre FROM categorias');
    const catMap = {};
    cats.forEach(c => { catMap[c.nombre] = c.id; });

    const { rows: suc } = await client.query('SELECT id FROM sucursales LIMIT 1');
    const sucursalId = suc[0]?.id || 1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;
      try {
        const nombre = String(row['nombre'] || '').trim();
        if (!nombre) { result.errors++; result.errorDetails.push(`Fila ${lineNum}: nombre vacío`); continue; }

        const precioCompra = parseFloat(row['precio_compra']) || 0;
        const precioVenta  = parseFloat(row['precio_venta'])  || 0;
        if (precioVenta <= 0) { result.errors++; result.errorDetails.push(`Fila ${lineNum}: precio_venta inválido`); continue; }

        const categoriaId = row['categoria']
          ? catMap[String(row['categoria']).toLowerCase().trim()] || null : null;

        let rawCodigo = row['codigo'] ? String(row['codigo']).trim() : '';
        const esAuto  = !rawCodigo || rawCodigo.toLowerCase().includes('autom');
        const codigo  = esAuto ? await generarCodigo(pool, categoriaId) : rawCodigo;

        const unidad     = String(row['unidad_medida'] || 'unidad').trim();
        const descripcion = row['descripcion'] ? String(row['descripcion']).trim() : null;

        // ¿Ya existe? (comparación case-insensitive + trim)
        let existente = null;
        if (!esAuto) {
          const { rows: ex } = await client.query('SELECT id FROM productos WHERE codigo=$1', [codigo]);
          existente = ex[0] || null;
        }
        if (!existente) {
          const { rows: ex } = await client.query(
            'SELECT id FROM productos WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))', [nombre]);
          existente = ex[0] || null;
        }

        if (existente) {
          await client.query(
            `UPDATE productos SET nombre=$1,descripcion=$2,categoria_id=$3,
               precio_compra=$4,precio_venta=$5,unidad_medida=$6,updated_at=NOW()
             WHERE id=$7`,
            [nombre,descripcion,categoriaId,precioCompra,precioVenta,unidad,existente.id]);
          result.updated++;
        } else {
          const { rows: ins } = await client.query(
            `INSERT INTO productos (codigo,nombre,descripcion,categoria_id,precio_compra,precio_venta,unidad_medida,activo)
             VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,
            [codigo,nombre,descripcion,categoriaId,precioCompra,precioVenta,unidad]);

          const stockInicial = parseFloat(row['stock_inicial']) || 0;
          await client.query(
            `INSERT INTO inventario (producto_id,sucursal_id,stock_actual,stock_minimo,stock_maximo,ubicacion_bodega)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (producto_id,sucursal_id) DO NOTHING`,
            [ins[0].id, sucursalId, stockInicial,
             parseFloat(row['stock_minimo'])||0,
             parseFloat(row['stock_maximo'])||0,
             row['ubicacion_bodega']?String(row['ubicacion_bodega']).trim():null]);
          result.created++;
        }
      } catch(rowErr) {
        result.errors++;
        if (result.errorDetails.length < 10)
          result.errorDetails.push(`Fila ${lineNum}: ${rowErr.message}`);
      }
    }

    await client.query('SELECT sync_all_sequences()');
    await client.query('COMMIT');
    res.json(result);
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;