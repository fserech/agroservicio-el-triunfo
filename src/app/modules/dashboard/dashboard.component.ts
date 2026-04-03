// dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matTrendingUpOutline, matCalendarMonthOutline, matInventory2Outline,
  matWarningOutline, matAccountBalanceOutline
} from '@ng-icons/material-icons/outline';
import { DashboardService, ToastService } from '../../core/services/services';
import { DashboardKpis } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, RouterModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [provideIcons({
    matTrendingUpOutline, matCalendarMonthOutline, matInventory2Outline,
    matWarningOutline, matAccountBalanceOutline
  })],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private svc   = inject(DashboardService);
  private toast = inject(ToastService);

  kpis?: DashboardKpis;
  topProductos: any[] = [];
  actividad:    any[] = [];
  load         = true;
  loadTop      = true;
  loadActividad = true;

  ngOnInit(): void {
    this.svc.kpis().subscribe({
      next:  k => { this.kpis = k; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando KPIs'); }
    });
    this.svc.topProductos().subscribe({
      next:  t => { this.topProductos = t; this.loadTop = false; },
      error: () => this.loadTop = false
    });
    this.svc.actividad().subscribe({
      next:  a => { this.actividad = a; this.loadActividad = false; },
      error: () => this.loadActividad = false
    });
  }

  getActividadClass(tipo: string): string {
    if (tipo.includes('VENTA'))     return 'dot-venta';
    if (tipo.includes('COMPRA'))    return 'dot-compra';
    if (tipo.includes('INVENTARIO'))return 'dot-inventario';
    if (tipo.includes('LOGIN'))     return 'dot-login';
    return 'dot-default';
  }
}
