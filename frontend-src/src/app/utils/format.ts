export function fmtQ(n: any): string {
  return 'Q ' + parseFloat(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtN(n: any): string {
  return parseFloat(n || 0).toLocaleString('es-GT');
}
export function fmtDate(d: any): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Moneda compacta: Q 1.2M, Q 45k, Q 980 */
export function fmtQk(n: any): string {
  const v = Number(n) || 0, a = Math.abs(v);
  if (a >= 1e6) return 'Q ' + (v / 1e6).toLocaleString('es-GT', { maximumFractionDigits: 1 }) + 'M';
  if (a >= 1e3) return 'Q ' + (v / 1e3).toLocaleString('es-GT', { maximumFractionDigits: a >= 1e5 ? 0 : 1 }) + 'k';
  return 'Q ' + v.toLocaleString('es-GT', { maximumFractionDigits: 0 });
}
/** Porcentaje con signo opcional: +5.7 % */
export function fmtPct(n: any, dec = 1, signo = false): string {
  const v = Number(n) || 0;
  return (signo && v > 0 ? '+' : '') + v.toLocaleString('es-GT', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' %';
}
/** Cambio porcentual para chips: null → "nuevo" */
export function fmtDelta(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'nuevo';
  return fmtPct(n, 1, true);
}
