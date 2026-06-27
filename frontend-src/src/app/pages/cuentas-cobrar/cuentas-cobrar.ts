import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { BadgeComponent, estadoCuentaVariant, estadoCuentaLabel } from '../../components/shared/badge/badge';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ActionButtonsComponent } from '../../components/shared/action-buttons/action-buttons';
import { CuentaCobrar, KpiData } from '../../models';
import { fmtQ, fmtDate } from '../../utils/format';

@Component({
  selector: 'app-cuentas-cobrar',
  standalone: true,
  imports: [CommonModule, FormsModule, KpiCardComponent, BadgeComponent, PaginationComponent, EmptyStateComponent, ActionButtonsComponent],
  templateUrl: './cuentas-cobrar.html',
})
export class CuentasCobrarComponent implements OnInit {
  allCuentas  = signal<CuentaCobrar[]>([]);
  kpis        = signal<KpiData[]>([]);
  loading     = signal(true);
  page        = signal(1);
  limit       = 15;
  estado      = 'pendiente'; // Por defecto muestra solo pendientes
  pagoModal   = signal(false);
  savingPago  = signal(false);
  selectedCuenta: CuentaCobrar | null = null;
  pagoMonto   = 0;
  pagoMetodo  = 'efectivo';

  tabs = [
    { value: '',          label: 'Todas'     },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'parcial',   label: 'Parcial'   },
    { value: 'pagada',    label: 'Pagada'    },
    { value: 'vencida',   label: 'Vencida'   },
  ];

  fmtQ = fmtQ; fmtDate = fmtDate;
  estadoVariant = estadoCuentaVariant; estadoLabel = estadoCuentaLabel;

  vencidas  = () => this.allCuentas().filter(c => c.estado === 'vencida').length;
  pageItems = () => {
    const p = this.page(), l = this.limit;
    return this.allCuentas().slice((p - 1) * l, p * l);
  };

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }

  setTab(value: string) {
    this.estado = value;
    this.page.set(1);
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      let q = '/cuentas-cobrar';
      if (this.estado) q += `?estado=${this.estado}`;
      const data = await this.api.get<CuentaCobrar[]>(q);
      this.allCuentas.set(data);
      // KPIs siempre sobre todos los datos, hacer llamada sin filtro
      const all = this.estado
        ? await this.api.get<CuentaCobrar[]>('/cuentas-cobrar')
        : data;
      const saldo   = all.reduce((a, c) => a + +c.saldo, 0);
      const cobrado = all.reduce((a, c) => a + +c.monto_pagado, 0);
      const venc    = all.filter(c => c.estado === 'vencida').length;
      this.kpis.set([
        { label: 'Total Cuentas',   value: all.length,    color: '#00C793' },
        { label: 'Saldo Pendiente', value: fmtQ(saldo),   color: '#ef4444' },
        { label: 'Total Cobrado',   value: fmtQ(cobrado), color: '#10b981' },
        { label: 'Vencidas',        value: venc,          color: '#f59e0b' },
      ]);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.loading.set(false); }
  }

  goPage(p: number) { this.page.set(p); }

  abrirPago(c: CuentaCobrar) {
    this.selectedCuenta = c;
    this.pagoMonto  = +c.saldo;
    this.pagoMetodo = 'efectivo';
    this.pagoModal.set(true);
  }

  async confirmarPago() {
    if (!this.selectedCuenta || !this.pagoMonto || this.pagoMonto <= 0) {
      this.toast.warning('Ingresa un monto válido'); return;
    }
    this.savingPago.set(true);
    try {
      await this.api.post(`/cuentas-cobrar/${this.selectedCuenta.id}/pago`, {
        monto: this.pagoMonto, metodo_pago: this.pagoMetodo
      });
      this.pagoModal.set(false);
      await this.load();
      this.toast.success('Pago registrado correctamente');
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.savingPago.set(false); }
  }
}