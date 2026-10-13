import { Component, HostListener, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnaliticaService } from '../../../services/analitica';
import { ChartComponent } from '../../../components/shared/chart/chart';
import { SparklineComponent } from '../../../components/shared/sparkline/sparkline';
import { ClaseProducto, ProductoAnalitica, ProductosResp } from '../../../models/analitica';
import { fmtDate, fmtDelta, fmtN, fmtPct, fmtQ, fmtQk } from '../../../utils/format';
import { CLASES, RIESGOS, ejeX, ejeY, etiquetaFecha } from '../dashboard-theme';

type SortKey = 'score' | 'nombre' | 'tendencia_pct' | 'demanda_30d' | 'cobertura_dias' | 'sugerido';
interface Extra { rank: number; ult4: number; proy4: number; cambio: number | null; fc: number[]; }

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

@Component({
  selector: 'app-dash-prediccion',
  standalone: true,
  imports: [CommonModule, ChartComponent, SparklineComponent],
  templateUrl: './prediccion.html',
})
export class DashPrediccionComponent {
  private svc = inject(AnaliticaService);

  refresh = input(0);
  semanas = signal(16);
  data    = signal<ProductosResp | null>(null);
  loading = signal(true);
  error   = signal('');

  // filtros / orden / paginación
  q = signal(''); fCategoria = signal(''); fClase = signal(''); fRiesgo = signal('');
  sortKey = signal<SortKey>('score'); sortDir = signal<1 | -1>(-1);
  limit = signal(15);
  sel = signal<ProductoAnalitica | null>(null);
  metodoAbierto = signal(false);

  readonly CLASES = CLASES; readonly RIESGOS = RIESGOS;
  readonly clasesLista = (Object.keys(CLASES) as ClaseProducto[]);
  fmtQ = fmtQ; fmtQk = fmtQk; fmtN = fmtN; fmtPct = fmtPct; fmtDelta = fmtDelta; fmtDate = fmtDate;
  r0 = (n: number) => fmtN(Math.round(n));

  private seq = 0;
  constructor() {
    effect(() => {
      const s = this.semanas();
      this.refresh();
      untracked(() => this.cargar(s));
    });
  }

  private async cargar(s: number) {
    const mi = ++this.seq;
    this.loading.set(true); this.error.set('');
    try {
      const r = await this.svc.productos(s);
      if (mi !== this.seq) return;
      this.data.set(r); this.limit.set(15);
    } catch (e: any) {
      if (mi === this.seq) this.error.set(e?.message || 'No se pudo calcular la predicción');
    } finally {
      if (mi === this.seq) this.loading.set(false);
    }
  }

  @HostListener('document:keydown.escape') cerrar() { this.sel.set(null); }

  // ── Derivados por producto ────────────────────────────────────────────────
  productos = computed(() => this.data()?.productos ?? []);
  extra = computed(() => {
    const m = new Map<number, Extra>();
    this.productos().forEach((p, i) => {
      const ult4 = p.serie.slice(-4).reduce((s, v) => s + v, 0);
      const proy4 = p.pronostico.reduce((s, x) => s + x.valor, 0);
      m.set(p.id, { rank: i + 1, ult4, proy4, fc: p.pronostico.map(x => x.valor),
        cambio: ult4 > 0 ? ((proy4 - ult4) / ult4) * 100 : proy4 > 0 ? null : 0 });
    });
    return m;
  });
  categorias = computed(() => [...new Set(this.productos().map(p => p.categoria))].sort());

  filtrados = computed(() => {
    const q = norm(this.q()), c = this.fCategoria(), cl = this.fClase(), rs = this.fRiesgo();
    const k = this.sortKey(), dir = this.sortDir();
    const r = this.productos().filter(p =>
      (!q || norm(p.nombre + ' ' + p.codigo).includes(q)) && (!c || p.categoria === c) && (!cl || p.clase === cl) &&
      (!rs || (rs === 'alerta' ? p.riesgo === 'quiebre' || p.riesgo === 'bajo' : p.riesgo === rs)));
    return [...r].sort((a, b) => {
      if (k === 'nombre') return a.nombre.localeCompare(b.nombre) * dir;
      const va = (a[k] as number | null) ?? Number.POSITIVE_INFINITY;
      const vb = (b[k] as number | null) ?? Number.POSITIVE_INFINITY;
      return (va - vb) * dir;
    });
  });
  visibles = computed(() => this.filtrados().slice(0, this.limit()));
  hayFiltros = computed(() => !!(this.q() || this.fCategoria() || this.fClase() || this.fRiesgo()));

