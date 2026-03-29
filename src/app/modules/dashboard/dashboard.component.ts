import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matTrendingUpOutline, matCalendarMonthOutline, matInventory2Outline,
  matWarningOutline, matAccountBalanceOutline, matRefreshOutline
} from '@ng-icons/material-icons/outline';
import { DashboardService, EventBusService, ToastService } from '../../core/services/services';

import { DashboardKpis } from '../../core/models/models';
import { Subject, interval, merge } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderComponent, CommonModule, RouterModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [provideIcons({
    matTrendingUpOutline, matCalendarMonthOutline, matInventory2Outline,
    matWarningOutline, matAccountBalanceOutline, matRefreshOutline
  })],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private svc      = inject(DashboardService);
  private toast    = inject(ToastService);
  private eventBus = inject(EventBusService);
  private destroy$ = new Subject<void>();

  kpis?: DashboardKpis;
  topProductos: any[] = [];
  actividad:    any[] = [];

  load          = true;
  loadTop       = true;
  loadActividad = true;
  refreshing    = false;
  ultimaActualizacion?: Date;

  // Intervalo de polling: 60 segundos
  private readonly POLL_INTERVAL = 60_000;

  ngOnInit(): void {
    // Combina polling automático + eventos manuales del EventBus
    merge(
      interval(this.POLL_INTERVAL),
      this.eventBus.refresh$
    ).pipe(
      startWith(0), // dispara inmediatamente al iniciar
      takeUntil(this.destroy$)
    ).subscribe(() => this.cargarTodo());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarTodo(): void {
    this.refreshing = true;
    this.cargarKpis();
    this.cargarTopProductos();
    this.cargarActividad();
  }

  refrescarManual(): void {
    this.cargarTodo();
  }

  private cargarKpis(): void {
    this.svc.kpis().pipe(takeUntil(this.destroy$)).subscribe({
      next: k => {
        this.kpis              = k;
        this.load              = false;
        this.refreshing        = false;
        this.ultimaActualizacion = new Date();
      },
      error: () => {
        this.load       = false;
        this.refreshing = false;
        this.toast.error('Error cargando KPIs');
      }
    });
  }

  private cargarTopProductos(): void {
    this.svc.topProductos().pipe(takeUntil(this.destroy$)).subscribe({
      next:  t => { this.topProductos = t; this.loadTop = false; },
      error: () => this.loadTop = false
    });
  }

  private cargarActividad(): void {
    this.svc.actividad().pipe(takeUntil(this.destroy$)).subscribe({
      next:  a => { this.actividad = a; this.loadActividad = false; },
      error: () => this.loadActividad = false
    });
  }

  getActividadClass(tipo: string): string {
    if (tipo.includes('VENTA'))      return 'dot-venta';
    if (tipo.includes('COMPRA'))     return 'dot-compra';
    if (tipo.includes('PRODUCTO'))   return 'dot-inventario';
    if (tipo.includes('CLIENTE'))    return 'dot-compra';
    if (tipo.includes('PROVEEDOR'))  return 'dot-compra';
    if (tipo.includes('LOGIN'))      return 'dot-login';
    if (tipo.includes('PAGO'))       return 'dot-venta';
    return 'dot-default';
  }
}