import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { KpiData } from '../../models';
import { fmtQ, fmtN, fmtDate } from '../../utils/format';

declare const ApexCharts: any;

// ── Interfaces ────────────────────────────────────────────────────────────────
interface KpiComparativo {
  ventas_hoy: number;    ventas_hoy_count: number;    ventas_ayer: number;        ventas_hoy_pct: number;
  ventas_semana: number; ventas_semana_count: number; ventas_semana_ant: number;  ventas_semana_pct: number;
  ventas_mes: number;    ventas_mes_count: number;    ventas_mes_ant: number;     ventas_mes_pct: number;
  ventas_anio: number;   ventas_anio_count: number;   ventas_anio_ant: number;    ventas_anio_pct: number;
  valor_inventario: number; clientes_activos: number; cuentas_por_cobrar: number; stock_critico: number;
}
interface ChartBar  { dia: string; total: number; count: number; label: string; }
interface TopProd   { nombre: string; codigo: string; unidad_medida: string; total_vendido: number; total_monto: number; }
interface Actividad { tipo: string; ref: string; valor: number; estado: string; fecha: string; }

const KPIS_VACIOS: KpiComparativo = {
  ventas_hoy:0, ventas_hoy_count:0, ventas_ayer:0, ventas_hoy_pct:0,
  ventas_semana:0, ventas_semana_count:0, ventas_semana_ant:0, ventas_semana_pct:0,
  ventas_mes:0, ventas_mes_count:0, ventas_mes_ant:0, ventas_mes_pct:0,
  ventas_anio:0, ventas_anio_count:0, ventas_anio_ant:0, ventas_anio_pct:0,
  valor_inventario:0, clientes_activos:0, cuentas_por_cobrar:0, stock_critico:0,
};

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ── Componente ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, KpiCardComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Signals de estado
  kpiData      = signal<KpiComparativo>(KPIS_VACIOS);
  kpis         = signal<KpiData[]>([]);
  chartData    = signal<ChartBar[]>([]);
  topProductos = signal<TopProd[]>([]);
  actividad    = signal<Actividad[]>([]);

  loadingKpis  = signal(true);
  loadingChart = signal(true);
  loadingTop   = signal(true);
  loadingAct   = signal(true);

  // Exponer helpers al template
  fmtQ = fmtQ;
  fmtN = fmtN;
  fmtDate = fmtDate;

  // Referencias a charts para cleanup
  private pieCharts: any[] = [];
  private lineChart: any   = null;

  // ── Helpers públicos usados en el template ────────────────────────────────
  chartTotal(): number {
    return this.chartData().reduce((a, b) => a + b.total, 0);
  }

  estadoLabel(tipo: string, estado: string): string {
    if (tipo === 'venta') {
      const m: Record<string, string> = {
        PENDING: 'Pendiente', IN_PROCESS: 'En Proceso',
        FINALIZED: 'Finalizada', CANCEL: 'Cancelada',
      };
      return m[estado] || estado;
    }
    const m: Record<string, string> = {
      pendiente: 'Pendiente', aprobada: 'Aprobada',
      en_transito: 'En Tránsito', recibida: 'Recibida', cancelada: 'Cancelada',
    };
    return m[estado] || estado;
  }

  estadoColor(tipo: string, estado: string): string {
    if (tipo === 'venta') {
      const m: Record<string, string> = {
        PENDING: 'text-amber-600', IN_PROCESS: 'text-blue-600',
        FINALIZED: 'text-emerald-600', CANCEL: 'text-slate-400',
      };
      return m[estado] || 'text-slate-500';
    }
    const m: Record<string, string> = {
      pendiente: 'text-amber-600', aprobada: 'text-blue-600',
      en_transito: 'text-violet-600', recibida: 'text-emerald-600', cancelada: 'text-slate-400',
    };
    return m[estado] || 'text-slate-500';
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadApexCharts().then(() => {
      this.loadKpis();
      this.loadChart();
      this.loadTop();
      this.loadActividad();
    });
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  refreshAll() {
    this.destroyCharts();
    this.loadKpis();
    this.loadChart();
    this.loadTop();
    this.loadActividad();
  }

  // ── Privados: carga de datos ──────────────────────────────────────────────
  async loadKpis() {
    this.loadingKpis.set(true);
    try {
      const k = await this.api.get<KpiComparativo>('/dashboard/kpis');
      this.kpiData.set(k);
      this.kpis.set([
        {
          label: 'Por Cobrar',
          value: fmtQ(k.cuentas_por_cobrar),
          sub:   `${k.stock_critico} prod. críticos`,
          color: '#ef4444',
        },
        {
          label: 'Clientes',
          value: fmtN(k.clientes_activos),
          sub:   `Inv: ${fmtQ(k.valor_inventario)}`,
          color: '#10b981',
        },
      ]);
      this.loadingKpis.set(false);
      // Renderizar donuts después de que Angular actualice el DOM
      setTimeout(() => this.renderPieCharts(k), 200);
    } catch (e) {
      console.error('loadKpis', e);
      this.loadingKpis.set(false);
    }
  }

  async loadChart() {
    this.loadingChart.set(true);
    try {
      const raw  = await this.api.get<any[]>('/dashboard/ventas-chart');
      const data: ChartBar[] = raw.map(r => ({
        dia:   String(r.dia).substring(0, 10), // garantizar YYYY-MM-DD
        total: parseFloat(r.total) || 0,
        count: parseInt(r.count)  || 0,
        label: '',
      }));
      this.chartData.set(data);
      this.loadingChart.set(false);
      setTimeout(() => this.renderLineChart(data), 200);
    } catch (e) {
      console.error('loadChart', e);
      this.loadingChart.set(false);
    }
  }

  async loadTop() {
    this.loadingTop.set(true);
    try {
      const data = await this.api.get<TopProd[]>('/dashboard/top-productos');
      this.topProductos.set(data.slice(0, 6));
    } catch (e) { console.error('loadTop', e); }
    finally { this.loadingTop.set(false); }
  }

  async loadActividad() {
    this.loadingAct.set(true);
    try {
      const data = await this.api.get<Actividad[]>('/dashboard/actividad');
      this.actividad.set(data);
    } catch (e) { console.error('loadActividad', e); }
    finally { this.loadingAct.set(false); }
  }

  // ── Privados: charts ──────────────────────────────────────────────────────
  private destroyCharts() {
    this.pieCharts.forEach(c => c?.destroy());
    this.lineChart?.destroy();
    this.pieCharts = [];
    this.lineChart = null;
  }

  private loadApexCharts(): Promise<void> {
    return new Promise(resolve => {
      if (typeof ApexCharts !== 'undefined') { resolve(); return; }
      const s  = document.createElement('script');
      s.src    = 'https://cdn.jsdelivr.net/npm/apexcharts';
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  /** Formatea un número para el centro del donut */
  private fmtDonut(v: number): string {
    if (v >= 1_000_000) return `Q${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `Q${(v / 1_000).toFixed(1)}k`;
    return `Q${v.toFixed(0)}`;
  }

  /** Detecta el ancho disponible para ajustar tamaño del donut */
  private donutSize(): number {
    return window.innerWidth < 640 ? 130 : 160;
  }

  private renderPieCharts(k: KpiComparativo) {
    this.pieCharts.forEach(c => c?.destroy());
    this.pieCharts = [];

    const size = this.donutSize();

    const configs = [
      { id: 'pie-hoy',    actual: k.ventas_hoy,    anterior: k.ventas_ayer,       color: '#00C793' },
      { id: 'pie-semana', actual: k.ventas_semana,  anterior: k.ventas_semana_ant, color: '#3b82f6' },
      { id: 'pie-mes',    actual: k.ventas_mes,     anterior: k.ventas_mes_ant,    color: '#8b5cf6' },
      { id: 'pie-anio',   actual: k.ventas_anio,    anterior: k.ventas_anio_ant,   color: '#f59e0b' },
    ];

    configs.forEach(cfg => {
      const el = document.querySelector(`#${cfg.id}`);
      if (!el) return;

      const actual   = cfg.actual   > 0 ? cfg.actual   : 0.01;
      const anterior = cfg.anterior > 0 ? cfg.anterior : 0.01;
      const label    = this.fmtDonut(cfg.actual);

      const chart = new ApexCharts(el, {
        series: [actual, anterior],
        chart: {
          type: 'donut',
          width:  size,
          height: size,
          toolbar: { show: false },
          animations: { enabled: true, speed: 500 },
        },
        labels: ['Actual', 'Anterior'],
        colors: [cfg.color, '#e2e8f0'],
        dataLabels: { enabled: false },
        legend: { show: false },
        stroke: { width: 0 },
        plotOptions: {
          pie: {
            donut: {
              size: '70%',
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize:   '10px',
                  fontFamily: 'inherit',
                  color:      '#94a3b8',
                  offsetY:    -6,
                },
                value: {
                  show:       true,
                  fontSize:   window.innerWidth < 640 ? '13px' : '15px',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  color:      '#1e293b',
                  offsetY:    5,
                  formatter:  () => label,
                },
                total: {
                  show:       true,
                  label:      'Actual',
                  fontSize:   '10px',
                  fontFamily: 'inherit',
                  color:      '#94a3b8',
                  formatter:  () => label,
                },
              },
            },
          },
        },
        tooltip: {
          theme: 'dark',
          y: {
            formatter: (v: number) =>
              `Q ${v === 0.01 ? '0.00' : v.toFixed(2)}`,
          },
        },
        responsive: [
          {
            breakpoint: 640,
            options: {
              chart: { width: 130, height: 130 },
              plotOptions: { pie: { donut: { size: '68%' } } },
            },
          },
        ],
      });

      chart.render();
      this.pieCharts.push(chart);
    });
  }

  private renderLineChart(data: ChartBar[]) {
    this.lineChart?.destroy();
    const el = document.querySelector('#line-chart-30d');
    if (!el || !data.length) return;

    // Etiquetas legibles: "6 Jul", "7 Jul", etc. — parseo manual para evitar TZ issues
    const categories = data.map(d => {
      const p = d.dia.split('-');
      return `${parseInt(p[2])} ${MESES[parseInt(p[1]) - 1]}`;
    });

    const values = data.map(d => +d.total.toFixed(2));
    const isMobile = window.innerWidth < 640;

    this.lineChart = new ApexCharts(el, {
      series: [{ name: 'Ventas', data: values }],
      chart: {
        type:    'area',
        height:  isMobile ? 180 : 240,
        toolbar: { show: false },
        zoom:    { enabled: false },
        fontFamily: 'inherit',
        responsive: [
          { breakpoint: 640, options: { chart: { height: 180 } } },
        ],
      },
      dataLabels: { enabled: false },
      stroke: { lineCap: 'round', curve: 'smooth', width: 2 },
      colors: ['#00C793'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom:    0.3,
          opacityTo:      0.02,
          stops:          [0, 100],
        },
      },
      markers: {
        size:         0,
        hover:        { size: 5 },
        colors:       ['#00C793'],
        strokeColors: '#fff',
        strokeWidth:  2,
        // Solo mostrar puntos donde hay venta
        discrete: data
          .map((d, i) => ({
            seriesIndex:    0,
            dataPointIndex: i,
            fillColor:      '#00C793',
            strokeColor:    '#fff',
            size:           d.total > 0 ? 3 : 0,
          }))
          .filter(p => p.size > 0),
      },
      xaxis: {
        categories,
        axisTicks:  { show: false },
        axisBorder: { show: false },
        labels: {
          rotate: 0,
          style:  { colors: '#94a3b8', fontSize: '10px', fontFamily: 'inherit' },
          // Mostrar cada 5 días en desktop, cada 10 en móvil
          formatter: (_: string, i: number) => {
            const step = isMobile ? 10 : 5;
            return (i % step === 0 || i === data.length - 1) ? categories[i] : '';
          },
        },
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: {
          style: { colors: '#94a3b8', fontSize: '10px', fontFamily: 'inherit' },
          formatter: (v: number) =>
            v === 0
              ? 'Q0'
              : `Q${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}`,
        },
      },
      grid: {
        show:            true,
        borderColor:     '#f1f5f9',
        strokeDashArray: 4,
        xaxis:           { lines: { show: false } },
        padding:         { top: 0, right: 10, bottom: 0, left: 0 },
      },
      tooltip: {
        theme: 'dark',
        x: {
          formatter: (_: any, opts: any) => {
            const idx = opts?.dataPointIndex ?? 0;
            return categories[idx] ?? '';
          },
        },
        y: { formatter: (v: number) => `Q ${v.toFixed(2)}` },
      },
    });

    this.lineChart.render();
  }
}