import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matAddOutline, matRemoveRedEyeOutline, matThumbUpOutline, matArrowDownwardOutline, matArrowUpwardOutline } from '@ng-icons/material-icons/outline';
import { bootstrapCheckCircleFill, bootstrapXCircle, bootstrapChevronLeft, bootstrapChevronRight, bootstrapChevronBarLeft, bootstrapChevronBarRight } from '@ng-icons/bootstrap-icons';
import { ComprasService, ToastService } from '../../../core/services/services';
import { OrdenCompra } from '../../../core/models/models';

@Component({
  selector: 'app-compras-list', standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [provideIcons({ matAddOutline, matRemoveRedEyeOutline, matThumbUpOutline, matArrowDownwardOutline, matArrowUpwardOutline, bootstrapCheckCircleFill, bootstrapXCircle, bootstrapChevronLeft, bootstrapChevronRight, bootstrapChevronBarLeft, bootstrapChevronBarRight })],
  templateUrl: './compras-list.component.html', styleUrls: ['./compras-list.component.scss']
})
export class ComprasListComponent implements OnInit {
  private svc   = inject(ComprasService);
  private toast = inject(ToastService);
  private router = inject(Router);

  items: OrdenCompra[] = []; load = false; estadoFilter = '';
  sortConfig = { sortBy: 'fecha', sortOrder: 'desc' };
  page = 1; limit = 15; totalItems = 0;

  get totalPages()  { return Math.max(1, Math.ceil(this.totalItems / this.limit)); }
  get startIndex()  { return (this.page - 1) * this.limit + 1; }
  get endIndex()    { return Math.min(this.page * this.limit, this.totalItems); }
  get pendientes()  { return this.items.filter(o => o.estado === 'pendiente').length; }
  get enTransito()  { return this.items.filter(o => o.estado === 'en_transito' || o.estado === 'aprobada').length; }
  get montoTotal()  { return this.items.reduce((a, o) => a + (o.total||0), 0); }

  ngOnInit(): void { this.loadData(); }
  loadData(): void {
    this.load = true;
    this.svc.getAll(this.estadoFilter).subscribe({
      next: r => { this.items = r; this.totalItems = r.length; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando órdenes'); }
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
  getEstadoLabel(e: string): string { return ({pendiente:'Pendiente',aprobada:'Aprobada',en_transito:'En Tránsito',recibida:'Recibida',cancelada:'Cancelada'} as any)[e] || e; }
  add():            void { this.router.navigate(['/compras/nuevo']); }
  view(id: number): void { this.router.navigate(['/compras', id]); }
  aprobar(id: number): void { this.svc.cambiarEstado(id,'aprobada').subscribe({ next:()=>{ this.toast.success('Aprobada'); this.loadData(); }, error:e=>this.toast.error(e?.error?.error||'Error') }); }
  recibir(id: number): void { if(!confirm('¿Marcar como recibida?')) return; this.svc.recibir(id).subscribe({ next:()=>{ this.toast.success('Recibida'); this.loadData(); }, error:e=>this.toast.error(e?.error?.error||'Error') }); }
  cancelar(id: number): void { if(!confirm('¿Cancelar orden?')) return; this.svc.cambiarEstado(id,'cancelada').subscribe({ next:()=>{ this.toast.success('Cancelada'); this.loadData(); }, error:e=>this.toast.error(e?.error?.error||'Error') }); }
  firstPage():    void { this.page = 1; }
  lastPage():     void { this.page = this.totalPages; }
  nextPage():     void { if (this.page < this.totalPages) this.page++; }
  previousPage(): void { if (this.page > 1) this.page--; }
}