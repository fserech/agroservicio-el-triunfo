import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { BadgeComponent, stockVariant, stockLabel } from '../../components/shared/badge/badge';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ActionButtonsComponent } from '../../components/shared/action-buttons/action-buttons';
import { Producto, Categoria, KpiData } from '../../models';
import { fmtQ, fmtN } from '../../utils/format';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KpiCardComponent, BadgeComponent, PaginationComponent, EmptyStateComponent, ActionButtonsComponent],
  templateUrl: './productos.html',
})
export class ProductosComponent implements OnInit {
  productos   = signal<Producto[]>([]);
  categorias  = signal<Categoria[]>([]);
  kpis        = signal<KpiData[]>([]);
  loading     = signal(true);
  total       = signal(0);
  page        = signal(1);
  limit       = 15;
  buscar      = ''; catId = ''; activo = 'true';
  importModal = signal(false);
  dragOver    = signal(false);
  selectedFile = signal<File | null>(null);
  previewHeaders = signal<string[]>([]);
  previewRows    = signal<any[]>([]);
  importing   = signal(false);
  importResult = signal<{ created: number; updated: number; errors: number; errorDetails?: string[] } | null>(null);

  fmtQ = fmtQ; fmtN = fmtN;
  sVariant = stockVariant; sLabel = stockLabel;

  constructor(private api: ApiService, private toast: ToastService) {}

  async ngOnInit() {
    try { this.categorias.set(await this.api.get<Categoria[]>('/categorias')); } catch {}
    this.load(1);
  }

  async load(p: number) {
    this.page.set(p); this.loading.set(true);
    try {
      let q = `/productos?page=${p}&limit=${this.limit}&activo=${this.activo}`;
      if (this.buscar) q += `&buscar=${encodeURIComponent(this.buscar)}`;
      if (this.catId)  q += `&categoria=${this.catId}`;
      const data = await this.api.get<any>(q);
      this.productos.set(data.data); this.total.set(data.total);
      const m     = data.data.map((p: Producto) => +(p.margen || 0));
      const mProm = m.length ? (m.reduce((a: number, b: number) => a + b, 0) / m.length).toFixed(1) : 0;
      const crit  = data.data.filter((p: Producto) => p.estado_stock === 'critico' || p.estado_stock === 'sin_stock').length;
      this.kpis.set([
        { label: 'Productos',     value: data.total,  color: '#00C793' },
        { label: 'Margen Prom.',  value: mProm + '%', color: '#f59e0b' },
        { label: 'Stock Crítico', value: crit,        color: '#ef4444' },
      ]);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.loading.set(false); }
  }

  closeImport() {
    this.importModal.set(false);
    this.selectedFile.set(null);
    this.previewHeaders.set([]);
    this.previewRows.set([]);
    this.importResult.set(null);
    if (this.importResult()) this.load(1);
  }

  onFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(file);
  }

  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) this.setFile(file);
    else this.toast.warning('Solo se aceptan archivos .xlsx o .xls');
  }

  async setFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { this.toast.warning('El archivo excede 5MB'); return; }
    this.selectedFile.set(file);
    this.importResult.set(null);
    // Read preview using FileReader + parse as text for basic preview
    try {
      const preview = await this.api.uploadPreview(file);
      this.previewHeaders.set(preview.headers);
      this.previewRows.set(preview.rows);
    } catch { /* preview is optional */ }
  }

  downloadTemplate() {
    const token = (this.api as any).auth.token();
    const a = document.createElement('a');
    a.href = `/api/productos/plantilla-excel`;
    // Add auth header via fetch download
    fetch('/api/productos/plantilla-excel', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      a.href = url; a.download = 'plantilla-productos.xlsx';
      a.click(); URL.revokeObjectURL(url);
    }).catch(() => this.toast.error('Error descargando plantilla'));
  }

  async doImport() {
    if (!this.selectedFile()) return;
    this.importing.set(true);
    try {
      const result = await this.api.uploadFile<{ created: number; updated: number; errors: number; errorDetails?: string[] }>('/productos/importar-excel', this.selectedFile()!);
      this.importResult.set(result);
      if (result.created > 0 || result.updated > 0) {
        this.toast.success(`${result.created} creados, ${result.updated} actualizados`);
        this.load(1);
      }
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.importing.set(false); }
  }
}
