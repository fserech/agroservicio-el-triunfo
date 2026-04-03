// inventario-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matSearchOutline, matSwapVertOutline, matHistoryOutline, matAddCircleOutline, matRemoveCircleOutline, matWarningOutline } from '@ng-icons/material-icons/outline';
import { InventarioService, ToastService } from '../../../core/services/services';
import { InventarioItem } from '../../../core/models/models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-inventario-list',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, FormsModule, NgIconComponent, DatePipe],
  providers: [provideIcons({ matSearchOutline, matSwapVertOutline, matHistoryOutline, matAddCircleOutline, matRemoveCircleOutline, matWarningOutline })],
  templateUrl: './inventario-list.component.html',
  styleUrls: ['./inventario-list.component.scss']
})
export class InventarioListComponent implements OnInit {
  private svc    = inject(InventarioService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items:    InventarioItem[] = [];
  filtered: InventarioItem[] = [];
  load = false;
  searchText   = '';
  estadoFilter = '';

  get criticos() { return this.items.filter(i => i.estado === 'critico' || i.estado === 'sin_stock').length; }
  get bajos()    { return this.items.filter(i => i.estado === 'bajo').length; }
  get normales() { return this.items.filter(i => i.estado === 'normal').length; }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    const e = this.estadoFilter as any;
    this.svc.getAll(e || undefined).subscribe({
      next: r => { this.items = r; this.filtered = r; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando inventario'); }
    });
  }

  applyFilter(): void {
    const t = this.searchText.toLowerCase();
    this.filtered = this.items.filter(i => i.nombre.toLowerCase().includes(t) || (i.cat||'').toLowerCase().includes(t));
  }

  getEstadoLabel(e: string): string {
    return { sin_stock:'Sin Stock', critico:'Crítico', bajo:'Bajo', normal:'Normal' }[e] || e;
  }

  openAjuste(): void { this.router.navigate(['/inventario/ajuste']); }
  openAjusteFor(id: number, tipo: string): void { this.router.navigate(['/inventario/ajuste'], { queryParams: { producto_id: id, tipo } }); }
  verMovimientos(): void { this.router.navigate(['/inventario/movimientos']); }
  verMovimientosDe(id: number): void { this.router.navigate(['/inventario/movimientos'], { queryParams: { producto_id: id } }); }
}
