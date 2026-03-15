import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matAddOutline, matRemoveRedEyeOutline, matModeEditOutline,
  matShoppingCartOutline, matSearchOutline, matDeleteOutline,
  matArrowDownwardOutline, matArrowUpwardOutline
} from '@ng-icons/material-icons/outline';
import {
  bootstrapChevronBarLeft, bootstrapChevronBarRight,
  bootstrapChevronLeft, bootstrapChevronRight
} from '@ng-icons/bootstrap-icons';
import { ProveedoresService, ToastService } from '../../../core/services/services';
import { Proveedor } from '../../../core/models/models';

@Component({
  selector: 'app-proveedores-list',
  standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({
    matAddOutline, matRemoveRedEyeOutline, matModeEditOutline,
    matShoppingCartOutline, matSearchOutline, matDeleteOutline,
    matArrowDownwardOutline, matArrowUpwardOutline,
    bootstrapChevronBarLeft, bootstrapChevronBarRight,
    bootstrapChevronLeft, bootstrapChevronRight
  })],
  templateUrl: './proveedores-list.component.html',
  styleUrls: ['./proveedores-list.component.scss']
})
export class ProveedoresListComponent implements OnInit {
  private svc    = inject(ProveedoresService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items: Proveedor[] = [];
  load       = false;
  searchText = '';
  sortConfig = { sortBy: 'nombre', sortOrder: 'asc' };
  page       = 1;
  limit      = 10;
  totalItems = 0;

  get totalPages()   { return Math.max(1, Math.ceil(this.totalItems / this.limit)); }
  get startIndex()   { return (this.page - 1) * this.limit + 1; }
  get endIndex()     { return Math.min(this.page * this.limit, this.totalItems); }
  get comprasTotal() { return this.items.reduce((a, p) => a + (p.compras_totales || 0), 0); }
  get conCredito()   { return this.items.filter(p => p.plazo_credito > 0).length; }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    this.svc.getAll(this.searchText).subscribe({
      next:  r => { this.items = r; this.totalItems = r.length; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando proveedores'); }
    });
  }

  changeSortOrderBy(field: string): void {
    if (this.sortConfig.sortBy === field) {
      this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.sortBy    = field;
      this.sortConfig.sortOrder = 'asc';
    }
    this.items = [...this.items].sort((a: any, b: any) => {
      const va = a[field] ?? '', vb = b[field] ?? '';
      const cmp = va > vb ? 1 : va < vb ? -1 : 0;
      return this.sortConfig.sortOrder === 'asc' ? cmp : -cmp;
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este proveedor? Esta acción no se puede deshacer.')) return;
    this.svc.delete(id).subscribe({
      next:  () => { this.toast.success('Proveedor eliminado'); this.loadData(); },
      error: (e) => this.toast.error(e?.error?.error || 'Error al eliminar')
    });
  }

  add():           void { this.router.navigate(['/proveedores/nuevo']); }
  view(id: number):void { this.router.navigate(['/proveedores', id]); }
  edit(id: number):void { this.router.navigate(['/proveedores', id, 'editar']); }
  nuevaOrden(id: number): void { this.router.navigate(['/compras/nuevo'], { queryParams: { proveedor: id } }); }

  firstPage():    void { this.page = 1; }
  lastPage():     void { this.page = this.totalPages; }
  nextPage():     void { if (this.page < this.totalPages) this.page++; }
  previousPage(): void { if (this.page > 1) this.page--; }
}