  ordenar(k: SortKey) {
    if (this.sortKey() === k) this.sortDir.update(d => (d === 1 ? -1 : 1));
    else { this.sortKey.set(k); this.sortDir.set(k === 'nombre' || k === 'cobertura_dias' ? 1 : -1); }
  }
  flecha(k: SortKey) { return this.sortKey() === k ? (this.sortDir() === 1 ? '↑' : '↓') : ''; }
  limpiar() { this.q.set(''); this.fCategoria.set(''); this.fClase.set(''); this.fRiesgo.set(''); }

  // ── Tarjetas de hallazgos ─────────────────────────────────────────────────
  masDemanda = computed(() => [...this.productos()].sort((a, b) => b.ingreso_proy_30d - a.ingreso_proy_30d)[0] ?? null);
  mayorImpulso = computed(() => {
    const c = this.productos().filter(p => ['estrella', 'creciendo'].includes(p.clase) && p.ingreso_proy_30d > 0);
    return c.sort((a, b) => b.tendencia_pct - a.tendencia_pct)[0] ?? null;
  });
  enRiesgo = computed(() => this.productos()
    .filter(p => p.riesgo === 'quiebre' || p.riesgo === 'bajo')
    .sort((a, b) => b.ingreso_proy_30d - a.ingreso_proy_30d));
  inmovilizado = computed(() => this.productos().filter(p => p.riesgo === 'exceso'));

  advertenciaHistorial = computed(() => {
    const d = this.data();
    if (!d) return '';
    if (d.historial_dias < 28) return `Solo hay ${d.historial_dias} días de ventas registradas. Con menos de 4 semanas las proyecciones no son confiables.`;
    if (d.historial_dias < 90) return `Tu historial es de ${d.historial_dias} días. Las proyecciones son orientativas; mejoran a partir de ~3 meses y captan la temporada con 12 meses.`;
    return '';
  });

