import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnaliticaService } from '../../../services/analitica';
import { ApiService } from '../../../services/api';
import { StatCardComponent } from '../../../components/shared/stat-card/stat-card';
import { ChartComponent } from '../../../components/shared/chart/chart';
import { DistribucionResp, IntegridadResp, ResumenResp, TendenciaResp } from '../../../models/analitica';
import { fmtDelta, fmtN, fmtPct, fmtQ, fmtQk, fmtDate } from '../../../utils/format';
import { DIAS_LARGOS, DIAS_SEMANA, METODOS, PALETA, ejeX, ejeY, etiquetaDia } from '../dashboard-theme';

interface Actividad { tipo: string; ref: string; valor: number; estado: string; fecha: string; }
interface Tarjeta {
  label: string; value: string; delta?: number | null; invert?: boolean; sub: string;
  color: string; spark: number[] | null; hint: string; link?: string;
}

@Component({
  selector: 'app-dash-resumen',
  standalone: true,
  imports: [CommonModule, RouterModule, StatCardComponent, ChartComponent],
  templateUrl: './resumen.html',
})
export class DashResumenComponent {
  private svc = inject(AnaliticaService);
  private api = inject(ApiService);

  dias    = input(30);
  refresh = input(0);

  resumen   = signal<ResumenResp | null>(null);
  tendencia = signal<TendenciaResp | null>(null);
  dist      = signal<DistribucionResp | null>(null);
  actividad = signal<Actividad[]>([]);
  integridad = signal<IntegridadResp | null>(null);
  loadingR = signal(true); loadingT = signal(true); loadingD = signal(true); loadingA = signal(true);
  error = signal('');

  fmtQ = fmtQ; fmtQk = fmtQk; fmtN = fmtN; fmtPct = fmtPct; fmtDelta = fmtDelta; fmtDate = fmtDate;
  metodoLabel = (m: string) => METODOS[m] || m;
  readonly paleta = PALETA;

  private seq = 0;

  constructor() {
    effect(() => {
      const d = this.dias();
      this.refresh();
      untracked(() => this.cargar(d));
    });
  }

  private cargar(d: number) {
    const mi = ++this.seq;
    const vigente = () => mi === this.seq;     // descarta respuestas de periodos anteriores
    this.error.set('');
    this.loadingR.set(true); this.loadingT.set(true); this.loadingD.set(true); this.loadingA.set(true);

    const fallo = (e: any) => { if (vigente()) this.error.set(e?.message || 'No se pudieron cargar los datos'); };
    this.svc.resumen(d).then(r => vigente() && this.resumen.set(r)).catch(fallo).finally(() => vigente() && this.loadingR.set(false));
    this.svc.tendencia(Math.min(365, Math.max(60, d))).then(r => vigente() && this.tendencia.set(r)).catch(fallo).finally(() => vigente() && this.loadingT.set(false));
    this.svc.distribucion(d).then(r => vigente() && this.dist.set(r)).catch(fallo).finally(() => vigente() && this.loadingD.set(false));
    this.integridad.set(null);
    // El chequeo de integridad es solo para admin/supervisor/contador (el backend responde 403 al resto)
    this.svc.integridad().then(r => vigente() && this.integridad.set(r)).catch(() => {});
    this.api.get<Actividad[]>('/dashboard/actividad').then(r => vigente() && this.actividad.set(r)).catch(() => {}).finally(() => vigente() && this.loadingA.set(false));
  }

  // ── Tarjetas KPI ───────────────────────────────────────────────────────────
  tarjetas = computed<Tarjeta[]>(() => {
    const r = this.resumen();
    if (!r) return [];
    const a = r.actual, d = r.delta, s = r.diario;
    const periodo = `vs ${r.dias} días previos`;
    const out: Tarjeta[] = [
      { label: 'Ventas', value: fmtQ(a.ventas), delta: d.ventas, sub: `${fmtN(a.transacciones)} transacciones`,
        color: '#00C793', spark: s.map(x => x.total), hint: `Ventas con IVA · ${periodo}`, link: '/ventas' },
    ];
    if (r.puede_ver_margen) {
      out.push({ label: 'Utilidad bruta', value: fmtQ(a.utilidad), delta: d.utilidad, sub: `Margen ${fmtPct(a.margen)}`,
        color: '#3887BF', spark: s.map(x => x.utilidad ?? 0),
        hint: 'Ventas sin IVA menos costo de compra actual de cada producto' });
    } else {
      out.push({ label: 'Unidades vendidas', value: fmtN(a.unidades), delta: d.unidades, sub: periodo,
        color: '#3887BF', spark: s.map(x => x.unidades), hint: periodo });
    }
    out.push(
      { label: 'Ticket promedio', value: fmtQ(a.ticket), delta: d.ticket, sub: 'por transacción',
        color: '#8b5cf6', spark: s.map(x => (x.n ? x.total / x.n : 0)), hint: periodo },
      { label: 'Clientes activos', value: fmtN(a.clientes), delta: d.clientes, sub: 'compraron en el periodo',
        color: '#14b8a6', spark: null, hint: periodo, link: '/clientes' },
      { label: 'Por cobrar', value: fmtQ(r.cuentas_cobrar.total), invert: true,
        sub: r.cuentas_cobrar.vencido > 0
          ? `${r.cuentas_cobrar.n_vencidas} vencidas · ${fmtQ(r.cuentas_cobrar.vencido)}`
          : `${r.cuentas_cobrar.n_abiertas} cuentas abiertas · sin vencidas`,
        color: '#ef4444', spark: null, link: '/cuentas-cobrar',
        hint: 'Saldo pendiente: mismo cálculo del módulo Cuentas por Cobrar' },
      { label: 'Stock crítico', value: fmtN(r.inventario.criticos), invert: true,
        sub: `de ${fmtN(r.inventario.productos)} productos`, color: '#f59e0b', spark: null, link: '/inventario',
        hint: 'Productos en o por debajo de su stock mínimo (misma regla que Inventario)' },
    );
    return out;
  });

