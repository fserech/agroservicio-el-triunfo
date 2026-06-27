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
import { Cliente, KpiData } from '../../models';
import { fmtQ } from '../../utils/format';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KpiCardComponent, BadgeComponent, PaginationComponent, EmptyStateComponent, ActionButtonsComponent],
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
  tipoVariant = tipoClienteVariant;
  tipoLabel   = tipoClienteLabel;

  constructor(private api: ApiService, private toast: ToastService) {}
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
      const tot   = data.data.reduce((a: number, c: Cliente) => a + +(c.total_compras || 0), 0);
      const saldo = data.data.reduce((a: number, c: Cliente) => a + +(c.saldo_pendiente || 0), 0);
      const cc    = data.data.filter((c: Cliente) => +(c.credito_maximo || 0) > 0).length;
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
