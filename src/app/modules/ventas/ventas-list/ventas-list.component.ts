import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matAddOutline, matSearchOutline, matShoppingBagOutline,
  matRemoveRedEyeOutline, matModeEditOutline, matReceiptLongOutline,
  matArrowDownwardOutline, matArrowUpwardOutline, matRefreshOutline,
  matPrintOutline
} from '@ng-icons/material-icons/outline';
import {
  bootstrapCheckCircleFill, bootstrapXCircle,
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import { VentasService, ToastService } from '../../../core/services/services';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { Venta, VentaEstado, SortConfig } from '../../../core/models/models';

type TimeTab = 'day' | 'week' | 'month';

@Component({
  selector: 'app-ventas-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    NgIconComponent, DecimalPipe, DatePipe,
    HeaderComponent
  ],
  providers: [provideIcons({
    matAddOutline, matSearchOutline, matShoppingBagOutline,
    matRemoveRedEyeOutline, matModeEditOutline, matReceiptLongOutline,
    matArrowDownwardOutline, matArrowUpwardOutline, matRefreshOutline,
    matPrintOutline,
    bootstrapCheckCircleFill, bootstrapXCircle,
    bootstrapChevronLeft, bootstrapChevronRight,
    bootstrapChevronBarLeft, bootstrapChevronBarRight
  })],
  templateUrl: './ventas-list.component.html',
  styleUrls: ['./ventas-list.component.scss']
})
export class VentasListComponent implements OnInit {
  private svc    = inject(VentasService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  private fb     = inject(FormBuilder);
  private toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

  form!: FormGroup;
  ItemsList: Venta[] = [];
  load        = false;

  activeTimeTab: TimeTab = 'week';
  activeStatus: VentaEstado | 'all' = 'all';
  searchText  = '';
  fechaFiltro = '';

  sortConfig: SortConfig = { sortBy: 'fecha', sortOrder: 'desc' };

  page = 1; limit = 10;
  totalItems = 0; totalMonto = 0;

  get totalPages() { return Math.max(1, Math.ceil(this.totalItems / this.limit)); }
  get startIndex() { return (this.page - 1) * this.limit + 1; }
  get endIndex()   { return Math.min(this.page * this.limit, this.totalItems); }

  minDate = '2020-01-01';
  maxDate = new Date().toISOString().split('T')[0];

  ngOnInit(): void {
    this.form = this.fb.group({ dateCreated: [''] });
    this.initPage();
  }

  initPage(): void { this.page = 1; this.loadData(); }

  loadData(): void {
    this.load = true;
    this.svc.getAll(this.buildFiltros()).subscribe({
      next: res => {
        this.ItemsList  = res.data;
        this.totalItems = res.total;
        this.totalMonto = (res as any).monto_total || 0;
        this.load = false;
      },
      error: () => { this.load = false; this.toast.error('Error al cargar las ventas'); }
    });
  }

  buildFiltros() {
  const hoy = new Date();
  let desde: string | undefined, hasta: string | undefined;

  if (this.fechaFiltro) {
    desde = hasta = this.fechaFiltro;
  } else if (this.activeTimeTab === 'day') {
    desde = hasta = this.toLocalDateString(hoy);
  } else if (this.activeTimeTab === 'week') {
    const lun = new Date(hoy);
    lun.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    desde = this.toLocalDateString(lun);
    hasta = this.toLocalDateString(hoy);
  } else {
    desde = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`;
    hasta = this.toLocalDateString(hoy);
  }

  return {
    desde, hasta,
    ...(this.activeStatus !== 'all' ? { estado: this.activeStatus } : {}),
    page: this.page, limit: this.limit
  };
}

  setActiveTimeTab(t: TimeTab): void { this.activeTimeTab = t; this.fechaFiltro = ''; this.initPage(); }
  setStatus(s: VentaEstado | 'all'): void { this.activeStatus = s; this.initPage(); }
  onSearch(): void { if (this.searchText.length >= 2 || !this.searchText) this.initPage(); }
  buscarPorFecha(): void { this.initPage(); }
  clearFecha(): void { this.fechaFiltro = ''; this.initPage(); }

  changeSortOrderBy(field: string): void {
    this.sortConfig.sortOrder = this.sortConfig.sortBy === field
      ? (this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
    this.sortConfig.sortBy = field;
    this.loadData();
  }

  add():            void { this.router.navigate(['/ventas/nuevo']); }
  view(id: number): void { this.router.navigate(['/ventas', id]); }
  edit(id: number): void { this.router.navigate(['/ventas', id, 'editar']); }

  finalizedOrder(id: number): void {
    if (!confirm('¿Finalizar esta venta?')) return;
    this.svc.finalizar(id).subscribe({
      next: () => { this.toast.success('Venta finalizada exitosamente'); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error al finalizar venta')
    });
  }

  cancelOrder(id: number): void {
    if (!confirm('¿Cancelar esta venta? Se revertirá el stock.')) return;
    this.svc.cancelar(id).subscribe({
      next: () => { this.toast.success('Venta cancelada'); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error al cancelar venta')
    });
  }

  // ── Impresión — navega al detalle donde está el modal de impresión ────────
  printReceipt(id: number): void {
    this.router.navigate(['/ventas', id]);
  }


  getStatusLabel(s: string): string {
    return { PENDING: 'Pendiente', IN_PROCESS: 'En Proceso', FINALIZED: 'Finalizada', CANCEL: 'Cancelada' }[s] || s;
  }

  countByStatus(s: VentaEstado): number { return this.ItemsList.filter(v => v.estado === s).length; }

  firstPage():    void { this.page = 1;               this.loadData(); }
  lastPage():     void { this.page = this.totalPages; this.loadData(); }
  nextPage():     void { if (this.page < this.totalPages) { this.page++; this.loadData(); } }
  previousPage(): void { if (this.page > 1)               { this.page--; this.loadData(); } }
}