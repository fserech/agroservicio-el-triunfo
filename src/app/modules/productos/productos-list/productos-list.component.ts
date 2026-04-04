// productos-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matSearchOutline, matAddOutline, matRemoveRedEyeOutline,
  matModeEditOutline, matInventory2Outline,
  matArrowDownwardOutline, matArrowUpwardOutline
} from '@ng-icons/material-icons/outline';
import {
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import { ProductosService, ToastService } from '../../../core/services/services';
import { Producto, Categoria } from '../../../core/models/models';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({
    matSearchOutline, matAddOutline, matRemoveRedEyeOutline,
    matModeEditOutline, matInventory2Outline,
    matArrowDownwardOutline, matArrowUpwardOutline,
    bootstrapChevronLeft, bootstrapChevronRight,
    bootstrapChevronBarLeft, bootstrapChevronBarRight
  })],
  templateUrl: './productos-list.component.html',
  styleUrls: ['./productos-list.component.scss']
})
export class ProductosListComponent implements OnInit {
  private svc    = inject(ProductosService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items: Producto[]       = [];
  categorias: Categoria[] = [];
  load        = false;
  searchText  = '';
  catFilter: number | undefined;
  activoFilter = 'true';

  sortBy    = 'nombre';
  sortOrder = 'asc';

  page = 1; limit = 15; totalItems = 0;

  get totalPages()    { return Math.max(1, Math.ceil(this.totalItems / this.limit)); }
  get startIndex()    { return (this.page - 1) * this.limit + 1; }
  get endIndex()      { return Math.min(this.page * this.limit, this.totalItems); }
  get margenPromedio(){ const m = this.items.map(i => i.margen || 0); return m.length ? m.reduce((a, b) => a + b, 0) / m.length : 0; }
  get stockCritico()  { return this.items.filter(i => i.estado_stock === 'critico' || i.estado_stock === 'sin_stock').length; }

  // Objeto compatible con el template (sortConfig.sortBy / sortConfig.sortOrder)
  sortConfig = { sortBy: 'nombre', sortOrder: 'asc' };

  ngOnInit(): void {
    this.svc.getCategorias().subscribe(c => this.categorias = c);
    this.loadData();
  }

  loadData(): void {
    this.load = true;
    this.svc.getAll(this.searchText, this.catFilter, this.activoFilter, this.page, this.limit).subscribe({
      next:  r => { this.items = r.data; this.totalItems = r.total; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando productos'); }
    });
  }

  changeSortOrderBy(field: string): void {
    if (this.sortConfig.sortBy === field) {
      this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.sortBy    = field;
      this.sortConfig.sortOrder = 'asc';
    }
    // Ordenar localmente el array
    this.items = [...this.items].sort((a: any, b: any) => {
      const va = a[field] ?? '';
      const vb = b[field] ?? '';
      const cmp = va > vb ? 1 : va < vb ? -1 : 0;
      return this.sortConfig.sortOrder === 'asc' ? cmp : -cmp;
    });
  }

  add():          void { this.router.navigate(['/productos/nuevo']); }
  view(id:number):void { this.router.navigate(['/productos', id]); }
  edit(id:number):void { this.router.navigate(['/productos', id, 'editar']); }

  firstPage():    void { this.page = 1; this.loadData(); }
  lastPage():     void { this.page = this.totalPages; this.loadData(); }
  nextPage():     void { if (this.page < this.totalPages) { this.page++; this.loadData(); } }
  previousPage(): void { if (this.page > 1) { this.page--; this.loadData(); } }
}
