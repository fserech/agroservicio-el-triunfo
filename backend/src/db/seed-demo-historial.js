/**
 * seed-demo-historial.js — Historial de ventas de DEMOSTRACIÓN (opcional)
 *
 * Genera ~6 meses de ventas realistas (estacionalidad semanal, productos que crecen,
 * productos que caen y uno sin rotación) para poder probar el dashboard de predicción.
 *
 *   Cargar :  node src/db/seed-demo-historial.js
 *   Limpiar:  node src/db/seed-demo-historial.js --limpiar
 *
 * Todas las filas quedan marcadas con observaciones = '[DEMO]' y se pueden borrar
 * sin tocar tus datos reales. No modifica inventario, compras ni cuentas por cobrar.
 * Es idempotente: si lo corres de nuevo, reemplaza el demo anterior.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'agroservicio',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

const DIAS = 182;
const MARCA = '[DEMO]';

// Generador pseudoaleatorio con semilla (resultados reproducibles)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(2026);
const randInt = (lo, hi) => lo + Math.floor(R() * (hi - lo + 1));
const pick = (arr, w) => {
  const total = w.reduce((s, x) => s + x, 0);
  let r = R() * total;
  for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
};

// codigo → [peso base, crecimiento mensual relativo, [cant. mín, máx], último día de venta (días atrás) o null]
// (las cuotas son relativas: un producto "crece" si gana participación frente al resto)
const PERFIL = {
  'FERT-001':  [10,  0.12, [3, 25],   null],
  'FERT-002':  [ 8,  0.70, [2, 15],   null],   // fuerte crecimiento (temporada de abonado)
  'FERT-003':  [ 5,  0.10, [3, 20],   null],
  'HERB-001':  [ 9,  0.10, [2, 12],   null],
  'HERB-002':  [ 4, -0.30, [1, 8],    null],   // en declive
  'FUNG-001':  [ 4,  0.12, [1, 6],    null],
  'FUNG-002':  [3.5, 0.05, [1, 6],    null],
  'INSEC-001': [3.5,-0.10, [1, 6],    null],
  'SEM-001':   [ 7,  0.40, [1, 8],    null],   // siembra
  'SEM-002':   [ 6,  0.08, [5, 40],   null],
  'SEM-003':   [2.5, 0.20, [1, 10],   null],
  'HER-001':   [ 5,  0.05, [1, 4],    null],
  'HER-002':   [ 3, -0.05, [1, 3],    null],
  'HER-003':   [ 2,  0.15, [1, 2],    null],
  'RIEG-001':  [ 4,  0.20, [10, 100], null],
  'RIEG-002':  [ 3,  0.10, [20, 300], null],
  'VET-001':   [1.5, 0.00, [1, 3],    80],     // sin rotación (últimas ~11 semanas)
  'EMP-001':   [ 4,  0.08, [20, 200], null],
};
const DOW = [0.35, 1.10, 1.00, 1.00, 1.00, 1.15, 1.30];          // Dom … Sáb
const HORAS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const PESO_H = [3, 6, 7, 6, 4, 3, 3, 5, 6, 5, 2];
const METODOS = ['efectivo', 'credito', 'transferencia', 'tarjeta', 'cheque'];
const PESO_M = [38, 27, 15, 15, 5];

const pad = (n, l) => String(n).padStart(l, '0');
const fmt = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}`;

async function limpiar(client) {
  // cuentas_cobrar.venta_id es ON DELETE SET NULL: hay que borrarlas explícitamente para no dejar huérfanas
  await client.query(`DELETE FROM cuentas_cobrar WHERE venta_id IN (SELECT id FROM ventas WHERE observaciones = $1)`, [MARCA]);
  const r = await client.query(`DELETE FROM ventas WHERE observaciones = $1`, [MARCA]);
  return r.rowCount;
}

async function main() {
  const soloLimpiar = process.argv.includes('--limpiar');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const borradas = await limpiar(client);
    if (borradas) console.log(`🧹 ${borradas} ventas demo anteriores eliminadas`);
    if (soloLimpiar) { await client.query('COMMIT'); console.log('✅ Listo'); return; }

    const { rows: prods }    = await client.query(`SELECT id, codigo, precio_venta::float AS pv FROM productos WHERE activo = true`);
    const { rows: clientes } = await client.query(`SELECT id, tipo FROM clientes WHERE activo = true`);
    const { rows: users }    = await client.query(`SELECT id FROM usuarios WHERE activo = true AND rol IN ('vendedor','supervisor','admin')`);
    const { rows: nums }     = await client.query(`SELECT numero_factura FROM ventas`);
    if (!prods.length) throw new Error('No hay productos. Ejecuta primero el seed principal.');

    // Las facturas demo terminan con el mayor número real para que la siguiente factura
    // real que cree el sistema continúe la secuencia normal (ventas.js usa los últimos dígitos).
    const M = nums.reduce((mx, r) => {
      const m = r.numero_factura.match(/(\d+)$/);
      return m ? Math.max(mx, parseInt(m[1], 10)) : mx;
    }, 0);

    // Fecha local de Guatemala "hoy" (UTC-6)
    const ahoraGT = new Date(Date.now() - 6 * 3600 * 1000);
    const hoy = new Date(Date.UTC(ahoraGT.getUTCFullYear(), ahoraGT.getUTCMonth(), ahoraGT.getUTCDate()));

    const ventas = [];
    const lineas = [];
    let seq = 0;

    for (let t = DIAS; t >= 0; t--) {
      const dia = new Date(hoy.getTime() - t * 86400000);
      const dow = dia.getUTCDay();
      const quincena = [14, 15, 29, 30].includes(dia.getUTCDate()) ? 1.25 : 1;
      const esperadas = 6.5 * DOW[dow] * quincena;
      const n = Math.max(0, Math.round(esperadas + (R() - 0.5) * 4));

      for (let s = 0; s < n; s++) {
        let hora = pick(HORAS, PESO_H);
        if (t === 0) hora = Math.min(hora, Math.max(7, ahoraGT.getUTCHours() - 1)); // nada en el futuro
        const fechaUTC = `${fmt(dia)} ${pad(hora + 6, 2)}:${pad(randInt(0, 59), 2)}:${pad(randInt(0, 59), 2)}`;

        const cli = clientes.length ? clientes[Math.floor(R() * clientes.length)] : null;
        const mult = cli && ['finca', 'empresa', 'cooperativa'].includes(cli.tipo) ? 1.8 : 1;
        const nItems = pick([1, 2, 3, 4], [38, 35, 20, 7]);

        const disp = prods.filter((p) => {
          const pf = PERFIL[p.codigo];
          return !(pf && pf[3] !== null && t < pf[3]);
        });
        const pesos = disp.map((p) => {
          const pf = PERFIL[p.codigo] || [2, 0, [1, 5], null];
          return pf[0] * Math.exp(Math.log(1 + pf[1]) * (-t / 30));
        });

        const usados = new Set();
        let subtotal = 0;
        const items = [];
        for (let i = 0; i < nItems; i++) {
          const p = pick(disp, pesos);
          if (usados.has(p.id)) continue;
          usados.add(p.id);
          const pf = PERFIL[p.codigo] || [2, 0, [1, 5], null];
          const cant = Math.max(1, Math.round(randInt(pf[2][0], pf[2][1]) * (0.6 + 0.4 * mult) * (0.8 + R() * 0.4)));
          const sub = +(cant * p.pv).toFixed(2);
          subtotal += sub;
          items.push({ pid: p.id, cant, pv: p.pv, sub });
        }
        if (!items.length) continue;

        subtotal = +subtotal.toFixed(2);
        const impuesto = +(subtotal * 0.12).toFixed(2);
        seq++;
        const numero = `DEMO-${pad(seq, 5)}-${pad(M, 4)}`;
        ventas.push({
          numero, cliente_id: cli ? cli.id : null,
          usuario_id: users.length ? users[Math.floor(R() * users.length)].id : null,
          fecha: fechaUTC, subtotal, impuesto, total: +(subtotal + impuesto).toFixed(2),
          metodo: pick(METODOS, PESO_M), t, dia: fmt(dia),
        });
        items.forEach((it) => lineas.push({ numero, ...it }));
      }
    }

    // Inserción masiva por lotes
    const idPorNumero = new Map();
    for (let i = 0; i < ventas.length; i += 500) {
      const lote = ventas.slice(i, i + 500);
      const { rows } = await client.query(`
        INSERT INTO ventas (numero_factura, cliente_id, sucursal_id, usuario_id, fecha, subtotal, impuesto, total,
                            metodo_pago, estado, observaciones)
        SELECT n, c, 1, u, f::timestamp, s, i, t, m, 'FINALIZED', $9
        FROM unnest($1::text[], $2::int[], $3::int[], $4::text[], $5::numeric[], $6::numeric[], $7::numeric[], $8::text[])
             AS x(n, c, u, f, s, i, t, m)
        RETURNING id, numero_factura`,
        [lote.map((v) => v.numero), lote.map((v) => v.cliente_id), lote.map((v) => v.usuario_id),
         lote.map((v) => v.fecha), lote.map((v) => v.subtotal), lote.map((v) => v.impuesto),
         lote.map((v) => v.total), lote.map((v) => v.metodo), MARCA]);
      rows.forEach((r) => idPorNumero.set(r.numero_factura, r.id));
    }
    for (let i = 0; i < lineas.length; i += 1000) {
      const lote = lineas.slice(i, i + 1000);
      await client.query(`
        INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
        SELECT * FROM unnest($1::int[], $2::int[], $3::numeric[], $4::numeric[], $5::numeric[])`,
        [lote.map((l) => idPorNumero.get(l.numero)), lote.map((l) => l.pid), lote.map((l) => l.cant),
         lote.map((l) => l.pv), lote.map((l) => l.sub)]);
    }

    // Cuentas por cobrar coherentes con las ventas a crédito (los módulos deben cuadrar):
    // las antiguas casi siempre están pagadas; las recientes tienen más saldo abierto.
    const cuentas = [];
    ventas.filter((v) => v.metodo === 'credito' && v.cliente_id).forEach((v) => {
      const r = R();
      const pagaTodo = v.t > 60 ? 0.85 : v.t > 30 ? 0.60 : 0.30;
      const parcial  = v.t > 60 ? 0.95 : v.t > 30 ? 0.80 : 0.50;
      const pagado = r < pagaTodo ? v.total : r < parcial ? +(v.total * (0.2 + R() * 0.6)).toFixed(2) : 0;
      const vence = new Date(Date.parse(v.dia + 'T00:00:00Z') + 30 * 86400000);
      const saldo = +(v.total - pagado).toFixed(2);
      const estado = saldo <= 0.01 ? 'pagada' : vence < hoy ? 'vencida' : pagado > 0 ? 'parcial' : 'pendiente';
      cuentas.push({ numero: v.numero, cliente_id: v.cliente_id, total: v.total, pagado, vence: fmt(vence), estado });
    });
    for (let i = 0; i < cuentas.length; i += 500) {
      const lote = cuentas.slice(i, i + 500);
      await client.query(`
        INSERT INTO cuentas_cobrar (venta_id, cliente_id, monto_total, monto_pagado, fecha_vence, estado)
        SELECT * FROM unnest($1::int[], $2::int[], $3::numeric[], $4::numeric[], $5::date[], $6::text[])`,
        [lote.map((c) => idPorNumero.get(c.numero)), lote.map((c) => c.cliente_id), lote.map((c) => c.total),
         lote.map((c) => c.pagado), lote.map((c) => c.vence), lote.map((c) => c.estado)]);
    }

    await client.query('COMMIT');
    console.log(`✅ Demo cargado: ${ventas.length} ventas, ${cuentas.length} cuentas por cobrar, ${lineas.length} líneas, ${DIAS} días de historial`);
    console.log(`   Para borrarlo: node src/db/seed-demo-historial.js --limpiar`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
