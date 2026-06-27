import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { BadgeComponent, estadoCompraVariant, estadoCompraLabel } from '../../components/shared/badge/badge';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ConfirmModalComponent } from '../../components/shared/confirm-modal/confirm-modal';
import { ActionButtonsComponent, ActionButton } from '../../components/shared/action-buttons/action-buttons';
import { Compra, KpiData } from '../../models';
import { fmtQ, fmtDate } from '../../utils/format';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KpiCardComponent, BadgeComponent, PaginationComponent, EmptyStateComponent, ConfirmModalComponent, ActionButtonsComponent],
  templateUrl: './compras.html',
})
export class ComprasComponent implements OnInit {
  compras  = signal<Compra[]>([]);
  kpis     = signal<KpiData[]>([]);
  loading  = signal(true);
  total    = signal(0);
  page     = signal(1);
  limit    = 15;
  estado   = '';
  modalVisible = signal(false);
  accion: 'aprobar' | 'cancelar' | 'recibir' = 'aprobar';
  selectedCompra: Compra | null = null;

  get modalTitle()   { return { aprobar: '¿Aprobar orden?', cancelar: '¿Cancelar orden?', recibir: '¿Confirmar recepción?' }[this.accion]; }
  get modalMsg()     { return { aprobar: 'La orden pasará a estado Aprobada.', cancelar: 'Esta acción no se puede deshacer.', recibir: 'Se actualizará el inventario automáticamente.' }[this.accion]; }
  get confirmLabel() { return { aprobar: 'Aprobar', cancelar: 'Cancelar Orden', recibir: 'Confirmar Recepción' }[this.accion]; }

  fmtQ = fmtQ; fmtDate = fmtDate;
  estadoVariant = estadoCompraVariant; estadoLabel = estadoCompraLabel;

  compraButtons(c: Compra): ActionButton[] {
    const btns: ActionButton[] = [];
    if (c.estado === 'pendiente') {
      btns.push({ label: 'Aprobar',  type: 'approve', icon: 'approve' });
      btns.push({ label: 'Cancelar', type: 'cancel',  icon: 'cancel'  });
    }
    if (c.estado === 'aprobada' || c.estado === 'en_transito') {
      btns.push({ label: 'Recibir', type: 'receive', icon: 'receive' });
    }
    return btns;
  }

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(1); }

  async load(p: number) {
    this.page.set(p); this.loading.set(true);
    try {
      let q = `/compras?page=${p}&limit=${this.limit}`;
      if (this.estado) q += `&estado=${this.estado}`;
      const data = await this.api.get<any>(q);
      this.compras.set(data.data); this.total.set(data.total);
      const pend   = data.data.filter((c: Compra) => c.estado === 'pendiente').length;
      const trans  = data.data.filter((c: Compra) => c.estado === 'en_transito' || c.estado === 'aprobada').length;
      const montoT = data.data.reduce((a: number, c: Compra) => a + +c.total, 0);
      this.kpis.set([
        { label: 'Órdenes',     value: data.total,    color: '#00C793' },
        { label: 'Pendientes',  value: pend,          color: '#f59e0b' },
        { label: 'En Proceso',  value: trans,         color: '#3887BF' },
        { label: 'Monto Total', value: fmtQ(montoT),  color: '#10b981' },
      ]);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.loading.set(false); }
  }

  onCompraAction(type: string, c: Compra) {
    this.selectedCompra = c;
    this.accion = type === 'approve' ? 'aprobar' : type === 'cancel' ? 'cancelar' : 'recibir';
    this.modalVisible.set(true);
  }

  async ejecutarAccion() {
    if (!this.selectedCompra) return;
    this.modalVisible.set(false);
    try {
      if (this.accion === 'recibir') {
        await this.api.patch(`/compras/${this.selectedCompra.id}/recibir`, {});
        this.toast.success('Orden recibida — inventario actualizado');
      } else {
        const estado = this.accion === 'aprobar' ? 'aprobada' : 'cancelada';
        await this.api.patch(`/compras/${this.selectedCompra.id}/estado`, { estado });
        this.toast.success(this.accion === 'aprobar' ? 'Orden aprobada' : 'Orden cancelada');
      }
      this.load(this.page());
    } catch(e: any) { this.toast.error(e.message); }
  }
}
