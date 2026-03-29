// compras-list.component.ts — con tabs de tiempo y estado igual a ventas
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matAddOutline, matRemoveRedEyeOutline, matShoppingCartOutline,
  matThumbUpOutline, matArrowDownwardOutline, matArrowUpwardOutline,
  matSearchOutline, matRefreshOutline
} from '@ng-icons/material-icons/outline';
import {
  bootstrapCheckCircleFill, bootstrapXCircle,
  bootstrapChevronBarLeft, bootstrapChevronBarRight,
  bootstrapChevronLeft, bootstrapChevronRight
} from '@ng-icons/bootstrap-icons';
import { ComprasService, ToastService } from '../../../core/services/services';
import { OrdenCompra, SortConfig } from '../../../core/models/models';

type TimeTab    = 'day' | 'week' | 'month';
type EstadoTab  = 'all' | 'pendiente' | 'aprobada' | 'en_transito' | 'recibida' | 'cancelada';

@Component({
  selector: 'app-compras-list',
  standalone: true,
  imports: [
    HeaderComponent, CommonModule, FormsModule, ReactiveFormsModule,
    NgIconComponent, DecimalPipe, DatePipe
  ],
  providers: [provideIcons({
    matAddOutline, matRemoveRedEyeOutline, matShoppingCartOutline,
    matThumbUpOutline, matArrowDownwardOutline, matArrowUpwardOutline,
    matSearchOutline, matRefreshOutline,
    bootstrapCheckCircleFill, bootstrapXCircle,
    bootstrapChevronBarLeft, bootstrapChevronBarRight,
    bootstrapChevronLeft, bootstrapChevronRight
  })],
  templateUrl: './compras-list.component.html',
  styleUrls: ['./compras-list.component.scss']
})
export class ComprasListComponent implements OnInit {
  private svc    = inject(ComprasService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items: OrdenCompra[] = [];
  load = false;

  // — Tabs de tiempo (igual a ventas) —
  activeTimeTab: TimeTab   = 'week';
  activeStatus:  EstadoTab = 'all';

  // — Búsqueda y fecha —
  searchText  = '';
  fechaFiltro = '';
  minDate     = '2020-01-01';
  maxDate     = new Date().toISOString().split('T')[0];

  // — Ordenamiento —
  sortConfig: SortConfig = { sortBy: 'fecha', sortOrder: 'desc' };

  // — Paginación —
  page  = 1;
  limit = 10;
  totalItems = 0;

  get totalPages()  { return Math.max(1, Math.ceil(this.totalItems / this.limit)); }
  get startIndex()  { return (this.page - 1) * this.limit + 1; }
  get endIndex()    { return Math.min(this.page * this.limit, this.totalItems); }
  get montoTotal()  { return this.items.reduce((a, o) => a + (o.total || 0), 0); }

  countByStatus(e: string): number {
    return this.items.filter(o => o.estado === e).length;
  }

  ngOnInit(): void { this.initPage(); }

  initPage(): void { this.page = 1; this.loadData(); }

  loadData(): void {
    this.load = true;
    const estado = this.activeStatus !== 'all' ? this.activeStatus : '';
    this.svc.getAll(estado).subscribe({
      next: r => {
        // Filtrar por período de tiempo
        let filtered = this.filterByTime(r);
        // Filtrar por texto si hay búsqueda
        if (this.searchText.trim()) {
          const t = this.searchText.toLowerCase();
          filtered = filtered.filter(o =>
            o.numero_orden?.toLowerCase().includes(t) ||
            o.prov_nombre?.toLowerCase().includes(t)
          );
        }
        // Ordenar
        filtered = this.sortItems(filtered);
        this.totalItems = filtered.length;
        // Paginar localmente
        const start = (this.page - 1) * this.limit;
        this.items = filtered.slice(start, start + this.limit);
        this.load  = false;
      },
      error: () => { this.load = false; this.toast.error('Error cargando órdenes'); }
    });
  }

  // Filtra el array según el tab de tiempo activo o la fecha manual
  private filterByTime(list: OrdenCompra[]): OrdenCompra[] {
    if (this.fechaFiltro) {
      return list.filter(o => o.fecha?.startsWith(this.fechaFiltro));
    }
    const hoy   = new Date();
    const today = this.toLocalDate(hoy);

    if (this.activeTimeTab === 'day') {
      return list.filter(o => o.fecha?.startsWith(today));
    }
    if (this.activeTimeTab === 'week') {
      const lun = new Date(hoy);
      lun.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
      const desde = this.toLocalDate(lun);
      return list.filter(o => o.fecha >= desde && o.fecha <= today);
    }
    // mes
    const inicio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
    return list.filter(o => o.fecha >= inicio && o.fecha <= today);
  }

  private sortItems(list: OrdenCompra[]): OrdenCompra[] {
    return [...list].sort((a: any, b: any) => {
      const va = a[this.sortConfig.sortBy] ?? '';
      const vb = b[this.sortConfig.sortBy] ?? '';
      const cmp = va > vb ? 1 : va < vb ? -1 : 0;
      return this.sortConfig.sortOrder === 'asc' ? cmp : -cmp;
    });
  }

  private toLocalDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // — Tabs —
  setActiveTimeTab(t: TimeTab): void {
    this.activeTimeTab = t;
    this.fechaFiltro   = '';
    this.initPage();
  }

  setStatus(s: EstadoTab): void {
    this.activeStatus = s;
    this.initPage();
  }

  // — Búsqueda —
  onSearch(): void {
    if (this.searchText.length >= 2 || !this.searchText) this.initPage();
  }

  buscarPorFecha(): void { this.initPage(); }

  clearFecha(): void { this.fechaFiltro = ''; this.initPage(); }

  // — Ordenamiento —
  changeSortOrderBy(field: string): void {
    if (this.sortConfig.sortBy === field) {
      this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.sortBy    = field;
      this.sortConfig.sortOrder = 'asc';
    }
    this.loadData();
  }

  // — Labels —
  getEstadoLabel(e: string): string {
    return {
      pendiente:   'Pendiente',
      aprobada:    'Aprobada',
      en_transito: 'En Tránsito',
      recibida:    'Recibida',
      cancelada:   'Cancelada'
    }[e] || e;
  }

  // — Acciones —
  add():          void { this.router.navigate(['/compras/nuevo']); }
  view(id:number):void { this.router.navigate(['/compras', id]); }

  aprobar(id: number): void {
    if (!confirm('¿Aprobar esta orden?')) return;
    this.svc.cambiarEstado(id, 'aprobada').subscribe({
      next:  () => { this.toast.success('Orden aprobada'); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error al aprobar')
    });
  }

  recibir(id: number): void {
    if (!confirm('¿Marcar como recibida? Esto actualizará el inventario.')) return;
    this.svc.recibir(id).subscribe({
      next:  () => { this.toast.success('Orden recibida. Inventario actualizado.'); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error al recibir orden')
    });
  }

  cancelar(id: number): void {
    if (!confirm('¿Cancelar esta orden?')) return;
    this.svc.cambiarEstado(id, 'cancelada').subscribe({
      next:  () => { this.toast.success('Orden cancelada'); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error al cancelar')
    });
  }

  // — Paginación —
  firstPage():    void { this.page = 1;               this.loadData(); }
  lastPage():     void { this.page = this.totalPages; this.loadData(); }
  nextPage():     void { if (this.page < this.totalPages) { this.page++; this.loadData(); } }
  previousPage(): void { if (this.page > 1)               { this.page--; this.loadData(); } }
}