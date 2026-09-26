import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { KpiData } from '../../models';
import { fmtQ, fmtN, fmtDate } from '../../utils/format';

interface ChartBar { dia: string; total: number; count: number; pct: number; label: string; }
interface TopProducto { nombre: string; codigo: string; unidad_medida: string; total_vendido: number; total_monto: number; }
interface Actividad { tipo: string; ref: string; valor: number; estado: string; fecha: string; }

const DIAS_CORTOS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, KpiCardComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  kpis         = signal<KpiData[]>([]);
  chartData    = signal<ChartBar[]>([]);
  topProductos = signal<TopProducto[]>([]);
  actividad    = signal<Actividad[]>([]);
  loadingKpis  = signal(true);
  loadingChart = signal(true);
  loadingTop   = signal(true);
  loadingAct   = signal(true);

  fmtQ = fmtQ; fmtN = fmtN; fmtDate = fmtDate;

  // Máximo valor de la gráfica para calcular alturas
  chartMax = 1;

  estadoLabel(tipo: string, estado: string): string {
    if (tipo === 'venta') {
      const m: Record<string,string> = { PENDING:'Pendiente', IN_PROCESS:'En Proceso', FINALIZED:'Finalizada', CANCEL:'Cancelada' };
      return m[estado] || estado;
    }
    const m: Record<string,string> = { pendiente:'Pendiente', aprobada:'Aprobada', en_transito:'En Tránsito', recibida:'Recibida', cancelada:'Cancelada' };
    return m[estado] || estado;
  }

  estadoColor(tipo: string, estado: string): string {
    if (tipo === 'venta') {
      const m: Record<string,string> = { PENDING:'text-amber-600', IN_PROCESS:'text-blue-600', FINALIZED:'text-emerald-600', CANCEL:'text-slate-400' };
      return m[estado] || 'text-slate-500';
    }
    const m: Record<string,string> = { pendiente:'text-amber-600', aprobada:'text-blue-600', en_transito:'text-violet-600', recibida:'text-emerald-600', cancelada:'text-slate-400' };
    return m[estado] || 'text-slate-500';
  }

  constructor(private api: ApiService) {}

  async ngOnInit() {
    this.loadKpis();
    this.loadChart();
    this.loadTop();
    this.loadActividad();
  }

  async loadKpis() {
    this.loadingKpis.set(true);
    try {
      const k = await this.api.get<any>('/dashboard/kpis');
      this.kpis.set([
        { label: 'Ventas Hoy',    value: fmtQ(k.ventas_hoy),         sub: `${k.ventas_hoy_count} transacciones`,   color: '#00C793' },
        { label: 'Ventas Mes',    value: fmtQ(k.ventas_mes),         sub: `${k.ventas_mes_count} transacciones`,   color: '#3887BF' },
        { label: 'Por Cobrar',    value: fmtQ(k.cuentas_por_cobrar), sub: `${k.stock_critico} prod. críticos`,     color: '#ef4444' },
        { label: 'Clientes',      value: fmtN(k.clientes_activos),   sub: `Inv: ${fmtQ(k.valor_inventario)}`,      color: '#10b981' },
      ]);
    } catch(e) { console.error(e); }
    finally { this.loadingKpis.set(false); }
  }

  async loadChart() {
    this.loadingChart.set(true);
    try {
      const data = await this.api.get<any[]>('/dashboard/ventas-chart');
      if (!data.length) return;
      const max = Math.max(...data.map(r => parseFloat(r.total) || 0), 1);
      this.chartMax = max;
      this.chartData.set(data.map(r => {
        const fecha = new Date(r.dia + 'T00:00:00'); // Avoid timezone shift on date-only strings
        return {
          dia:   r.dia,
          total: parseFloat(r.total) || 0,
          count: parseInt(r.count)   || 0,
          pct:   Math.max(2, ((parseFloat(r.total) || 0) / max) * 100),
          label: DIAS_CORTOS[fecha.getDay()],
        };
      }));
    } catch(e) { console.error(e); }
    finally { this.loadingChart.set(false); }
  }

  async loadTop() {
    this.loadingTop.set(true);
    try {
      const data = await this.api.get<TopProducto[]>('/dashboard/top-productos');
      this.topProductos.set(data.slice(0, 6));
    } catch(e) { console.error(e); }
    finally { this.loadingTop.set(false); }
  }

  async loadActividad() {
    this.loadingAct.set(true);
    try {
      const data = await this.api.get<Actividad[]>('/dashboard/actividad');
      this.actividad.set(data);
    } catch(e) { console.error(e); }
    finally { this.loadingAct.set(false); }
  }

  chartTotal(): number {
    return this.chartData().reduce((a, b) => a + b.total, 0);
  }

  // Agrupar los últimos 30 días en semanas para la leyenda
  chartWeeks(): string[] {
    const data = this.chartData();
    if (!data.length) return [];
    // Mostrar solo lunes como etiqueta de semana
    return data.map((d, i) => d.label === 'Lun' || i === 0 || i === data.length - 1 ? d.label : '');
  }

  refreshAll() {
    this.loadKpis();
    this.loadChart();
    this.loadTop();
    this.loadActividad();
  }
}
