import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.html',
})
export class BadgeComponent {
  @Input() label = '';
  @Input() variant: 'success'|'danger'|'warning'|'info'|'gray'|'primary' = 'gray';

  get colorClass() {
    const map = {
      success: 'bg-emerald-100 text-emerald-800',
      danger:  'bg-red-100 text-red-800',
      warning: 'bg-amber-100 text-amber-800',
      info:    'bg-blue-100 text-blue-800',
      gray:    'bg-slate-100 text-slate-600',
      primary: 'bg-primary-light text-primary-dark',
    };
    return map[this.variant] || map.gray;
  }
}

export function estadoVentaVariant(e: string): BadgeComponent['variant'] {
  const m: any = { PENDING: 'warning', IN_PROCESS: 'info', FINALIZED: 'success', CANCEL: 'gray' };
  return m[e] || 'gray';
}
export function estadoVentaLabel(e: string): string {
  const m: any = { PENDING: 'Pendiente', IN_PROCESS: 'En Proceso', FINALIZED: 'Finalizada', CANCEL: 'Cancelada' };
  return m[e] || e;
}
export function estadoCompraVariant(e: string): BadgeComponent['variant'] {
  const m: any = { pendiente: 'warning', aprobada: 'info', en_transito: 'info', recibida: 'success', cancelada: 'gray' };
  return m[e] || 'gray';
}
export function estadoCompraLabel(e: string): string {
  const m: any = { pendiente: 'Pendiente', aprobada: 'Aprobada', en_transito: 'En Tránsito', recibida: 'Recibida', cancelada: 'Cancelada' };
  return m[e] || e;
}
export function estadoCuentaVariant(e: string): BadgeComponent['variant'] {
  const m: any = { pendiente: 'warning', parcial: 'info', pagada: 'success', vencida: 'danger' };
  return m[e] || 'gray';
}
export function estadoCuentaLabel(e: string): string {
  const m: any = { pendiente: 'Pendiente', parcial: 'Parcial', pagada: 'Pagada', vencida: 'Vencida' };
  return m[e] || e;
}
export function stockVariant(e: string): BadgeComponent['variant'] {
  const m: any = { normal: 'success', bajo: 'warning', critico: 'danger', sin_stock: 'danger' };
  return m[e] || 'gray';
}
export function stockLabel(e: string): string {
  const m: any = { normal: 'Normal', bajo: 'Bajo', critico: 'Crítico', sin_stock: 'Sin Stock' };
  return m[e] || e;
}
export function tipoClienteVariant(t: string): BadgeComponent['variant'] {
  const m: any = { individual: 'info', empresa: 'primary', cooperativa: 'success', finca: 'warning', otro: 'gray' };
  return m[t] || 'gray';
}
export function tipoClienteLabel(t: string): string {
  const m: any = { individual: 'Individual', empresa: 'Empresa', cooperativa: 'Cooperativa', finca: 'Finca', otro: 'Otro' };
  return m[t] || t;
}
