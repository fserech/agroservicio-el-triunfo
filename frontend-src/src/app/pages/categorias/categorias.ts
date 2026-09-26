import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast';
import { ConfirmModalComponent } from '../../components/shared/confirm-modal/confirm-modal';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ActionButtonsComponent, ActionButton } from '../../components/shared/action-buttons/action-buttons';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { KpiData } from '../../models';

interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  productos_count?: number;
}

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmModalComponent, EmptyStateComponent, ActionButtonsComponent, KpiCardComponent],
  templateUrl: './categorias.html',
})
export class CategoriasComponent implements OnInit {
  categorias = signal<Categoria[]>([]);
  kpis       = signal<KpiData[]>([]);
  loading    = signal(true);
  formModal  = signal(false);
  confirmModal = signal(false);
  saving     = signal(false);
  buscar     = '';
  editingId: number | null = null;
  deletingCat: Categoria | null = null;
  formNombre = '';
  formDesc   = '';

  editButtons: ActionButton[] = [
    { label: 'Editar',    type: 'edit',   icon: 'edit' },
    { label: 'Eliminar',  type: 'delete', icon: 'delete' },
  ];

  get filtered() {
    return () => {
      const b = this.buscar.toLowerCase();
      return b ? this.categorias().filter(c => c.nombre.toLowerCase().includes(b)) : this.categorias();
    };
  }

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const data = await this.api.get<any[]>('/categorias');
      // Enrich with product count
      let prods: any[] = [];
      try { prods = (await this.api.get<any>('/productos?limit=500')).data; } catch {}
      const countMap: Record<number, number> = {};
      prods.forEach((p: any) => { if (p.categoria_id) countMap[p.categoria_id] = (countMap[p.categoria_id] || 0) + 1; });
      const enriched = data.map(c => ({ ...c, productos_count: countMap[c.id] || 0 }));
      this.categorias.set(enriched);
      const conProds = enriched.filter(c => (c.productos_count || 0) > 0).length;
      this.kpis.set([
        { label: 'Total Categorías', value: enriched.length,   color: '#00C793' },
        { label: 'Con Productos',    value: conProds,           color: '#3887BF' },
        { label: 'Sin Productos',    value: enriched.length - conProds, color: '#f59e0b' },
      ]);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.loading.set(false); }
  }

  openModal(cat?: Categoria) {
    this.editingId  = cat?.id ?? null;
    this.formNombre = cat?.nombre ?? '';
    this.formDesc   = cat?.descripcion ?? '';
    this.formModal.set(true);
  }

  closeModal() { this.formModal.set(false); }

  async save() {
    if (!this.formNombre.trim()) { this.toast.warning('El nombre es requerido'); return; }
    this.saving.set(true);
    try {
      const body = { nombre: this.formNombre.trim(), descripcion: this.formDesc.trim() };
      if (this.editingId) {
        await this.api.put(`/categorias/${this.editingId}`, body);
        this.toast.success('Categoría actualizada');
      } else {
        await this.api.post('/categorias', body);
        this.toast.success('Categoría creada');
      }
      this.closeModal();
      this.load();
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.saving.set(false); }
  }

  onAction(type: string, cat: Categoria) {
    if (type === 'edit')   { this.openModal(cat); }
    if (type === 'delete') { this.deletingCat = cat; this.confirmModal.set(true); }
  }

  async confirmDelete() {
    if (!this.deletingCat) return;
    this.confirmModal.set(false);
    try {
      await this.api.delete(`/categorias/${this.deletingCat.id}`);
      this.toast.success('Categoría eliminada');
      this.load();
    } catch(e: any) { this.toast.error(e.message); }
  }

  catIcon(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('fertiliz')) return '🌿';
    if (n.includes('agroqu') || n.includes('herbic') || n.includes('fung')) return '🧪';
    if (n.includes('semilla')) return '🌱';
    if (n.includes('herram')) return '🔧';
    if (n.includes('equip')) return '⚙️';
    if (n.includes('riego')) return '💧';
    if (n.includes('veterin')) return '🩺';
    if (n.includes('empaque')) return '📦';
    if (n.includes('insect') || n.includes('plaguic')) return '🐛';
    return '🏷️';
  }

  catColor(nombre: string): string {
    const colors = ['#00C793','#3887BF','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#10b981','#f97316'];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
}
