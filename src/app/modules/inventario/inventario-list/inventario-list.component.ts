// inventario-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matSearchOutline, matSwapVertOutline, matHistoryOutline,
  matAddCircleOutline, matRemoveCircleOutline, matWarningOutline
} from '@ng-icons/material-icons/outline';
import { InventarioService, ToastService } from '../../../core/services/services';
import { InventarioItem } from '../../../core/models/models';

@Component({
  selector: 'app-inventario-list',
  standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, NgIconComponent, DatePipe],
  providers: [provideIcons({
    matSearchOutline, matSwapVertOutline, matHistoryOutline,
    matAddCircleOutline, matRemoveCircleOutline, matWarningOutline
  })],
  templateUrl: './inventario-list.component.html',
  styleUrls: ['./inventario-list.component.scss']
})
export class InventarioListComponent implements OnInit {
  private svc    = inject(InventarioService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items:    InventarioItem[] = [];
  filtered: InventarioItem[] = [];
  load         = false;
  searchText   = '';
  // Tipado correcto según el servicio
  estadoFilter: 'critico' | 'sin_stock' | 'bajo' | undefined = undefined;

  get criticos() { return this.items.filter(i => i.estado === 'critico' || i.estado === 'sin_stock').length; }
  get bajos()    { return this.items.filter(i => i.estado === 'bajo').length; }
  get normales() { return this.items.filter(i => i.estado === 'normal').length; }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    this.svc.getAll(this.estadoFilter).subscribe({
      next:  r => { this.items = r; this.filtered = r; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando inventario'); }
    });
  }

  // Cambia el filtro de estado — convierte string vacío a undefined
  onEstadoChange(val: string): void {
    this.estadoFilter = (val as any) || undefined;
    this.loadData();
  }

  applyFilter(): void {
    const s = this.searchText.toLowerCase();
    this.filtered = !s ? this.items : this.items.filter(i =>
      i.nombre?.toLowerCase().includes(s) || (i as any).codigo?.toLowerCase().includes(s)
    );
  }

  getEstadoLabel(e: string): string {
    return { critico: 'Crítico', sin_stock: 'Sin Stock', bajo: 'Bajo', normal: 'Normal' }[e] || e;
  }

  openAjuste(): void { this.toast.info('Usa los botones + / - en cada producto'); }

  openAjusteFor(id: number, tipo: 'entrada' | 'salida'): void {
    const cantStr = prompt(`Cantidad a ${tipo === 'entrada' ? 'ingresar' : 'descontar'}:`);
    if (!cantStr || isNaN(+cantStr) || +cantStr <= 0) return;
    // El servicio ajuste() recibe UN objeto con la firma correcta
    this.svc.ajuste({
      producto_id: id,
      tipo:        tipo,
      cantidad:    +cantStr,
      motivo:      `Ajuste manual ${tipo}`
    }).subscribe({
      next:  () => { this.toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada`); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error en ajuste')
    });
  }

  verMovimientosDe(id: number): void {
    this.router.navigate(['/inventario'], { queryParams: { producto: id } });
  }
}
