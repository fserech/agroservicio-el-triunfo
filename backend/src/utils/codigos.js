/**
 * codigos.js — Generación automática de códigos de producto.
 *
 * Formato:  <PREFIJO>-<NNN>   (ej. FERT-004, SEM-012, PROD-001)
 *  • El prefijo sale de la categoría del producto (sin categoría → PROD).
 *  • El número es el MAYOR existente para ese prefijo + 1 (comparación NUMÉRICA, no de texto).
 *  • Para evitar códigos repetidos cuando dos usuarios guardan a la vez, quien crea productos
 *    debe tomar el candado `bloquearCodigos()` dentro de su transacción antes de llamar a
 *    `siguienteCodigoProducto()`.
 */

const LOCK_ID = 740001;   // clave arbitraria del candado de numeración de productos

function prefijoCategoria(nombre) {
  if (!nombre) return 'PROD';
  const n = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (n.includes('FERTILIZ'))                                          return 'FERT';
  if (n.includes('HERB') || n.includes('FUNGU') ||
      n.includes('INSECT') || n.includes('AGROQU'))                    return 'AGRQ';
  if (n.includes('SEMIL'))                                             return 'SEM';
  if (n.includes('HERRAM'))                                            return 'HER';
  if (n.includes('EQUIP'))                                             return 'EQP';
  if (n.includes('RIEGO'))                                             return 'RIE';
  if (n.includes('VET'))                                               return 'VET';
  if (n.includes('EMPAQ'))                                             return 'EMP';
  const letras = n.replace(/[^A-Z]/g, '').slice(0, 4);
  return letras || 'PROD';
}

/** Candado transaccional: se libera solo al hacer COMMIT/ROLLBACK. */
async function bloquearCodigos(db) {
  await db.query('SELECT pg_advisory_xact_lock($1)', [LOCK_ID]);
}

/** Devuelve el siguiente código disponible para la categoría indicada. */
async function siguienteCodigoProducto(db, categoriaId) {
  let prefijo = 'PROD';
  if (categoriaId) {
    const { rows } = await db.query('SELECT nombre FROM categorias WHERE id = $1', [categoriaId]);
    if (rows.length) prefijo = prefijoCategoria(rows[0].nombre);
  }
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(((regexp_match(codigo, '-([0-9]+)$'))[1])::int), 0) AS m
       FROM productos WHERE codigo ~ ('^' || $1 || '-[0-9]+$')`,
    [prefijo]);
  const n = rows[0].m + 1;
  return `${prefijo}-${String(n).padStart(3, '0')}`;
}

module.exports = { prefijoCategoria, bloquearCodigos, siguienteCodigoProducto };
