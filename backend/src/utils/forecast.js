/**
 * forecast.js — Pronóstico estadístico sin dependencias externas.
 *
 *  • holtDamped()     → series semanales por producto (suavizado exponencial doble
 *                       con tendencia amortiguada, "Holt-Winters sin estacionalidad").
 *  • dailyForecast()  → ventas diarias totales (tendencia lineal + índice por día
 *                       de la semana + banda de confianza al ~80 %).
 *
 * Son métodos clásicos y explicables: sirven para priorizar compras y detectar
 * tendencias, no para "adivinar" el futuro. La precisión mejora con más historial.
 */

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const std = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * Suavizado exponencial doble con tendencia amortiguada.
 * @param {number[]} y        serie (más antiguo → más reciente)
 * @param {number}   h        pasos a pronosticar
 * @returns {{forecast:number[], rmse:number, level:number, trend:number}}
 */
function holtDamped(y, h = 4, { alpha = 0.4, beta = 0.15, phi = 0.9 } = {}) {
  const n = y.length;
  if (n === 0) return { forecast: Array(h).fill(0), rmse: 0, level: 0, trend: 0 };
  if (n < 4) {
    const m = mean(y);
    return { forecast: Array(h).fill(m), rmse: std(y), level: m, trend: 0 };
  }

  // Inicialización: nivel = media de la 1.ª mitad, tendencia = diferencia de mitades
  const half = Math.floor(n / 2);
  const m1 = mean(y.slice(0, half));
  const m2 = mean(y.slice(n - half));
  let level = y[0] * 0.5 + m1 * 0.5;
  let trend = (m2 - m1) / Math.max(1, n - half);

  const errors = [];
  for (let t = 1; t < n; t++) {
    const pred = level + phi * trend;
    errors.push(y[t] - pred);
    const prevLevel = level;
    level = alpha * y[t] + (1 - alpha) * pred;
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
  }

  const forecast = [];
  let acc = 0;
  for (let i = 1; i <= h; i++) {
    acc += Math.pow(phi, i);
    forecast.push(Math.max(0, level + acc * trend));
  }
  const rmse = Math.sqrt(mean(errors.map((e) => e * e)));
  return { forecast, rmse, level, trend };
}

/**
 * Pronóstico diario de ventas totales.
 * @param {{dia:string,total:number}[]} serie  días consecutivos, antiguo → reciente
 * @param {number} horizonte                   días a proyectar
 */
function dailyForecast(serie, horizonte = 14) {
  const y = serie.map((d) => Number(d.total) || 0);
  const n = y.length;
  const diasConVenta = y.filter((v) => v > 0).length;
  if (n < 21 || diasConVenta < 10) {
    return { ok: false, motivo: 'Se necesitan al menos 21 días con 10 días de ventas', puntos: [] };
  }

  // Índice estacional por día de la semana (0=Dom … 6=Sáb), suavizado hacia 1
  const dow = serie.map((d) => new Date(d.dia + 'T12:00:00').getDay());
  const media = mean(y) || 1;
  const idx = Array(7).fill(1);
  for (let k = 0; k < 7; k++) {
    const vals = y.filter((_, i) => dow[i] === k);
    if (vals.length) idx[k] = clamp(0.7 * (mean(vals) / media) + 0.3, 0.3, 2.5);
  }

  // Desestacionalizar y ajustar tendencia lineal (últimos ≤ 60 días)
  const win = Math.min(n, 60);
  const start = n - win;
  const ds = y.slice(start).map((v, i) => v / idx[dow[start + i]]);
  const xs = ds.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(ds);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < win; i++) { sxy += (xs[i] - mx) * (ds[i] - my); sxx += (xs[i] - mx) ** 2; }
  let slope = sxx ? sxy / sxx : 0;
  const intercept = my - slope * mx;

  // Limitar la pendiente: la proyección no puede variar más de ±40 % en el horizonte
  const maxSlope = (0.4 * my) / Math.max(1, horizonte);
  slope = clamp(slope, -maxSlope, maxSlope);

  // Residuos → banda del 80 %
  const resid = y.slice(start).map((v, i) => v - (intercept + slope * i) * idx[dow[start + i]]);
  const sigma = std(resid);
  const z = 1.28;

  const ultimo = new Date(serie[n - 1].dia + 'T12:00:00');
  const puntos = [];
  for (let h = 1; h <= horizonte; h++) {
    const f = new Date(ultimo);
    f.setDate(f.getDate() + h);
    const base = Math.max(0, (intercept + slope * (win - 1 + h)) * idx[f.getDay()]);
    puntos.push({
      dia: f.toISOString().slice(0, 10),
      valor: round2(base),
      min: round2(Math.max(0, base - z * sigma)),
      max: round2(base + z * sigma),
    });
  }
  return { ok: true, indice_dia: idx.map(round3), puntos };
}

const round2 = (x) => Math.round(x * 100) / 100;
const round3 = (x) => Math.round(x * 1000) / 1000;

/** Rango percentil (0–1) de cada valor dentro del arreglo. */
function percentRank(values) {
  const n = values.length;
  if (n <= 1) return values.map(() => 0.5);
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    const first = sorted.indexOf(v);
    return first / (n - 1);
  });
}

module.exports = { holtDamped, dailyForecast, percentRank, mean, std, clamp, round2 };
