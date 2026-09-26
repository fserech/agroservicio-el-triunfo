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
