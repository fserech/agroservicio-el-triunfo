/**
 * backup.js — Exportación e Importación completa de datos
 *
 * EXPORTAR:
 *   GET  /api/backup/json   → JSON completo
 *   GET  /api/backup/excel  → XLSX con una hoja por tabla
 *   GET  /api/backup/sql    → Script SQL INSERT restaurable
 *
 * IMPORTAR:
 *   POST /api/backup/restaurar-json  → Restaura desde JSON
 *   POST /api/backup/restaurar-excel → Restaura desde XLSX
 */
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const multer = require('multer');
const { log, auditLog, getClientIP } = require('../utils/logger');

// ── Solo admins pueden restaurar; admins y supervisores exportan ───────────
const canBackup = (req, res, next) => {
  if (!['admin', 'supervisor'].includes(req.user.rol)) {
    return res.status(403).json({ error: 'Sin permiso para respaldar datos' });
  }
  next();
};
const canRestore = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo el Administrador puede restaurar datos' });
  }
  next();
};

// ── Upload en memoria ──────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(json|xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo archivos .json, .xlsx o .xls'), ok);
  }
});

// ── Orden de restauración respeta foreign keys ─────────────────────────────
const RESTORE_ORDER = [
  'categorias', 'proveedores', 'clientes', 'productos',
  'inventario', 'ventas', 'detalle_ventas',
  'compras', 'detalle_compras', 'cuentas_cobrar'
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTAR
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/backup/json
router.get('/json', auth, canBackup, async (req, res) => {
  const ip = getClientIP(req);
  try {
    const backup = {
      meta: {
        sistema:       'Agroservicio El Triunfo CRM',
        version:       '2.1',
        fecha:         new Date().toISOString(),
        exportado_por: req.user.username,
      },
      datos: {}
    };
    for (const t of RESTORE_ORDER) {
      try {
        const { rows } = await pool.query(`SELECT * FROM ${t} ORDER BY id`);
        backup.datos[t] = rows;
      } catch { backup.datos[t] = []; }
    }
    await auditLog(req.user.id, 'EXPORT_JSON', { tablas: RESTORE_ORDER.length, ip }, ip);
    const json = JSON.stringify(backup, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="agroservicio-backup-${hoy()}.json"`);
    res.send(json);
  } catch(e) {
    log('ERROR', 'Error backup JSON', { error: e.message });
    res.status(500).json({ error: 'Error generando backup JSON' });
  }
});

// GET /api/backup/excel
router.get('/excel', auth, canBackup, async (req, res) => {
  const ip = getClientIP(req);
  try {
    const XLSX = require('xlsx');
    const wb   = XLSX.utils.book_new();

    // Portada
    const wsInfo = XLSX.utils.aoa_to_sheet([
      ['Agroservicio El Triunfo — Backup de Datos'],
      ['Fecha:', new Date().toLocaleString('es-GT')],
      ['Exportado por:', req.user.nombre],
      ['Versión:', '2.1'],
      [],
      ['Hojas incluidas:', RESTORE_ORDER.join(', ')],
      [],
      ['PARA RESTAURAR: usa la opción "Restaurar Excel" en el menú del usuario.'],
    ]);
    wsInfo['!cols'] = [{ wch: 30 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Información');

    for (const t of RESTORE_ORDER) {
      try {
        const { rows } = await pool.query(`SELECT * FROM ${t} ORDER BY id LIMIT 50000`);
        if (!rows.length) continue;
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
        XLSX.utils.book_append_sheet(wb, ws, t.substring(0, 31));
      } catch {}
    }

    await auditLog(req.user.id, 'EXPORT_EXCEL', { ip }, ip);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="agroservicio-backup-${hoy()}.xlsx"`);
    res.send(buf);
  } catch(e) {
    log('ERROR', 'Error backup Excel', { error: e.message });
    res.status(500).json({ error: 'Error generando backup Excel' });
  }
});

// GET /api/backup/sql
router.get('/sql', auth, canBackup, async (req, res) => {
  const ip = getClientIP(req);
  try {
    let sql  = `-- Agroservicio El Triunfo CRM — Backup SQL\n`;
    sql += `-- Generado: ${new Date().toISOString()}\n`;
    sql += `-- Por: ${req.user.username}\n\n`;
    sql += `BEGIN;\n\n`;

    for (const t of RESTORE_ORDER) {
      try {
        const { rows } = await pool.query(`SELECT * FROM ${t} ORDER BY id`);
        if (!rows.length) continue;
        sql += `-- ── ${t.toUpperCase()} (${rows.length} filas) ──\n`;
        sql += `TRUNCATE TABLE ${t} RESTART IDENTITY CASCADE;\n`;
        for (const row of rows) {
          const cols = Object.keys(row).map(k => `"${k}"`).join(', ');
          const vals = Object.values(row).map(v => pgVal(v)).join(', ');
          sql += `INSERT INTO ${t} (${cols}) VALUES (${vals});\n`;
        }
        sql += `\n`;
      } catch {}
    }
    sql += `COMMIT;\n`;

    await auditLog(req.user.id, 'EXPORT_SQL', { ip }, ip);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="agroservicio-backup-${hoy()}.sql"`);
    res.send(sql);
  } catch(e) {
    log('ERROR', 'Error backup SQL', { error: e.message });
    res.status(500).json({ error: 'Error generando backup SQL' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTAR / RESTAURAR
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/backup/restaurar-json
router.post('/restaurar-json', auth, canRestore, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  const ip = getClientIP(req);
  const result = { tablas: {}, errores: [], total_filas: 0 };
  const client = await pool.connect();

  try {
    let backup;
    try {
      backup = JSON.parse(req.file.buffer.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'El archivo no es JSON válido' });
    }

    if (!backup.datos) {
      return res.status(400).json({ error: 'Formato de backup inválido — falta campo "datos"' });
    }

    await client.query('BEGIN');
    // Deshabilitar FK checks temporalmente
    await client.query('SET session_replication_role = replica');

    for (const tabla of RESTORE_ORDER) {
      const filas = backup.datos[tabla];
      if (!Array.isArray(filas) || !filas.length) {
        result.tablas[tabla] = { insertados: 0, omitidos: 0 };
        continue;
      }

      let insertados = 0, omitidos = 0;
      try {
        // Truncar y reinsertar
        await client.query(`TRUNCATE TABLE ${tabla} RESTART IDENTITY CASCADE`);

        for (const fila of filas) {
          try {
            const cols = Object.keys(fila).map(k => `"${k}"`).join(', ');
            const placeholders = Object.keys(fila).map((_, i) => `$${i + 1}`).join(', ');
            const vals = Object.values(fila).map(v =>
              v instanceof Date ? v.toISOString() : v
            );
            await client.query(
              `INSERT INTO ${tabla} (${cols}) VALUES (${placeholders})`,
              vals
            );
            insertados++;
          } catch(rowErr) {
            omitidos++;
            if (omitidos <= 5) result.errores.push(`${tabla}: ${rowErr.message}`);
          }
        }
        result.total_filas += insertados;
      } catch(tErr) {
        result.errores.push(`Tabla ${tabla}: ${tErr.message}`);
      }
      result.tablas[tabla] = { insertados, omitidos };
    }

    // Reactivar FK y sincronizar secuencias
    await client.query('SET session_replication_role = DEFAULT');
    await client.query("SELECT sync_all_sequences()");
    await client.query('COMMIT');

    await auditLog(req.user.id, 'RESTORE_JSON', {
      tablas: Object.keys(result.tablas).length,
      total_filas: result.total_filas, ip
    }, ip);
    log('INFO', 'Restauración JSON completada', { userId: req.user.id, ip, result });

    res.json({ ok: true, ...result });
  } catch(e) {
    await client.query('ROLLBACK').catch(() => {});
    log('ERROR', 'Error restaurando JSON', { error: e.message });
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// POST /api/backup/restaurar-excel
router.post('/restaurar-excel', auth, canRestore, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  const ip = getClientIP(req);
  const result = { tablas: {}, errores: [], total_filas: 0 };
  const client = await pool.connect();

  try {
    const XLSX = require('xlsx');
    let wb;
    try {
      wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true, raw: false });
    } catch {
      return res.status(400).json({ error: 'El archivo no es un Excel válido' });
    }

    // Verificar que tenga al menos una hoja de datos conocida (ignorar hoja 'Información')
    const hojas = wb.SheetNames.filter(n => RESTORE_ORDER.includes(n));
    if (!hojas.length) {
      return res.status(400).json({
        error: `No se encontraron hojas de datos válidas. Hojas encontradas: ${wb.SheetNames.join(', ')}. ¿Es un backup exportado por este sistema?`
      });
    }

    await client.query('BEGIN');
    await client.query('SET session_replication_role = replica');

    for (const tabla of RESTORE_ORDER) {
      if (!wb.SheetNames.includes(tabla)) {
        result.tablas[tabla] = { insertados: 0, omitidos: 0 };
        continue;
      }

      const ws   = wb.Sheets[tabla];
      const filas = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

      if (!filas.length) {
        result.tablas[tabla] = { insertados: 0, omitidos: 0 };
        continue;
      }

      let insertados = 0, omitidos = 0;
      try {
        await client.query(`TRUNCATE TABLE ${tabla} RESTART IDENTITY CASCADE`);

        for (const fila of filas) {
          try {
            // Limpiar valores vacíos
            const limpia = {};
            for (const [k, v] of Object.entries(fila)) {
              limpia[k] = (v === '' || v === undefined) ? null : v;
            }
            const cols = Object.keys(limpia).map(k => `"${k}"`).join(', ');
            const placeholders = Object.keys(limpia).map((_, i) => `$${i + 1}`).join(', ');
            await client.query(
              `INSERT INTO ${tabla} (${cols}) VALUES (${placeholders})`,
              Object.values(limpia)
            );
            insertados++;
          } catch(rowErr) {
            omitidos++;
            if (omitidos <= 5) result.errores.push(`${tabla} fila ${insertados + omitidos}: ${rowErr.message}`);
          }
        }
        result.total_filas += insertados;
      } catch(tErr) {
        result.errores.push(`Tabla ${tabla}: ${tErr.message}`);
      }
      result.tablas[tabla] = { insertados, omitidos };
    }

    await client.query('SET session_replication_role = DEFAULT');
    await client.query("SELECT sync_all_sequences()");
    await client.query('COMMIT');

    await auditLog(req.user.id, 'RESTORE_EXCEL', {
      hojas: hojas.length, total_filas: result.total_filas, ip
    }, ip);
    log('INFO', 'Restauración Excel completada', { userId: req.user.id, ip });

    res.json({ ok: true, ...result });
  } catch(e) {
    await client.query('ROLLBACK').catch(() => {});
    log('ERROR', 'Error restaurando Excel', { error: e.message });
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────
function hoy() { return new Date().toISOString().slice(0, 10); }

function pgVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return v;
  if (v instanceof Date) return `'${v.toISOString()}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}


module.exports = router;
