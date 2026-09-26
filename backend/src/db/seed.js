/**
 * seed.js — Datos iniciales limpios y sincronizados con schema.sql
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'agroservicio',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Iniciando seed...');
    await client.query('BEGIN');

    // ── 1. USUARIOS ──────────────────────────────────────────────────────────
    const hash = await bcrypt.hash('Admin2026!', 12);
    await client.query(`
      INSERT INTO usuarios (nombre, username, email, password_hash, rol, activo) VALUES
        ('Administrador General', 'admin',   'admin@agroservicio.gt',   $1, 'admin',      true),
        ('Maria Lopez Reyes',     'mlopez',  'mlopez@agroservicio.gt',  $1, 'supervisor', true),
        ('Carlos Gomez Aju',      'cgomez',  'cgomez@agroservicio.gt',  $1, 'vendedor',   true),
        ('Pedro Tzoy Canel',      'ptzoy',   'ptzoy@agroservicio.gt',   $1, 'bodeguero',  true),
        ('Rosa Merida Cux',       'rmerida', 'rmerida@agroservicio.gt', $1, 'contador',   true)
      ON CONFLICT (username) DO NOTHING
    `, [hash]);
    console.log('  ✅ Usuarios');

    // ── 2. SUCURSAL PRINCIPAL ────────────────────────────────────────────────
    await client.query(`
      INSERT INTO sucursales (id, nombre, direccion) VALUES
        (1, 'Central', 'Km 45 Ruta al Pacifico, Escuintla')
      ON CONFLICT (id) DO NOTHING
    `);

    // ── 3. CATEGORÍAS ────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO categorias (nombre, descripcion) VALUES
        ('Fertilizantes',  'Fertilizantes químicos y orgánicos'),
        ('Agroquímicos',   'Herbicidas, fungicidas, insecticidas'),
        ('Semillas',       'Semillas certificadas y mejoradas'),
        ('Herramientas',   'Herramientas agrícolas manuales'),
        ('Equipos',        'Equipos e implementos agrícolas'),
        ('Veterinaria',    'Productos veterinarios'),
        ('Riego',          'Sistemas y accesorios de riego'),
        ('Empaques',       'Sacos, cajas y materiales de empaque')
      ON CONFLICT (nombre) DO NOTHING
    `);
    const { rows: cats } = await client.query('SELECT id, nombre FROM categorias ORDER BY id');
    const catId = (nombre) => cats.find(c => c.nombre === nombre)?.id;
    console.log('  ✅ Categorías');

    // ── 4. PRODUCTOS ─────────────────────────────────────────────────────────
    const { rows: prods } = await client.query(`
      INSERT INTO productos (codigo, nombre, categoria_id, precio_compra, precio_venta, unidad_medida) VALUES
        ('FERT-001', 'Fertilizante 20-20-0 50lb',  ${catId('Fertilizantes')},  120.00, 165.00, 'qq'),
        ('FERT-002', 'Urea 46pct 100lb',            ${catId('Fertilizantes')},  195.00, 260.00, 'qq'),
        ('FERT-003', 'Sulfato Amonio 50lb',          ${catId('Fertilizantes')},   85.00, 115.00, 'qq'),
        ('HERB-001', 'Herbicida Glifosato 1L',       ${catId('Agroquímicos')},    38.00,  55.00, 'lt'),
        ('HERB-002', '2-4-D Amina 1L',               ${catId('Agroquímicos')},    32.00,  46.00, 'lt'),
        ('FUNG-001', 'Mancozeb 500g',                ${catId('Agroquímicos')},    42.00,  60.00, 'kg'),
        ('FUNG-002', 'Clorotalonil 720 1L',          ${catId('Agroquímicos')},    35.00,  52.00, 'lt'),
        ('INSEC-001','Clorpirifos 480 1L',            ${catId('Agroquímicos')},    45.00,  65.00, 'lt'),
        ('SEM-001',  'Maiz Hibrido HB-83 saco',      ${catId('Semillas')},       280.00, 380.00, 'saco'),
        ('SEM-002',  'Frijol ICTA Hbkm 1lb',         ${catId('Semillas')},        18.00,  26.00, 'lb'),
        ('SEM-003',  'Tomate Roma V1 sobre',          ${catId('Semillas')},        95.00, 140.00, 'unidad'),
        ('HER-001',  'Machete Collins 18pulg',        ${catId('Herramientas')},    42.00,  60.00, 'unidad'),
        ('HER-002',  'Azadon 5lb',                   ${catId('Herramientas')},    55.00,  78.00, 'unidad'),
        ('HER-003',  'Bomba Mochila 20L',             ${catId('Equipos')},        280.00, 390.00, 'unidad'),
        ('RIEG-001', 'Manguera Poliflex 1pulg',       ${catId('Riego')},            8.50,  12.00, 'm'),
        ('RIEG-002', 'Gotero 2L-h',                  ${catId('Riego')},             3.20,   5.00, 'unidad'),
        ('VET-001',  'Ivermectina 1pct 500ml',        ${catId('Veterinaria')},    185.00, 260.00, 'lt'),
        ('EMP-001',  'Saco Rafia 100lb',              ${catId('Empaques')},         4.50,   7.00, 'unidad')
      ON CONFLICT (codigo) DO UPDATE SET precio_venta = EXCLUDED.precio_venta
      RETURNING id, codigo
    `);
    console.log(`  ✅ Productos (${prods.length})`);

    // ── 5. INVENTARIO ────────────────────────────────────────────────────────
    const stocks = [142,78,55,5,32,8,18,25,67,180,45,38,22,12,850,1200,14,320];
    const mins   = [30,20,15,20,15,10,10,10,10,50,10,20,15,5,100,200,5,100];
    const pasillos = ['A','B','C','D'];
    for (let i = 0; i < prods.length; i++) {
      const pas = `Pasillo ${pasillos[i % 4]}-${(i % 5) + 1}`;
      await client.query(`
        INSERT INTO inventario (producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo, ubicacion_bodega)
        VALUES ($1, 1, $2, $3, $4, $5)
        ON CONFLICT (producto_id, sucursal_id) DO UPDATE SET stock_actual = EXCLUDED.stock_actual
      `, [prods[i].id, stocks[i], mins[i], mins[i] * 5, pas]);
    }
    console.log('  ✅ Inventario');

    // ── 6. CLIENTES ──────────────────────────────────────────────────────────
    const { rows: clts } = await client.query(`
      INSERT INTO clientes (nombre, tipo, nit, telefono, municipio, departamento, credito_maximo, dias_credito) VALUES
        ('Finca Santa Elena',       'finca',        '1292847-3','5534-2291','Palin',        'Escuintla',  25000, 30),
        ('Cooperativa Las Flores',  'cooperativa',  '7823019-2','4472-3380','Santa Lucia',  'Escuintla',  15000, 45),
        ('Agrofinca El Paraiso',    'finca',        '8823401-5','3301-8829','Siquinala',    'Escuintla',  40000, 30),
        ('Juan Garcia Lopez',       'individual',   '4839201-0','5584-1122','San Jose',     'Escuintla',   5000, 15),
        ('Semillas del Norte SA',   'empresa',      '2938401-7','7721-4490','Coban',        'Alta Verapaz',80000,60),
        ('Cooperativa San Miguel',  'cooperativa',  '6621334-8','4491-2230','San Miguel',   'Escuintla',  20000, 30),
        ('Finca Las Margaritas',    'finca',        '5512908-1','3328-4410','Tiquisate',    'Escuintla',  30000, 30),
        ('Carlos Aju Batz',         'individual',   '9912334-2','5567-8812','Tecpan',       'Chimaltenango',2000,15),
        ('Agroinsumos SA',          'empresa',      '3345123-9','2290-4400','Guatemala',    'Guatemala',  100000,45),
        ('Pedro Coc Xoy',           'individual',   '1123445-0','5590-2211','Coban',        'Alta Verapaz', 1000, 0)
      ON CONFLICT DO NOTHING RETURNING id
    `);
    console.log(`  ✅ Clientes (${clts.length})`);

    // ── 7. PROVEEDORES ───────────────────────────────────────────────────────
    const { rows: provs } = await client.query(`
      INSERT INTO proveedores (nombre, nit, contacto, telefono, departamento, categoria, plazo_credito) VALUES
        ('Semillas Mejoradas GT',     '1234567-8','Dr. Roberto Lima',  '4472-3380','Guatemala',     'Semillas',      30),
        ('Agroquimicos Nacionales',   '2345678-9','Lic. Sandra Tzoy',  '5584-2291','Escuintla',     'Agroquímicos',  45),
        ('Herramientas Agricolas HB', '3456789-0','Sr. Pedro Aju',     '3301-8829','Chimaltenango', 'Herramientas',   0),
        ('Fertilizantes del Sur',     '4567890-1','Ing. Carlos Merida','7721-0099','Escuintla',     'Fertilizantes', 60),
        ('Semillas Tropicales',       '5678901-2','Dra. Ana Lopez',    '4423-8871','Retalhuleu',    'Semillas',      30),
        ('Insumos Veterinarios GT',   '6789012-3','Sr. Marcos Caal',   '7950-3344','Alta Verapaz',  'Veterinaria',   15)
      ON CONFLICT DO NOTHING RETURNING id
    `);
    console.log(`  ✅ Proveedores (${provs.length})`);

    // ── 8. VENTAS ────────────────────────────────────────────────────────────
    // Obtenemos IDs de usuario vendedor (cgomez = id 3 aprox)
    const { rows: uVend } = await client.query(`SELECT id FROM usuarios WHERE username='cgomez' LIMIT 1`);
    const vendedorId = uVend[0]?.id || 1;

    const pv = [165,260,115,55,46,60,52,65,380,26,140,60,78,390,12,5,260,7];
    const ventasDef = [
      { num:'F-2026-0847', ci:0, est:'FINALIZED',   met:'credito',       items:[[0,10],[3,5]],        dias:-1  },
      { num:'F-2026-0846', ci:1, est:'FINALIZED',   met:'efectivo',      items:[[8,2],[1,3]],         dias:-1  },
      { num:'F-2026-0845', ci:3, est:'IN_PROCESS',  met:'tarjeta',       items:[[11,5],[4,2]],        dias:0   },
      { num:'F-2026-0844', ci:2, est:'FINALIZED',   met:'credito',       items:[[0,20],[8,5]],        dias:-2  },
      { num:'F-2026-0840', ci:4, est:'FINALIZED',   met:'transferencia', items:[[0,30],[2,20],[8,10]],dias:-5  },
      { num:'F-2026-0835', ci:5, est:'FINALIZED',   met:'credito',       items:[[0,15],[5,5]],        dias:-8  },
      { num:'F-2026-0830', ci:2, est:'FINALIZED',   met:'credito',       items:[[3,20],[6,8]],        dias:-10 },
      { num:'F-2026-0825', ci:6, est:'FINALIZED',   met:'efectivo',      items:[[1,5],[4,3]],         dias:-12 },
      { num:'F-2026-0820', ci:0, est:'FINALIZED',   met:'credito',       items:[[0,15],[7,4]],        dias:-15 },
      { num:'F-2026-0815', ci:1, est:'FINALIZED',   met:'efectivo',      items:[[8,3],[9,10]],        dias:-18 },
      { num:'F-2026-0810', ci:8, est:'FINALIZED',   met:'transferencia', items:[[0,40],[1,20],[2,15]],dias:-20 },
    ];

    for (const v of ventasDef) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + v.dias);
      let subtotal = 0;
      const items = v.items.map(([pi, qty]) => {
        const sub = pv[pi] * qty;
        subtotal += sub;
        return { pid: prods[pi].id, qty, precio: pv[pi], sub };
      });
      const impuesto = +(subtotal * 0.12).toFixed(2);
      const total    = +(subtotal + impuesto).toFixed(2);
      subtotal       = +subtotal.toFixed(2);
      const cid      = clts[v.ci]?.id || clts[0].id;

      const { rows: vr } = await client.query(`
        INSERT INTO ventas (numero_factura, cliente_id, usuario_id, sucursal_id, subtotal, impuesto, total, estado, metodo_pago, fecha)
        VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (numero_factura) DO UPDATE SET estado = EXCLUDED.estado
        RETURNING id
      `, [v.num, cid, vendedorId, subtotal, impuesto, total, v.est, v.met, fecha]);

      const vid = vr[0].id;
      await client.query('DELETE FROM detalle_ventas WHERE venta_id = $1', [vid]);
      for (const li of items) {
        await client.query(
          `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1,$2,$3,$4,$5)`,
          [vid, li.pid, li.qty, li.precio, li.sub.toFixed(2)]
        );
        if (v.est === 'FINALIZED') {
          await client.query(
            `UPDATE inventario SET stock_actual = GREATEST(0, stock_actual - $1) WHERE producto_id = $2 AND sucursal_id = 1`,
            [li.qty, li.pid]
          );
        }
      }
    }
    console.log(`  ✅ Ventas (${ventasDef.length})`);

    // ── 9. COMPRAS ───────────────────────────────────────────────────────────
    const { rows: uAdmin } = await client.query(`SELECT id FROM usuarios WHERE username='admin' LIMIT 1`);
    const adminId = uAdmin[0]?.id || 1;

    const pcPrices = [120,195,85,38,32,42,35,45,280,18,95,42,55,280,8.5,3.2,185,4.5];
    const comprasDef = [
      { num:'OC-2026-0049', pi:0,  pv:0, est:'en_transito', tot:12400, dias:-3  },
      { num:'OC-2026-0048', pi:1,  pv:1, est:'pendiente',   tot:8750,  dias:-2  },
      { num:'OC-2026-0047', pi:11, pv:2, est:'pendiente',   tot:5200,  dias:-4  },
      { num:'OC-2026-0046', pi:0,  pv:3, est:'recibida',    tot:24600, dias:-10 },
      { num:'OC-2026-0045', pi:8,  pv:0, est:'recibida',    tot:18900, dias:-14 },
      { num:'OC-2026-0040', pi:5,  pv:1, est:'recibida',    tot:11200, dias:-21 },
    ];

    for (const o of comprasDef) {
      const fecha    = new Date(); fecha.setDate(fecha.getDate() + o.dias);
      const subtotal = +(o.tot / 1.12).toFixed(2);
      const impuesto = +(o.tot - subtotal).toFixed(2);
      const qty      = Math.max(1, Math.round(o.tot / (pcPrices[o.pi] * 1.12)));
      const pvId     = provs[o.pv]?.id || provs[0].id;

      const { rows: cr } = await client.query(`
        INSERT INTO compras (numero_orden, proveedor_id, usuario_id, sucursal_id, subtotal, impuesto, total, estado, fecha)
        VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8)
        ON CONFLICT (numero_orden) DO UPDATE SET estado = EXCLUDED.estado
        RETURNING id
      `, [o.num, pvId, adminId, subtotal, impuesto, o.tot, o.est, fecha]);

      const cid = cr[0].id;
      await client.query('DELETE FROM detalle_compras WHERE compra_id = $1', [cid]);
      await client.query(
        `INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1,$2,$3,$4,$5)`,
        [cid, prods[o.pi].id, qty, pcPrices[o.pi], (qty * pcPrices[o.pi]).toFixed(2)]
      );
      if (o.est === 'recibida') {
        await client.query(
          `UPDATE inventario SET stock_actual = stock_actual + $1 WHERE producto_id = $2 AND sucursal_id = 1`,
          [qty, prods[o.pi].id]
        );
      }
    }
    console.log(`  ✅ Compras (${comprasDef.length})`);

    // ── 10. CUENTAS POR COBRAR ───────────────────────────────────────────────
    const { rows: vcred } = await client.query(`
      SELECT id, cliente_id, total, fecha FROM ventas WHERE metodo_pago = 'credito' AND estado = 'FINALIZED'
    `);
    for (const v of vcred) {
      const vence   = new Date(v.fecha); vence.setDate(vence.getDate() + 30);
      const pagado  = Math.random() > 0.5 ? +(v.total * Math.random() * 0.7).toFixed(2) : 0;
      const saldoV  = +(v.total - pagado).toFixed(2);
      const now     = new Date();
      const estado  = saldoV === 0 ? 'pagada' : vence < now ? 'vencida' : pagado > 0 ? 'parcial' : 'pendiente';
      await client.query(`
        INSERT INTO cuentas_cobrar (venta_id, cliente_id, monto_total, monto_pagado, fecha_vence, estado)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT DO NOTHING
      `, [v.id, v.cliente_id, v.total, pagado, vence.toISOString().split('T')[0], estado]);
    }
    console.log('  ✅ Cuentas por cobrar');

    // ── 11. SINCRONIZAR SECUENCIAS ───────────────────────────────────────────
    await client.query('SELECT sync_all_sequences()');
    console.log('  ✅ Secuencias sincronizadas');

    await client.query('COMMIT');
    console.log('\n🎉 Seed completado exitosamente\n');
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
