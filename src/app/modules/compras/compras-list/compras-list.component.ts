// compras-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matAddOutline, matRemoveRedEyeOutline, matShoppingCartOutline, matThumbUpOutline
} from '@ng-icons/material-icons/outline';
import { bootstrapCheckCircleFill, bootstrapXCircle } from '@ng-icons/bootstrap-icons';
import { ComprasService, ToastService } from '../../../core/services/services';
import { OrdenCompra } from '../../../core/models/models';

@Component({
  selector: 'app-compras-list',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, FormsModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [provideIcons({
    matAddOutline, matRemoveRedEyeOutline, matShoppingCartOutline,
    matThumbUpOutline, bootstrapCheckCircleFill, bootstrapXCircle
  })],
  templateUrl: './compras-list.component.html',
  styleUrls: ['./compras-list.component.scss']
})
export class ComprasListComponent implements OnInit {
  private svc    = inject(ComprasService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items: OrdenCompra[] = [];
  load = false;
  estadoFilter = '';

  get pendientes()  { return this.items.filter(o => o.estado === 'pendiente').length; }
  get enTransito()  { return this.items.filter(o => o.estado === 'en_transito' || o.estado === 'aprobada').length; }
  get montoTotal()  { return this.items.reduce((a, o) => a + o.total, 0); }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    this.svc.getAll(this.estadoFilter).subscribe({
      next:  r => { this.items = r; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando órdenes'); }
    });
  }

  getEstadoLabel(e: string): string {
    return {
      pendiente: 'Pendiente', aprobada: 'Aprobada',
      en_transito: 'En Tránsito', recibida: 'Recibida', cancelada: 'Cancelada'
    }[e] || e;
  }

  add():          void { this.router.navigate(['/compras/nuevo']); }
  view(id:number):void { this.router.navigate(['/compras', id]); }

  aprobar(id: number): void {
    this.svc.cambiarEstado(id, 'aprobada').subscribe({
      next:  () => { this.toast.success('Orden aprobada'); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error')
    });
  }

  recibir(id: number): void {
    if (!confirm('¿Marcar como recibida? Esto actualizará el inventario.')) return;
    this.svc.recibir(id).subscribe({
      next:  () => { this.toast.success('Orden recibida. Inventario actualizado.'); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error al recibir orden')
    });
  }

  cancelar(id: number): void {
    if (!confirm('¿Cancelar esta orden?')) return;
    this.svc.cambiarEstado(id, 'cancelada').subscribe({
      next:  () => { this.toast.success('Orden cancelada'); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error')
    });
  }
}
