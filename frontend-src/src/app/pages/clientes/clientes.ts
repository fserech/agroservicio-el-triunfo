import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { BadgeComponent, tipoClienteVariant, tipoClienteLabel } from '../../components/shared/badge/badge';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ActionButtonsComponent } from '../../components/shared/action-buttons/action-buttons';
import { EliminarDialogComponent } from '../../components/shared/eliminar-dialog/eliminar-dialog';
import { AuthService } from '../../services/auth';
import { Cliente, KpiData } from '../../models';
import { fmtQ } from '../../utils/format';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KpiCardComponent, BadgeComponent, PaginationComponent, EmptyStateComponent, ActionButtonsComponent, EliminarDialogComponent],
  templateUrl: './clientes.html',
})
export class ClientesComponent implements OnInit {
  clientes = signal<Cliente[]>([]);
  kpis     = signal<KpiData[]>([]);
  loading  = signal(true);
  total    = signal(0);
  page     = signal(1);
  limit    = 15;
  buscar   = '';
  tipo     = '';

  fmtQ        = fmtQ;
  botones(c: Cliente): any[] {
    const b: any[] = [{ label: 'Editar', type: 'edit', icon: 'edit', routerLink: ['/clientes', c.id, 'editar'] }];
    if (this.puedeEliminar) b.push({ label: 'Eliminar', type: 'delete', icon: 'delete' });
    return b;
  }
  onAction(type: string, c: Cliente) { if (type === 'delete') this.pedirEliminar(c.id, c.nombre); }
  tipoVariant = tipoClienteVariant;
  tipoLabel   = tipoClienteLabel;

  eliminando = signal<{ endpoint: string; nombre: string } | null>(null);
  get puedeEliminar() { return ['admin', 'supervisor'].includes(this.auth.user()?.rol || ''); }

  constructor(private api: ApiService, private toast: ToastService, private auth: AuthService) {}

  pedirEliminar(id: number, nombre: string) { this.eliminando.set({ endpoint: `/clientes/${id}`, nombre }); }
  async alEliminar(r: 'eliminado' | 'desactivado') {
    const n = this.eliminando()?.nombre;
    this.eliminando.set(null);
    this.toast.success(r === 'eliminado' ? `"${n}" eliminado` : `"${n}" desactivado (se conserva su historial)`);
    await this.load(this.page());
  }
  ngOnInit() { this.load(1); }

  async load(p: number) {
    this.page.set(p); this.loading.set(true);
    try {
      let q = `/clientes?page=${p}&limit=${this.limit}`;
      if (this.buscar) q += `&buscar=${encodeURIComponent(this.buscar)}`;
      if (this.tipo)   q += `&tipo=${this.tipo}`;
      const data = await this.api.get<any>(q);
      this.clientes.set(data.data);
      this.total.set(data.total);
      // Totales calculados por el servidor sobre TODOS los clientes (no solo la página visible)
      const r = data.resumen || { facturado: 0, por_cobrar: 0, con_credito: 0 };
      const tot = r.facturado, saldo = r.por_cobrar, cc = r.con_credito;
      this.kpis.set([
        { label: 'Total Clientes', value: data.total,    color: '#00C793' },
        { label: 'Facturado',      value: fmtQ(tot),     color: '#3887BF' },
        { label: 'Por Cobrar',     value: fmtQ(saldo),   color: '#ef4444' },
        { label: 'Con Crédito',    value: cc,             color: '#f59e0b' },
      ]);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.loading.set(false); }
  }
}
