/**
 * seed.js — Datos iniciales MÍNIMOS: un solo registro por módulo, coherentes entre sí.
 *
 *   usuario admin · 1 sucursal · 1 categoría · 1 producto (código automático) · 1 cliente · 1 proveedor
 *   1 compra recibida → fija el stock · 1 venta a crédito → descuenta stock y genera su cuenta por cobrar
 *
 * Solo se ejecuta si el sistema está vacío (sin usuarios). El servicio `seed` de docker-compose corre en
 * cada arranque; así nunca vuelve a crear datos de ejemplo después de que borres los tuyos.
 * Para forzarlo manualmente:  node src/db/seed.js --force
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const { bloquearCodigos, siguienteCodigoProducto } = require('../utils/codigos');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'agroservicio',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

const dias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const iso  = (d) => d.toISOString().split('T')[0];

async function seed() {
  const client = await pool.connect();
  try {
    const { rows: ya } = await client.query('SELECT COUNT(*)::int AS n FROM usuarios');
    if (ya[0].n > 0 && !process.argv.includes('--force')) {
      console.log('ℹ️  El sistema ya está inicializado: seed omitido (usa --force para sembrar de nuevo).');
      return;
    }
    console.log('🌱 Iniciando seed (un registro por módulo)...');
    await client.query('BEGIN');
    await bloquearCodigos(client);

    // ── 1. USUARIO ───────────────────────────────────────────────────────────
    const hash = await bcrypt.hash('Admin2026!', 12);
    const { rows: [admin] } = await client.query(`
      INSERT INTO usuarios (nombre, username, email, password_hash, rol, activo)
      VALUES ('Administrador General', 'admin', 'admin@agroservicio.gt', $1, 'admin', true)
      ON CONFLICT (username) DO UPDATE SET nombre = usuarios.nombre
      RETURNING id`, [hash]);

    // ── 2. SUCURSAL ──────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO sucursales (id, nombre, direccion)
      VALUES (1, 'Central', 'Km 45 Ruta al Pacifico, Escuintla')
      ON CONFLICT (id) DO NOTHING`);

    // ── 3. CATEGORÍA ─────────────────────────────────────────────────────────
    const { rows: [cat] } = await client.query(`
      INSERT INTO categorias (nombre, descripcion)
      VALUES ('Fertilizantes', 'Fertilizantes químicos y orgánicos')
      ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion
      RETURNING id`);

    // ── 4. PRODUCTO (código automático) ──────────────────────────────────────
    const codigo = await siguienteCodigoProducto(client, cat.id);
    const { rows: [prod] } = await client.query(`
      INSERT INTO productos (codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, unidad_medida)
      VALUES ($1, 'Fertilizante 20-20-0 50lb', 'Fertilizante granulado', $2, 120.00, 165.00, 'qq')
      RETURNING id, codigo`, [codigo, cat.id]);

    // ── 5. INVENTARIO (arranca en 0; lo mueven la compra y la venta de abajo) ─
    await client.query(`
      INSERT INTO inventario (producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo, ubicacion_bodega)
      VALUES ($1, 1, 0, 20, 200, 'Pasillo A-1')`, [prod.id]);

    // ── 6. CLIENTE ───────────────────────────────────────────────────────────
    const { rows: [cli] } = await client.query(`
      INSERT INTO clientes (nombre, tipo, nit, telefono, municipio, departamento, credito_maximo, dias_credito)
      VALUES ('Finca Santa Elena', 'finca', '1292847-3', '5534-2291', 'Palin', 'Escuintla', 25000, 30)
      RETURNING id`);

    // ── 7. PROVEEDOR ─────────────────────────────────────────────────────────
    const { rows: [prov] } = await client.query(`
      INSERT INTO proveedores (nombre, nit, contacto, telefono, departamento, categoria, plazo_credito)
      VALUES ('Fertilizantes del Sur', '4567890-1', 'Ing. Carlos Merida', '7721-0099', 'Escuintla', 'Fertilizantes', 30)
      RETURNING id`);

    // ── 8. COMPRA recibida: 100 qq × Q120 → stock 100 ───────────────────────
    const cQty = 100, cPrecio = 120;
    const cSub = +(cQty * cPrecio).toFixed(2), cImp = +(cSub * 0.12).toFixed(2), cTot = +(cSub + cImp).toFixed(2);
    const { rows: [compra] } = await client.query(`
      INSERT INTO compras (numero_orden, proveedor_id, usuario_id, sucursal_id, subtotal, impuesto, total, estado, fecha)
      VALUES ('OC-2026-0001', $1, $2, 1, $3, $4, $5, 'recibida', $6) RETURNING id`,
      [prov.id, admin.id, cSub, cImp, cTot, dias(-10)]);
    await client.query(`
      INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unitario, subtotal)
      VALUES ($1, $2, $3, $4, $5)`, [compra.id, prod.id, cQty, cPrecio, cSub]);
    await client.query(`UPDATE inventario SET stock_actual = stock_actual + $1 WHERE producto_id = $2 AND sucursal_id = 1`, [cQty, prod.id]);
    await client.query(`
      INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
      VALUES ($1, 1, $2, 'compra', $3, 0, $3, 'Compra OC-2026-0001')`, [prod.id, admin.id, cQty]);

    // ── 9. VENTA a crédito: 10 qq × Q165 → stock 90 ──────────────────────────
    const vQty = 10, vPrecio = 165;
    const vSub = +(vQty * vPrecio).toFixed(2), vImp = +(vSub * 0.12).toFixed(2), vTot = +(vSub + vImp).toFixed(2);
    const vFecha = dias(-2);
    const { rows: [venta] } = await client.query(`
      INSERT INTO ventas (numero_factura, cliente_id, usuario_id, sucursal_id, subtotal, impuesto, total, estado, metodo_pago, fecha)
      VALUES ('F-2026-0001', $1, $2, 1, $3, $4, $5, 'FINALIZED', 'credito', $6) RETURNING id`,
      [cli.id, admin.id, vSub, vImp, vTot, vFecha]);
    await client.query(`
      INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
      VALUES ($1, $2, $3, $4, $5)`, [venta.id, prod.id, vQty, vPrecio, vSub]);
    await client.query(`UPDATE inventario SET stock_actual = stock_actual - $1 WHERE producto_id = $2 AND sucursal_id = 1`, [vQty, prod.id]);
    await client.query(`
      INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
      VALUES ($1, 1, $2, 'venta', $3, $4, $5, 'Venta F-2026-0001')`, [prod.id, admin.id, vQty, cQty, cQty - vQty]);

    // ── 10. CUENTA POR COBRAR de esa venta ───────────────────────────────────
    const vence = new Date(vFecha); vence.setDate(vence.getDate() + 30);
    await client.query(`
      INSERT INTO cuentas_cobrar (venta_id, cliente_id, monto_total, monto_pagado, fecha_vence, estado)
      VALUES ($1, $2, $3, 0, $4, 'pendiente')`, [venta.id, cli.id, vTot, iso(vence)]);

    await client.query('SELECT sync_all_sequences()');
    await client.query('COMMIT');
    console.log(`  ✅ 1 usuario · 1 categoría · 1 producto (${prod.codigo}) · 1 cliente · 1 proveedor · 1 compra · 1 venta · 1 cuenta por cobrar`);
    console.log('\n🎉 Seed completado\n');
    console.log('   Usuario: admin');
    console.log('   Clave:   Admin2026!\n');

  } catch(err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error en seed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
