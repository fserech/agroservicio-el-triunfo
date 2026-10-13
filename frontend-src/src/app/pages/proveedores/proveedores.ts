import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { BadgeComponent } from '../../components/shared/badge/badge';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ActionButtonsComponent } from '../../components/shared/action-buttons/action-buttons';
import { EliminarDialogComponent } from '../../components/shared/eliminar-dialog/eliminar-dialog';
import { AuthService } from '../../services/auth';
import { Proveedor, KpiData } from '../../models';
import { fmtQ } from '../../utils/format';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KpiCardComponent, BadgeComponent, PaginationComponent, EmptyStateComponent, ActionButtonsComponent, EliminarDialogComponent],
  templateUrl: './proveedores.html',
})
export class ProveedoresComponent implements OnInit {
  allProveedores = signal<Proveedor[]>([]);
  kpis    = signal<KpiData[]>([]);
  loading = signal(true);
  total   = signal(0);
  page    = signal(1);
  limit   = 15;
  buscar  = '';
  fmtQ    = fmtQ;
  botones(p: Proveedor): any[] {
    const b: any[] = [
      { label: 'Editar',       type: 'edit',    icon: 'edit',    routerLink: ['/proveedores', p.id, 'editar'] },
      { label: 'Nueva Compra', type: 'receive', icon: 'receive', routerLink: ['/compras/nueva'] },
    ];
    if (this.puedeEliminar) b.push({ label: 'Eliminar', type: 'delete', icon: 'delete' });
    return b;
  }
  onAction(type: string, p: Proveedor) { if (type === 'delete') this.pedirEliminar(p.id, p.nombre); }

  get pageItems() {
    return () => {
      const p = this.page(), l = this.limit;
      return this.allProveedores().slice((p - 1) * l, p * l);
    };
  }

  eliminando = signal<{ endpoint: string; nombre: string } | null>(null);
  get puedeEliminar() { return ['admin', 'supervisor'].includes(this.auth.user()?.rol || ''); }

  constructor(private api: ApiService, private toast: ToastService, private auth: AuthService) {}

  pedirEliminar(id: number, nombre: string) { this.eliminando.set({ endpoint: `/proveedores/${id}`, nombre }); }
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
      let q = '/proveedores';
      if (this.buscar) q += `?buscar=${encodeURIComponent(this.buscar)}`;
      const data = await this.api.get<Proveedor[]>(q);
      this.allProveedores.set(data);
      this.total.set(data.length);
      const comprasTotal = data.reduce((a, p) => a + +(p.compras_totales || 0), 0);
      const conCred      = data.filter(p => +(p.plazo_credito || 0) > 0).length;
      this.kpis.set([
        { label: 'Proveedores',   value: data.length,      color: '#00C793' },
        { label: 'Compras Total', value: fmtQ(comprasTotal), color: '#3887BF' },
        { label: 'Con Crédito',   value: conCred,          color: '#f59e0b' },
      ]);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.loading.set(false); }
  }

  goPage(p: number) { this.page.set(p); }
}
