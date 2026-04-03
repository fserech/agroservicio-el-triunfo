// cuentas-cobrar.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matPaymentsOutline, matCloseOutline } from '@ng-icons/material-icons/outline';
import { CuentasCobrarService, ToastService } from '../../core/services/services';
import { CuentaCobrar } from '../../core/models/models';

@Component({
  selector: 'app-cuentas-cobrar',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, FormsModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [provideIcons({ matPaymentsOutline, matCloseOutline })],
  templateUrl: './cuentas-cobrar.component.html',
  styleUrls: ['./cuentas-cobrar.component.scss']
})
export class CuentasCobrarComponent implements OnInit {
  private svc   = inject(CuentasCobrarService);
  private toast = inject(ToastService);

  items: CuentaCobrar[] = [];
  load = false;
  estadoFilter = '';

  cuentaSeleccionada: CuentaCobrar | null = null;
  pagoMonto  = 0;
  pagoMetodo = 'efectivo';
  pagoRef    = '';
  savingPago = false;

  get totalPendiente() { return this.items.filter(c => c.estado !== 'pagada').reduce((a, c) => a + c.saldo, 0); }
  get cuentasActivas() { return this.items.filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length; }
  get vencidas()       { return this.items.filter(c => c.estado === 'vencida').length; }
  get pagadas()        { return this.items.filter(c => c.estado === 'pagada').length; }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    this.svc.getAll(this.estadoFilter).subscribe({
      next:  r => { this.items = r; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando cuentas'); }
    });
  }

  getEstadoLabel(e: string): string {
    return { pendiente: 'Pendiente', parcial: 'Parcial', vencida: 'Vencida', pagada: 'Pagada' }[e] || e;
  }

  estaVencida(fecha?: string): boolean {
    if (!fecha) return false;
    return new Date(fecha) < new Date();
  }

  openPago(c: CuentaCobrar): void {
    this.cuentaSeleccionada = c;
    this.pagoMonto  = c.saldo;
    this.pagoMetodo = 'efectivo';
    this.pagoRef    = '';
  }

  closePago(): void { this.cuentaSeleccionada = null; }

  savePago(): void {
    if (!this.pagoMonto || this.pagoMonto <= 0) {
      this.toast.warning('Ingresa un monto válido'); return;
    }
    if (!this.cuentaSeleccionada) return;
    this.savingPago = true;
    this.svc.registrarPago(this.cuentaSeleccionada.id, this.pagoMonto, this.pagoMetodo, this.pagoRef).subscribe({
      next:  r => {
        this.toast.success(`Pago registrado. Nuevo estado: ${r.nuevo_estado}`);
        this.savingPago = false;
        this.closePago();
        this.loadData();
      },
      error: e  => { this.savingPago = false; this.toast.error(e?.error?.error || 'Error registrando pago'); }
    });
  }
}
