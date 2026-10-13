import { ClaseProducto, RiesgoStock } from '../../models/analitica';

export const PALETA = ['#00C793', '#3887BF', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899', '#64748b'];

/** Clases de Tailwind escritas completas para que el compilador las detecte. */
export const CLASES: Record<ClaseProducto, { label: string; badge: string; color: string; desc: string }> = {
  estrella:     { label: 'Estrella',       badge: 'bg-amber-50 text-amber-700 ring-amber-200',       color: '#f59e0b', desc: 'Alta demanda proyectada y tendencia positiva' },
  creciendo:    { label: 'En crecimiento', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#10b981', desc: 'Sus ventas suben ≥ 15 % vs las 4 semanas previas' },
  estable:      { label: 'Estable',        badge: 'bg-slate-100 text-slate-600 ring-slate-200',      color: '#64748b', desc: 'Demanda constante' },
  declive:      { label: 'En declive',     badge: 'bg-rose-50 text-rose-700 ring-rose-200',          color: '#ef4444', desc: 'Sus ventas bajan ≥ 15 % vs las 4 semanas previas' },
  sin_rotacion: { label: 'Sin rotación',   badge: 'bg-zinc-100 text-zinc-500 ring-zinc-200',         color: '#a1a1aa', desc: 'Sin ventas en las últimas 8 semanas' },
  nuevo:        { label: 'Nuevo',          badge: 'bg-sky-50 text-sky-700 ring-sky-200',             color: '#0ea5e9', desc: 'Empezó a venderse recientemente' },
};

export const RIESGOS: Record<RiesgoStock, { label: string; badge: string }> = {
  ok:      { label: 'Saludable',         badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  quiebre: { label: 'Riesgo de quiebre', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
  bajo:    { label: 'Stock bajo',        badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  exceso:  { label: 'Exceso / lento',    badge: 'bg-violet-50 text-violet-700 ring-violet-200' },
};

export const METODOS: Record<string, string> = {
  efectivo: 'Efectivo', credito: 'Crédito', transferencia: 'Transferencia', tarjeta: 'Tarjeta', cheque: 'Cheque',
};

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_LARGOS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** 'YYYY-MM-DD' → '12 oct' (sin desfase de zona horaria) */
export function etiquetaDia(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]}`;
}
export function etiquetaFecha(d: Date): string { return `${d.getDate()} ${MESES[d.getMonth()]}`; }

/** Opciones base de ejes para todas las gráficas */
export const ejeX = (extra: any = {}) => ({
  grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true, ...extra },
});
export const ejeY = (callback?: (v: any) => string) => ({
  beginAtZero: true, border: { display: false }, grid: { color: '#f1f5f9' },
  ticks: { padding: 6, ...(callback ? { callback } : {}) },
});
