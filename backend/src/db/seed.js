/**
 * seed.js — Datos mínimos esenciales para arranque limpio
 * Solo inserta: usuarios, sucursal, categorías, productos e inventario base.
 * NO inserta ventas, compras, clientes ni cuentas de prueba.
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
    console.log('🌱 Iniciando seed mínimo...');
    await client.query('BEGIN');

    // ── 1. USUARIOS ──────────────────────────────────────────────────────────
    const hash = await bcrypt.hash('Admin2026!', 12);
    await client.query(`
      INSERT INTO usuarios (nombre, username, email, password_hash, rol, activo) VALUES
        ('Administrador General', 'admin',   'admin@agroservicio.gt',   $1, 'admin',      true),
        ('Supervisor',            'supervisor', 'supervisor@agroservicio.gt', $1, 'supervisor', true),
        ('Vendedor',              'vendedor', 'vendedor@agroservicio.gt', $1, 'vendedor',  true),
        ('Bodeguero',             'bodeguero', 'bodeguero@agroservicio.gt', $1, 'bodeguero', true),
        ('Contador',              'contador', 'contador@agroservicio.gt', $1, 'contador',  true)
      ON CONFLICT (username) DO NOTHING
    `, [hash]);
    console.log('  ✅ Usuarios (5)');

    // ── 2. SUCURSAL PRINCIPAL ────────────────────────────────────────────────
    await client.query(`
      INSERT INTO sucursales (id, nombre, direccion) VALUES
        (1, 'Central', 'Dirección principal')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  ✅ Sucursal');

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
    console.log('  ✅ Categorías (8)');

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

    // ── 5. INVENTARIO (stock en 0 — el negocio lo carga con compras reales) ──
    for (const prod of prods) {
      await client.query(`
        INSERT INTO inventario (producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo)
        VALUES ($1, 1, 0, 0, 0)
        ON CONFLICT (producto_id, sucursal_id) DO NOTHING
      `, [prod.id]);
    }
    console.log('  ✅ Inventario (stock en 0)');

    // ── 6. CONFIGURACIÓN ─────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO configuracion (clave, valor, descripcion) VALUES
        ('factura_prefijo', 'F-2026-', 'Prefijo para número de factura'),
        ('empresa_nombre',  'Agroservicio El Triunfo', 'Nombre de la empresa'),
        ('empresa_nit',     'CF', 'NIT de la empresa'),
        ('moneda_simbolo',  'Q',  'Símbolo de moneda'),
        ('iva_porcentaje',  '12', 'Porcentaje de IVA')
      ON CONFLICT (clave) DO NOTHING
    `);
    console.log('  ✅ Configuración');

    // ── 7. SINCRONIZAR SECUENCIAS ─────────────────────────────────────────────
    await client.query('SELECT sync_all_sequences()');
    console.log('  ✅ Secuencias sincronizadas');

    await client.query('COMMIT');
    console.log('\n🎉 Seed completado\n');
    console.log('   Credenciales de acceso:');
    console.log('   ┌─────────────┬─────────────┬─────────────┐');
    console.log('   │ Usuario     │ Username    │ Rol         │');
    console.log('   ├─────────────┼─────────────┼─────────────┤');
    console.log('   │ Admin       │ admin       │ admin       │');
    console.log('   │ Supervisor  │ supervisor  │ supervisor  │');
    console.log('   │ Vendedor    │ vendedor    │ vendedor    │');
    console.log('   │ Bodeguero   │ bodeguero   │ bodeguero   │');
    console.log('   │ Contador    │ contador    │ contador    │');
    console.log('   └─────────────┴─────────────┴─────────────┘');
    console.log('   Contraseña todos: Admin2026!\n');

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