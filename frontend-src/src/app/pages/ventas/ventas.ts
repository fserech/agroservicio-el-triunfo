import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { BadgeComponent, estadoVentaVariant, estadoVentaLabel } from '../../components/shared/badge/badge';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ConfirmModalComponent } from '../../components/shared/confirm-modal/confirm-modal';
import { ActionButtonsComponent, ActionButton } from '../../components/shared/action-buttons/action-buttons';
import { Venta, KpiData } from '../../models';
import { fmtQ, fmtDate } from '../../utils/format';

const PAGO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', credito: 'Crédito',
  transferencia: 'Transf.', cheque: 'Cheque'
};

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KpiCardComponent, BadgeComponent, PaginationComponent, EmptyStateComponent, ConfirmModalComponent, ActionButtonsComponent],
  templateUrl: './ventas.html',
})
export class VentasComponent implements OnInit {
  ventas   = signal<Venta[]>([]);
  kpis     = signal<KpiData[]>([]);
  loading  = signal(true);
  total    = signal(0);
  page     = signal(1);
  limit    = 15;
  buscar   = ''; estado = ''; desde = ''; hasta = '';
  modalVisible = signal(false);
  accion: 'finalizar' | 'cancelar' = 'finalizar';
  selectedVenta: Venta | null = null;

  get modalTitle() { return this.accion === 'finalizar' ? '¿Finalizar venta?' : '¿Cancelar venta?'; }
  get modalMsg()   { return this.accion === 'finalizar' ? 'Se actualizará el inventario.' : 'Esta acción no se puede deshacer.'; }

  fmtQ = fmtQ; fmtDate = fmtDate;
  estadoVariant = estadoVentaVariant;
  estadoLabel   = estadoVentaLabel;
  pagoLabel(p: string) { return PAGO_LABELS[p] || p; }

  ventaButtons(v: Venta): ActionButton[] {
    const btns: ActionButton[] = [];
    if (v.estado === 'PENDING' || v.estado === 'IN_PROCESS') {
      btns.push({ label: 'Finalizar', type: 'approve', icon: 'approve' });
      btns.push({ label: 'Cancelar',  type: 'cancel',  icon: 'cancel'  });
    }
    return btns;
  }

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(1); }

  async load(p: number) {
    this.page.set(p); this.loading.set(true);
    try {
      let q = `/ventas?page=${p}&limit=${this.limit}`;
      if (this.estado) q += `&estado=${this.estado}`;
      if (this.desde)  q += `&desde=${this.desde}`;
      if (this.hasta)  q += `&hasta=${this.hasta}`;
      const data = await this.api.get<any>(q);
      this.ventas.set(data.data); this.total.set(data.total);
      const tot  = data.data.reduce((a: number, v: Venta) => a + +v.total, 0);
      const fin  = data.data.filter((v: Venta) => v.estado === 'FINALIZED').length;
      const proc = data.data.filter((v: Venta) => v.estado === 'IN_PROCESS' || v.estado === 'PENDING').length;
      this.kpis.set([
        { label: 'Monto Total',   value: fmtQ(tot),   color: '#00C793' },
        { label: 'Registros',     value: data.total,  color: '#3887BF' },
        { label: 'En Proceso',    value: proc,        color: '#f59e0b' },
        { label: 'Finalizadas',   value: fin,         color: '#10b981' },
      ]);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.loading.set(false); }
  }

  onVentaAction(type: string, v: Venta) {
    this.selectedVenta = v;
    this.accion = type === 'approve' ? 'finalizar' : 'cancelar';
    this.modalVisible.set(true);
  }

  async ejecutarAccion() {
    if (!this.selectedVenta) return;
    this.modalVisible.set(false);
    try {
      const estado = this.accion === 'finalizar' ? 'FINALIZED' : 'CANCEL';
      await this.api.patch(`/ventas/${this.selectedVenta.id}/estado`, { estado });
      this.toast.success(this.accion === 'finalizar' ? 'Venta finalizada' : 'Venta cancelada');
      this.load(this.page());
    } catch(e: any) { this.toast.error(e.message); }
  }
}