  // ── Tendencia + pronóstico ─────────────────────────────────────────────────
  tendenciaCfg = computed<any>(() => {
    const t = this.tendencia();
    if (!t || !t.historico.length) return null;
    const h = t.historico;
    const p = t.pronostico.ok ? t.pronostico.puntos : [];
    const labels = [...h.map(x => etiquetaDia(x.dia)), ...p.map(x => etiquetaDia(x.dia))];
    const nulls = (n: number) => Array(n).fill(null);
    const ultimoMA = h[h.length - 1].promedio_7d;

    const datasets: any[] = [
      { type: 'bar', label: 'Ventas diarias', data: [...h.map(x => x.total), ...nulls(p.length)],
        backgroundColor: 'rgba(0,199,147,0.22)', hoverBackgroundColor: 'rgba(0,199,147,0.45)',
        borderRadius: 3, maxBarThickness: 14, order: 3 },
      { type: 'line', label: 'Promedio 7 días', data: [...h.map(x => x.promedio_7d), ...nulls(p.length)],
        borderColor: '#00A67A', borderWidth: 2.2, pointRadius: 0, pointHoverRadius: 4, tension: 0.35, order: 1 },
    ];
    if (p.length) {
      const pad = (v: number[]) => [...nulls(h.length - 1), ultimoMA, ...v];
      datasets.push(
        { type: 'line', label: 'Rango mín', data: pad(p.map(x => x.min)), borderWidth: 0, pointRadius: 0, tension: 0.35, order: 4 },
        { type: 'line', label: 'Rango máx', data: pad(p.map(x => x.max)), borderWidth: 0, pointRadius: 0, tension: 0.35,
          fill: '-1', backgroundColor: 'rgba(139,92,246,0.13)', order: 4 },
        { type: 'line', label: 'Proyección', data: pad(p.map(x => x.valor)), borderColor: '#8b5cf6', borderWidth: 2.2,
          borderDash: [6, 4], pointRadius: 0, pointHoverRadius: 4, tension: 0.35, order: 2 },
      );
    }
    return {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { filter: (i: any) => !i.text.startsWith('Rango') } },
          tooltip: {
            filter: (i: any) => !i.dataset.label.startsWith('Rango') && i.raw !== null,
            callbacks: { label: (c: any) => ` ${c.dataset.label}: ${fmtQ(c.raw)}` },
          },
        },
        scales: { x: ejeX({ maxTicksLimit: 12 }), y: ejeY((v) => fmtQk(v)) },
      },
    };
  });

  proyeccionTexto = computed(() => {
    const t = this.tendencia();
    if (!t) return '';
    if (!t.pronostico.ok) return t.pronostico.motivo || 'Aún no hay suficiente historial para proyectar';
    const r = t.resumen;
    return `Próximos ${t.horizonte} días: ${fmtQ(r.proyeccion_total)} (${fmtDelta(r.cambio_esperado_pct)} vs los ${t.horizonte} días previos)`;
  });
  proyeccionPositiva = computed(() => (this.tendencia()?.resumen.cambio_esperado_pct ?? 0) >= 0);

  // ── Categorías (dona) ──────────────────────────────────────────────────────
  totalCats = computed(() => (this.dist()?.categorias ?? []).reduce((s, c) => s + c.ingreso, 0));
  categoriasCfg = computed<any>(() => {
    const cats = this.dist()?.categorias ?? [];
    if (!cats.length) return null;
    return {
      type: 'doughnut',
      data: {
        labels: cats.map(c => c.categoria),
        datasets: [{ data: cats.map(c => c.ingreso), backgroundColor: cats.map((_, i) => PALETA[i % PALETA.length]),
          borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c: any) => ` ${fmtQ(c.raw)} · ${fmtPct((c.raw / this.totalCats()) * 100)}` } },
        },
      },
    };
  });

  // ── Top productos ──────────────────────────────────────────────────────────
  topCfg = computed<any>(() => {
    const top = this.dist()?.top_productos ?? [];
    if (!top.length) return null;
    const corto = (s: string) => (s.length > 26 ? s.slice(0, 25) + '…' : s);
    return {
      type: 'bar',
      data: {
        labels: top.map(p => corto(p.nombre)),
        datasets: [{ label: 'Ventas', data: top.map(p => p.ingreso),
          backgroundColor: top.map((_, i) => (i < 3 ? '#00C793' : 'rgba(0,199,147,0.45)')),
          borderRadius: 5, maxBarThickness: 18 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (i: any) => top[i[0].dataIndex].nombre,
              label: (c: any) => ` Ventas: ${fmtQ(c.raw)}`,
              afterLabel: (c: any) => {
                const p = top[c.dataIndex];
                const l = [` Unidades: ${fmtN(p.unidades)} ${p.unidad_medida}`];
                if (p.utilidad !== null) l.push(` Utilidad: ${fmtQ(p.utilidad)}`);
                l.push(` vs periodo previo: ${fmtDelta(p.ingreso_prev ? ((p.ingreso - p.ingreso_prev) / p.ingreso_prev) * 100 : null)}`);
                return l;
              },
            },
          },
        },
        scales: {
          x: { ...ejeY((v: any) => fmtQk(v)), beginAtZero: true },
          y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    };
  });

  // ── Pagos / vendedores (barras Tailwind) ───────────────────────────────────
  pagos = computed(() => {
    const m = this.dist()?.metodos_pago ?? [];
    const total = m.reduce((s, x) => s + x.total, 0) || 1;
    return m.map(x => ({ ...x, pct: (x.total / total) * 100 }));
  });
  vendedores = computed(() => {
    const v = this.dist()?.vendedores ?? [];
    const max = Math.max(...v.map(x => x.total), 1);
    return v.map(x => ({ ...x, pct: (x.total / max) * 100 }));
  });

  // ── Mapa de calor día × hora ───────────────────────────────────────────────
  mapa = computed(() => {
    const celdas = this.dist()?.mapa_calor.celdas ?? [];
    if (!celdas.length) return null;
    const horas = celdas.map(c => c.hora);
    const h0 = Math.max(5, Math.min(7, ...horas)), h1 = Math.min(21, Math.max(18, ...horas));   // al menos 7h–18h
    const cols: number[] = [];
    for (let h = h0; h <= h1; h++) cols.push(h);
    const max = Math.max(...celdas.map(c => c.n), 1);
    const idx = new Map(celdas.map(c => [`${c.dow}-${c.hora}`, c]));
    const filas = [1, 2, 3, 4, 5, 6, 0].map(dow => ({
      dia: DIAS_SEMANA[dow],
      celdas: cols.map(h => {
        const c = idx.get(`${dow}-${h}`);
        const n = c?.n ?? 0;
        return { hora: h, n, total: c?.total ?? 0, alfa: n ? 0.12 + 0.88 * (n / max) : 0 };
      }),
    }));
    const mejor = celdas.reduce((a, b) => (b.n > a.n ? b : a));
    return {
      cols, filas, max,
      mejor: `${DIAS_LARGOS[mejor.dow]} de ${mejor.hora}:00 a ${mejor.hora + 1}:00`,
      dias: this.dist()!.mapa_calor.dias,
    };
  });

  // ── Integridad entre módulos ───────────────────────────────────────────────
  alertasIntegridad = computed(() => (this.integridad()?.checks ?? []).filter(c => c.estado === 'warn'));

  // ── Actividad reciente ─────────────────────────────────────────────────────
  estadoLabel(tipo: string, e: string): string {
    const v: Record<string, string> = { PENDING: 'Pendiente', IN_PROCESS: 'En proceso', FINALIZED: 'Finalizada', CANCEL: 'Cancelada' };
    const c: Record<string, string> = { pendiente: 'Pendiente', aprobada: 'Aprobada', en_transito: 'En tránsito', recibida: 'Recibida', cancelada: 'Cancelada' };
    return (tipo === 'venta' ? v : c)[e] || e;
  }
  estadoClase(e: string): string {
    if (['FINALIZED', 'recibida'].includes(e)) return 'bg-emerald-50 text-emerald-700';
    if (['IN_PROCESS', 'aprobada'].includes(e)) return 'bg-blue-50 text-blue-700';
    if (['PENDING', 'pendiente'].includes(e)) return 'bg-amber-50 text-amber-700';
    if (e === 'en_transito') return 'bg-violet-50 text-violet-700';
    return 'bg-slate-100 text-slate-500';
  }
}
