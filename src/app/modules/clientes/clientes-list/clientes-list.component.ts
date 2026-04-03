// clientes-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matSearchOutline, matAddOutline, matRemoveRedEyeOutline,
  matModeEditOutline, matPersonOutline, matShoppingCartOutline
} from '@ng-icons/material-icons/outline';
import {
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import { ClientesService, ToastService } from '../../../core/services/services';
import { Cliente } from '../../../core/models/models';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({
    matSearchOutline, matAddOutline, matRemoveRedEyeOutline,
    matModeEditOutline, matPersonOutline, matShoppingCartOutline,
    bootstrapChevronLeft, bootstrapChevronRight,
    bootstrapChevronBarLeft, bootstrapChevronBarRight
  })],
  templateUrl: './clientes-list.component.html',
  styleUrls: ['./clientes-list.component.scss']
})
export class ClientesListComponent implements OnInit {
  private svc    = inject(ClientesService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items: Cliente[] = [];
  load = false;
  searchText = ''; tipoFilter = '';
  page = 1; limit = 15; totalItems = 0;

  get totalPages()     { return Math.max(1, Math.ceil(this.totalItems / this.limit)); }
  get startIndex()     { return (this.page - 1) * this.limit + 1; }
  get endIndex()       { return Math.min(this.page * this.limit, this.totalItems); }
  get totalFacturado() { return this.items.reduce((a, c) => a + (c.total_compras  || 0), 0); }
  get saldoPendiente() { return this.items.reduce((a, c) => a + (c.saldo_pendiente|| 0), 0); }
  get conCredito()     { return this.items.filter(c => c.credito_maximo > 0).length; }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    this.svc.getAll(this.searchText, this.tipoFilter, this.page, this.limit).subscribe({
      next:  r => { this.items = r.data; this.totalItems = r.total; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando clientes'); }
    });
  }

  onSearch(): void {
    if (this.searchText.length >= 2 || !this.searchText) { this.page = 1; this.loadData(); }
  }

  getTipoLabel(t: string): string {
    return { individual: 'Individual', empresa: 'Empresa',
             cooperativa: 'Cooperativa', finca: 'Finca', otro: 'Otro' }[t] || t;
  }

  add():                void { this.router.navigate(['/clientes/nuevo']); }
  view(id: number):     void { this.router.navigate(['/clientes', id]); }
  edit(id: number):     void { this.router.navigate(['/clientes', id, 'editar']); }
  verVentas(id: number):void { this.router.navigate(['/ventas'], { queryParams: { cliente_id: id } }); }

  firstPage():    void { this.page = 1; this.loadData(); }
  lastPage():     void { this.page = this.totalPages; this.loadData(); }
  nextPage():     void { if (this.page < this.totalPages) { this.page++; this.loadData(); } }
  previousPage(): void { if (this.page > 1) { this.page--; this.loadData(); } }
}
