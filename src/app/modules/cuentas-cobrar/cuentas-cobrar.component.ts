import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { NgClass, DecimalPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';

import {
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import {
  matSearchOutline, matPaymentsOutline, matCloseOutline,
  matWarningOutline, matCheckCircleOutline, matArrowDownwardOutline,
  matArrowUpwardOutline
} from '@ng-icons/material-icons/outline';
import { HeaderComponent } from 'app/shared/components/header/header.component';
import { CuentasCobrarService, ToastService } from 'app/core/services/services';
import { ChatBubbleComponent } from 'app/shared/components/chat-bubble/chat-bubble.component';


interface CuentaCobrar {
  id: number;
  numero_factura: string;
  cliente_nombre: string;
  cliente_id: number;
  venta_id: number;
  monto_total: number;
  monto_pagado: number;
  saldo: number;
  fecha_vence: string;
  estado: 'pendiente' | 'parcial' | 'vencida' | 'pagada';
}

@Component({
  selector: 'app-cuentas-cobrar',
  standalone: true,
  templateUrl: './cuentas-cobrar.component.html',
  styleUrls: ['./cuentas-cobrar.component.scss'],
  imports: [
    HeaderComponent, NgIcon, ChatBubbleComponent,
    NgClass, CommonModule, FormsModule, DecimalPipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  viewProviders: [provideIcons({
    matSearchOutline, matPaymentsOutline, matCloseOutline,
    matWarningOutline, matCheckCircleOutline,
    matArrowDownwardOutline, matArrowUpwardOutline,
    bootstrapChevronLeft, bootstrapChevronRight,
    bootstrapChevronBarLeft, bootstrapChevronBarRight
  })]
})
export class CuentasCobrarComponent implements OnInit {
  private svc   = inject(CuentasCobrarService);
  private toast = inject(ToastService);

  // ── Datos ─────────────────────────────────────────────────
  allItems:  CuentaCobrar[] = [];   // todos los registros cargados
  filtered:  CuentaCobrar[] = [];   // página actual mostrada
  load       = false;

  // ── Filtros ───────────────────────────────────────────────
  searchText  = '';
  estadoFilter = '';

  // ── Paginación ────────────────────────────────────────────
  page     = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;
  startIndex = 0;
  endIndex   = 0;

  // ── KPIs (calculados del array completo) ──────────────────
  get totalPendiente() { return this.allItems.filter(c => c.estado !== 'pagada').reduce((a, c) => a + Number(c.saldo ?? 0), 0); }
  get cuentasActivas() { return this.allItems.filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length; }
  get vencidas()       { return this.allItems.filter(c => c.estado === 'vencida').length; }
  get pagadas()        { return this.allItems.filter(c => c.estado === 'pagada').length; }

  // ── Modal pago ────────────────────────────────────────────
  cuentaSeleccionada: CuentaCobrar | null = null;
  pagoMonto    = 0;
  pagoMetodo   = 'efectivo';
  pagoRef      = '';
  savingPago   = false;

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    const params: any = {};
    if (this.estadoFilter) params.estado = this.estadoFilter;
    this.svc.getAll(params).subscribe({
      next: (res: any) => {
        // El backend devuelve array plano. Calcular saldo si no viene como columna.
        const items: CuentaCobrar[] = (Array.isArray(res) ? res : res.data ?? [])
          .map((c: any) => ({
            ...c,
            monto_total:  Number(c.monto_total  ?? 0),
            monto_pagado: Number(c.monto_pagado ?? 0),
            saldo: Number(c.saldo ?? (Number(c.monto_total ?? 0) - Number(c.monto_pagado ?? 0)))
          }));
        this.allItems = items;
        this.page     = 1;
        this.applyFilter();
        this.load = false;
      },
      error: () => { this.load = false; this.toast.error('Error cargando cuentas por cobrar'); }
    });
  }

  applyFilter(): void {
    const s = this.searchText.toLowerCase();
    const base = !s
      ? this.allItems
      : this.allItems.filter(c =>
          c.cliente_nombre?.toLowerCase().includes(s) ||
          c.numero_factura?.toLowerCase().includes(s)
        );
    this.totalItems = base.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    this.filtered   = base.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
    this.startIndex = this.totalItems === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
    this.endIndex   = Math.min(this.page * this.pageSize, this.totalItems);
  }

  onSearch(): void { this.page = 1; this.applyFilter(); }

  // ── Modal de pago ─────────────────────────────────────────
  openPago(c: CuentaCobrar): void {
    this.cuentaSeleccionada = c;
    this.pagoMonto  = Number(c.saldo);
    this.pagoMetodo = 'efectivo';
    this.pagoRef    = '';
  }

  closePago(): void { this.cuentaSeleccionada = null; }

  savePago(): void {
    if (!this.cuentaSeleccionada) return;
    if (!this.pagoMonto || this.pagoMonto <= 0) {
      this.toast.warning('Ingresa un monto válido'); return;
    }
    if (this.pagoMonto > Number(this.cuentaSeleccionada.saldo)) {
      this.toast.warning('El monto no puede superar el saldo pendiente'); return;
    }
    this.savingPago = true;
    this.svc.registrarPago(this.cuentaSeleccionada.id, {
      monto:       this.pagoMonto,
      metodo_pago: this.pagoMetodo,
      referencia:  this.pagoRef || undefined
    }).subscribe({
      next: () => {
        this.toast.success('Pago registrado exitosamente');
        this.savingPago = false;
        this.closePago();
        this.loadData();
      },
      error: e => {
        this.savingPago = false;
        this.toast.error(e?.error?.error || 'Error registrando pago');
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  estaVencida(fecha: string): boolean {
    if (!fecha) return false;
    return new Date(fecha) < new Date();
  }

  getEstadoLabel(e: string): string {
    return ({ pendiente: 'Pendiente', parcial: 'Parcial', vencida: 'Vencida', pagada: 'Pagada' } as Record<string,string>)[e] || e;
  }

  // ── Paginación ────────────────────────────────────────────
  nextPage():     void { if (this.page < this.totalPages) { this.page++; this.applyFilter(); } }
  previousPage(): void { if (this.page > 1)               { this.page--; this.applyFilter(); } }
  firstPage():    void { this.page = 1;               this.applyFilter(); }
  lastPage():     void { this.page = this.totalPages; this.applyFilter(); }
}