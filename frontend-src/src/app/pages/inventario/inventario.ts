import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { BadgeComponent, stockVariant, stockLabel } from '../../components/shared/badge/badge';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ActionButtonsComponent, ActionButton } from '../../components/shared/action-buttons/action-buttons';
import { InventarioItem, KpiData } from '../../models';
import { fmtN } from '../../utils/format';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, KpiCardComponent, BadgeComponent, EmptyStateComponent, ActionButtonsComponent],
  templateUrl: './inventario.html',
})
export class InventarioComponent implements OnInit {
  allItems     = signal<InventarioItem[]>([]);
  kpis         = signal<KpiData[]>([]);
  loading      = signal(true);
  ajusteModal  = signal(false);
  savingAjuste = signal(false);
  buscar       = '';
  estadoFilter = '';
  selectedItem: InventarioItem | null = null;
  ajusteTipo: 'entrada' | 'salida' = 'entrada';
  ajusteCantidad = 0;
  ajusteMotivo   = '';
  fmtN = fmtN;
  sVariant = stockVariant; sLabel = stockLabel;

  get criticos() { return () => this.allItems().filter(i => i.estado === 'critico' || i.estado === 'sin_stock').length; }

  get filteredItems() {
    return () => {
      let list = this.allItems();
      if (this.estadoFilter) list = list.filter(i => i.estado === this.estadoFilter);
      const b = this.buscar.toLowerCase();
      if (b) list = list.filter(i => i.nombre.toLowerCase().includes(b) || (i.codigo || '').toLowerCase().includes(b));
      return list;
    };
  }

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const data = await this.api.get<InventarioItem[]>('/inventario');
      this.allItems.set(data);
      const crit  = data.filter(i => i.estado === 'critico' || i.estado === 'sin_stock').length;
      const bajo  = data.filter(i => i.estado === 'bajo').length;
      const norm  = data.filter(i => i.estado === 'normal').length;
      this.kpis.set([
        { label: 'Total Productos', value: data.length, color: '#00C793' },
        { label: 'Críticos',        value: crit,        color: '#ef4444' },
        { label: 'Bajos',           value: bajo,        color: '#f59e0b' },
        { label: 'Normales',        value: norm,        color: '#10b981' },
      ]);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.loading.set(false); }
  }

  onAjuste(tipo: string, item: InventarioItem) {
    this.selectedItem   = item;
    this.ajusteTipo     = tipo === 'approve' ? 'entrada' : 'salida';
    this.ajusteCantidad = 0;
    this.ajusteMotivo   = '';
    this.ajusteModal.set(true);
  }

  async confirmarAjuste() {
    if (!this.selectedItem || !this.ajusteCantidad || this.ajusteCantidad <= 0) {
      this.toast.warning('Ingresa una cantidad válida'); return;
    }
    this.savingAjuste.set(true);
    try {
      await this.api.post('/inventario/ajuste', {
        producto_id: this.selectedItem.id,
        tipo: this.ajusteTipo,
        cantidad: this.ajusteCantidad,
        motivo: this.ajusteMotivo || this.ajusteTipo
      });
      this.toast.success(this.ajusteTipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada');
      this.ajusteModal.set(false);
      this.load();
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.savingAjuste.set(false); }
  }
}
