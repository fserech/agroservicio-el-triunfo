import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matAddOutline, matRemoveRedEyeOutline, matReceiptOutline,
  matSearchOutline, matArrowDownwardOutline, matArrowUpwardOutline
} from '@ng-icons/material-icons/outline';
import {
  bootstrapCheckCircleFill, bootstrapXCircle,
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import { VentasService, ToastService } from '../../../core/services/services';
import { Venta, VentaEstado, VentasPagedResponse } from '../../../core/models/models';

@Component({
  selector: 'app-ventas-list', standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [provideIcons({
    matAddOutline, matRemoveRedEyeOutline, matReceiptOutline, matSearchOutline,
    matArrowDownwardOutline, matArrowUpwardOutline,
    bootstrapCheckCircleFill, bootstrapXCircle,
    bootstrapChevronLeft, bootstrapChevronRight,
    bootstrapChevronBarLeft, bootstrapChevronBarRight
  })],
  templateUrl: './ventas-list.component.html', styleUrls: ['./ventas-list.component.scss']
})
export class VentasListComponent implements OnInit {
  private svc    = inject(VentasService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items: Venta[] = []; load = false;
  estadoFilter = ''; desde = ''; hasta = '';
  sortConfig = { sortBy: 'fecha', sortOrder: 'desc' };
  page = 1; limit = 15; totalItems = 0;

  // Suma total filtrada que devuelve el backend (excluye CANCEL, abarca todos los registros no solo la página)
  montoTotal = 0;

  get totalPages()  { return Math.max(1, Math.ceil(this.totalItems / this.limit)); }
  get startIndex()  { return (this.page - 1) * this.limit + 1; }
  get endIndex()    { return Math.min(this.page * this.limit, this.totalItems); }
  get totalVentas() { return this.montoTotal; }
  get pendientes()  { return this.items.filter(v => v.estado === 'PENDING' || v.estado === 'IN_PROCESS').length; }
  get finalizadas() { return this.items.filter(v => v.estado === 'FINALIZED').length; }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    const f: any = { page: this.page, limit: this.limit };
    if (this.estadoFilter) f.estado = this.estadoFilter;
    if (this.desde) f.desde = this.desde;
    if (this.hasta) f.hasta = this.hasta;
    this.svc.getAll(f).subscribe({
      next: (r: any) => {
        // PostgreSQL devuelve campos numéricos como strings — casteamos a number
        this.items = r.data.map((v: Venta) => ({
          ...v,
          total:     Number(v.total)     || 0,
          subtotal:  Number(v.subtotal)  || 0,
          iva:       Number(v.iva)       || 0,
          descuento: Number(v.descuento) || 0,
        }));
        this.totalItems = r.total;
        this.montoTotal = Number(r.monto_total) || 0;
        this.load = false;
      },
      error: () => { this.load = false; this.toast.error('Error cargando ventas'); }
    });
  }

  changeSortOrderBy(field: string): void {
    if (this.sortConfig.sortBy === field) { this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc'; }
    else { this.sortConfig.sortBy = field; this.sortConfig.sortOrder = 'asc'; }
    this.items = [...this.items].sort((a: any, b: any) => {
      const cmp = (a[field]??'') > (b[field]??'') ? 1 : (a[field]??'') < (b[field]??'') ? -1 : 0;
      return this.sortConfig.sortOrder === 'asc' ? cmp : -cmp;
    });
  }

  getEstadoLabel(e: VentaEstado): string {
    return ({PENDING:'Pendiente',IN_PROCESS:'En Proceso',FINALIZED:'Finalizada',CANCEL:'Cancelada'} as any)[e] || e;
  }
  getMetodoLabel(m: string): string {
    return ({efectivo:'Efectivo',tarjeta:'Tarjeta',credito:'Crédito',transferencia:'Transferencia',cheque:'Cheque'} as any)[m] || m;
  }

  add():            void { this.router.navigate(['/ventas/nuevo']); }
  view(id: number): void { this.router.navigate(['/ventas', id]); }

  finalizar(id: number): void {
    if (!confirm('¿Finalizar esta venta?')) return;
    this.svc.finalizar(id).subscribe({
      next: () => { this.toast.success('Venta finalizada'); this.loadData(); },
      error: e => this.toast.error(e?.error?.error || 'Error')
    });
  }
  cancelar(id: number): void {
    if (!confirm('¿Cancelar esta venta?')) return;
    this.svc.cancelar(id).subscribe({
      next: () => { this.toast.success('Venta cancelada'); this.loadData(); },
      error: e => this.toast.error(e?.error?.error || 'Error')
    });
  }

  firstPage():    void { this.page = 1; this.loadData(); }
  lastPage():     void { this.page = this.totalPages; this.loadData(); }
  nextPage():     void { if (this.page < this.totalPages) { this.page++; this.loadData(); } }
  previousPage(): void { if (this.page > 1) { this.page--; this.loadData(); } }
}