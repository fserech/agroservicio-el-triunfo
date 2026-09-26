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
import { Proveedor, KpiData } from '../../models';
import { fmtQ } from '../../utils/format';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KpiCardComponent, BadgeComponent, PaginationComponent, EmptyStateComponent, ActionButtonsComponent],
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

  get pageItems() {
    return () => {
      const p = this.page(), l = this.limit;
      return this.allProveedores().slice((p - 1) * l, p * l);
    };
  }

  constructor(private api: ApiService, private toast: ToastService) {}
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