  // ── Gráfica 1: cambio de demanda proyectado ───────────────────────────────
  cambioCfg = computed<any>(() => {
    const ex = this.extra();
    const items = this.productos().filter(p => p.clase !== 'sin_rotacion' && p.ingreso_proy_30d > 0).slice(0, 12);
    if (!items.length) return null;
    const val = (p: ProductoAnalitica) => clamp(ex.get(p.id)!.cambio ?? 100, -100, 200);
    const corto = (s: string) => (s.length > 24 ? s.slice(0, 23) + '…' : s);
    return {
      type: 'bar',
      data: {
        labels: items.map(p => corto(p.nombre)),
        datasets: [{ data: items.map(val), borderRadius: 4, maxBarThickness: 16,
          backgroundColor: items.map(p => (val(p) >= 0 ? '#10b981' : '#f43f5e')) }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (i: any) => items[i[0].dataIndex].nombre,
              label: (c: any) => ` Cambio esperado: ${fmtDelta(ex.get(items[c.dataIndex].id)!.cambio)}`,
              afterLabel: (c: any) => {
                const p = items[c.dataIndex], e = ex.get(p.id)!;
                return [` Últimas 4 sem: ${this.r0(e.ult4)} ${p.unidad}`, ` Próximas 4 sem: ${this.r0(e.proy4)} ${p.unidad}`];
              },
            },
          },
        },
        scales: {
          x: { ...ejeY((v: any) => v + '%'), beginAtZero: false,
               grid: { color: (c: any) => (c.tick.value === 0 ? '#94a3b8' : '#f1f5f9') } },
          y: { grid: { display: false }, border: { display: false } },
        },
      },
    };
  });

  // ── Gráfica 2: matriz crecimiento vs margen (burbujas) ────────────────────
  burbujaCfg = computed<any>(() => {
    const d = this.data();
    const items = this.productos().filter(p => p.ingreso_proy_30d > 0 && p.clase !== 'sin_rotacion');
    if (!d || !items.length) return null;
    const conMargen = d.puede_ver_margen;
    const maxIng = Math.max(...items.map(p => p.ingreso_proy_30d), 1);
    const eje = (p: ProductoAnalitica) => (conMargen ? p.margen_pct ?? 0 : p.consistencia);
    return {
      type: 'bubble',
      data: {
        datasets: this.clasesLista.filter(c => items.some(p => p.clase === c)).map(c => ({
          label: CLASES[c].label,
          data: items.filter(p => p.clase === c).map(p => ({
            x: clamp(p.tendencia_pct, -100, 200), y: eje(p), r: 5 + 22 * Math.sqrt(p.ingreso_proy_30d / maxIng), p,
          })),
          backgroundColor: CLASES[c].color + '88', borderColor: CLASES[c].color, borderWidth: 1.5,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              title: (i: any) => i[0].raw.p.nombre,
              label: (c: any) => {
                const p: ProductoAnalitica = c.raw.p;
                return [` Tendencia: ${fmtDelta(p.tendencia_pct)}`,
                  conMargen ? ` Margen: ${fmtPct(p.margen_pct)}` : ` Consistencia: ${p.consistencia} %`,
                  ` Ventas proyectadas 30 d: ${fmtQk(p.ingreso_proy_30d)}`];
              },
            },
          },
        },
        onClick: (_e: any, els: any[], chart: any) => {
          if (els.length) this.sel.set(chart.data.datasets[els[0].datasetIndex].data[els[0].index].p);
        },
        scales: {
          x: { ...ejeY((v: any) => v + '%'), beginAtZero: false, min: -100, max: 200,
               title: { display: true, text: 'Tendencia de ventas (últ. 4 sem vs 4 previas) →', color: '#94a3b8' },
               grid: { color: (c: any) => (c.tick.value === 0 ? '#94a3b8' : '#f1f5f9') } },
          y: { ...ejeY((v: any) => v + '%'), beginAtZero: true,
               title: { display: true, text: conMargen ? 'Margen bruto →' : 'Consistencia de ventas →', color: '#94a3b8' } },
        },
      },
    };
  });

  // ── Gráfica 3: Pareto ABC ─────────────────────────────────────────────────
  paretoCfg = computed<any>(() => {
    const items = [...this.productos()].filter(p => p.ingreso > 0).sort((a, b) => b.ingreso - a.ingreso);
    if (!items.length) return null;
    const total = items.reduce((s, p) => s + p.ingreso, 0);
    let acc = 0;
    const cum = items.map(p => ((acc += p.ingreso) / total) * 100);
    const top = items.slice(0, 15);
    const col = { A: '#00C793', B: '#3887BF', C: '#cbd5e1' } as Record<string, string>;
    const corto = (s: string) => (s.length > 14 ? s.slice(0, 13) + '…' : s);
    return {
      type: 'bar',
      data: {
        labels: top.map(p => corto(p.nombre)),
        datasets: [
          { type: 'bar', label: 'Ventas', data: top.map(p => p.ingreso), yAxisID: 'y', borderRadius: 4,
            backgroundColor: top.map(p => col[p.abc ?? 'C']), maxBarThickness: 28, order: 2 },
          { type: 'line', label: '% acumulado', data: cum.slice(0, top.length), yAxisID: 'y1', borderColor: '#f59e0b',
            backgroundColor: '#f59e0b', borderWidth: 2, pointRadius: 3, tension: 0.25, order: 1 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (i: any) => top[i[0].dataIndex].nombre,
              label: (c: any) => (c.dataset.yAxisID === 'y1' ? ` Acumulado: ${fmtPct(c.raw, 0)}` : ` Ventas: ${fmtQ(c.raw)}`),
              afterBody: (i: any) => ` Clase ${top[i[0].dataIndex].abc}`,
            },
          },
        },
        scales: {
          x: ejeX({ font: { size: 10 }, maxRotation: 50, minRotation: 50 }),
          y: ejeY((v: any) => fmtQk(v)),
          y1: { position: 'right', min: 0, max: 100, border: { display: false }, grid: { drawOnChartArea: false },
                ticks: { callback: (v: any) => v + '%' } },
        },
      },
    };
  });

  abcResumen = computed(() => {
    const ps = this.productos().filter(p => p.abc);
    const tot = ps.reduce((s, p) => s + p.ingreso, 0) || 1;
    return (['A', 'B', 'C'] as const).map(k => {
      const g = ps.filter(p => p.abc === k);
      return { k, n: g.length, pct: (g.reduce((s, p) => s + p.ingreso, 0) / tot) * 100 };
    });
  });
  clasesResumen = computed(() => this.clasesLista.map(k => ({
    k, ...CLASES[k], n: this.productos().filter(p => p.clase === k).length,
  })).filter(c => c.n > 0));

  // ── Detalle del producto ──────────────────────────────────────────────────
  detalleCfg = computed<any>(() => {
    const p = this.sel();
    if (!p) return null;
    const W = p.serie.length, H = p.pronostico.length;
    const hoy = new Date();
    const dia = (n: number) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return etiquetaFecha(d); };
    const labels = [
      ...p.serie.map((_, i) => 'Sem ' + dia(-7 * (W - 1 - i))),
      ...p.pronostico.map((_, j) => 'Sem ' + dia(7 * (j + 1))),
    ];
    const nulls = (n: number) => Array(n).fill(null);
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { type: 'bar', label: 'Ventas reales', data: [...p.serie, ...nulls(H)], backgroundColor: 'rgba(0,199,147,0.75)',
            borderRadius: 4, maxBarThickness: 18, order: 2 },
          { type: 'bar', label: 'Proyección', data: [...nulls(W), ...p.pronostico.map(x => x.valor)],
            backgroundColor: 'rgba(139,92,246,0.70)', borderRadius: 4, maxBarThickness: 18, order: 2 },
          { type: 'line', label: 'Mín', data: [...nulls(W), ...p.pronostico.map(x => x.min)], borderColor: 'rgba(139,92,246,0.5)',
            borderDash: [4, 3], borderWidth: 1, pointRadius: 0, order: 1 },
          { type: 'line', label: 'Máx', data: [...nulls(W), ...p.pronostico.map(x => x.max)], borderColor: 'rgba(139,92,246,0.5)',
            borderDash: [4, 3], borderWidth: 1, pointRadius: 0, order: 1 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { filter: (i: any) => !['Mín', 'Máx'].includes(i.text) } },
          tooltip: {
            filter: (i: any) => i.raw !== null,
            callbacks: { label: (c: any) => ` ${c.dataset.label}: ${this.r0(c.raw)} ${p.unidad}` },
          },
        },
        scales: { x: ejeX({ maxTicksLimit: 8, font: { size: 9 } }), y: ejeY() },
      },
    };
  });

  recomendacion(p: ProductoAnalitica): string {
    const u = p.unidad;
    if (p.clase === 'sin_rotacion') {
      return `No registra ventas en las últimas 8 semanas.${p.stock > 0 ? ` Hay ${this.r0(p.stock)} ${u} en bodega: considera promoción, combo o liquidación antes de reponer.` : ''}`;
    }
    const partes: string[] = [];
    partes.push(`Se esperan ~${this.r0(p.demanda_30d)} ${u} en los próximos 30 días (rango ${this.r0(p.demanda_min)}–${this.r0(p.demanda_max)}).`);
    if (p.riesgo === 'quiebre') partes.push(`Cobertura de solo ${p.cobertura_dias} días: conviene reponer ~${this.r0(p.sugerido)} ${u} cuanto antes.`);
    else if (p.riesgo === 'bajo') partes.push(`Está en o bajo el stock mínimo: programa una compra de ~${this.r0(p.sugerido)} ${u}.`);
    else if (p.riesgo === 'exceso') partes.push(`Tienes cobertura para ${p.cobertura_dias ?? '—'} días: evita comprar más por ahora.`);
    else if (p.sugerido > 0) partes.push(`Para cubrir el mes con tu stock mínimo, repón ~${this.r0(p.sugerido)} ${u}.`);
    else partes.push('Tu stock actual cubre la demanda esperada del mes.');
    if (p.clase === 'declive') partes.push('Sus ventas van a la baja: compra con cautela.');
    if (p.confianza === 'baja') partes.push('⚠️ Pocas semanas con ventas: toma esta proyección solo como referencia.');
    return partes.join(' ');
  }

  confianzaClase(c: string) {
    return c === 'alta' ? 'text-emerald-600' : c === 'media' ? 'text-amber-600' : 'text-rose-500';
  }
}
