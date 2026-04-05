import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matRemoveRedEyeOutline, matPaymentsOutline,
  matArrowDownwardOutline, matArrowUpwardOutline
} from '@ng-icons/material-icons/outline';
import {
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import { CuentasCobrarService, ToastService } from '../../core/services/services';
import { CuentaCobrar, CuentaEstado } from '../../core/models/models';

@Component({
  selector: 'app-cuentas-cobrar', standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [provideIcons({
    matRemoveRedEyeOutline, matPaymentsOutline,
    matArrowDownwardOutline, matArrowUpwardOutline,
    bootstrapChevronLeft, bootstrapChevronRight,
    bootstrapChevronBarLeft, bootstrapChevronBarRight
  })],
  templateUrl: './cuentas-cobrar.component.html', styleUrls: ['./cuentas-cobrar.component.scss']
})
export class CuentasCobrarComponent implements OnInit {
  private svc   = inject(CuentasCobrarService);
  private toast = inject(ToastService);

  items: CuentaCobrar[] = []; load = false; estadoFilter = '';
  sortConfig = { sortBy: 'fecha_vence', sortOrder: 'asc' };
  page = 1; limit = 15; totalItems = 0;

  get totalPages()   { return Math.max(1, Math.ceil(this.totalItems / this.limit)); }
  get startIndex()   { return (this.page - 1) * this.limit + 1; }
  get endIndex()     { return Math.min(this.page * this.limit, this.totalItems); }
  get totalSaldo()   { return this.items.reduce((a, c) => a + c.saldo, 0); }
  get totalCobrado() { return this.items.reduce((a, c) => a + c.monto_pagado, 0); }
  get vencidas()     { return this.items.filter(c => c.estado === 'vencida').length; }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    this.svc.getAll(this.estadoFilter).subscribe({
      next: (r: CuentaCobrar[]) => {
        // PostgreSQL devuelve campos numéricos como strings — casteamos a number
        this.items = r.map((c: CuentaCobrar) => ({
          ...c,
          monto_total:  Number(c.monto_total)  || 0,
          monto_pagado: Number(c.monto_pagado) || 0,
          saldo:        Number(c.saldo)        || 0,
        }));
        this.totalItems = this.items.length;
        this.load = false;
      },
      error: () => { this.load = false; this.toast.error('Error cargando cuentas'); }
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

  getEstadoLabel(e: CuentaEstado): string {
    return ({pendiente:'Pendiente',parcial:'Parcial',pagada:'Pagada',vencida:'Vencida'} as any)[e] || e;
  }

  registrarPago(id: number, saldo: number): void {
    const montoStr = prompt(`Monto a pagar (Saldo: Q ${saldo.toFixed(2)}):`);
    if (!montoStr || isNaN(+montoStr) || +montoStr <= 0) return;
    const metodo = prompt('Método de pago (efectivo/tarjeta/transferencia/cheque):') || 'efectivo';
    this.svc.registrarPago(id, +montoStr, metodo).subscribe({
      next: () => { this.toast.success('Pago registrado'); this.loadData(); },
      error: e => this.toast.error(e?.error?.error || 'Error al registrar pago')
    });
  }

  firstPage():    void { this.page = 1; }
  lastPage():     void { this.page = this.totalPages; }
  nextPage():     void { if (this.page < this.totalPages) this.page++; }
  previousPage(): void { if (this.page > 1) this.page--; }
}