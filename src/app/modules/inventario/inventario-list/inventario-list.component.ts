import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { SearchInputTextComponent } from '../../../shared/components/search-input-text/search-input-text.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ChatBubbleComponent } from '../../../shared/components/chat-bubble/chat-bubble.component';
import {
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import {
  matSearchOutline, matSwapVertOutline, matHistoryOutline,
  matAddCircleOutline, matRemoveCircleOutline, matWarningOutline,
  matAddOutline, matArrowDownwardOutline, matArrowUpwardOutline,
  matCloseOutline
} from '@ng-icons/material-icons/outline';
import { InventarioService, ToastService } from '../../../core/services/services';
import { InventarioItem } from '../../../core/models/models';
import { OptionsChatBubble } from '../../../core/interfaces/options-chat-bubble';
import { ACTIONS_GRID_MAIN_VIEW } from '../../../core/constants/actions-menu';

@Component({
  selector: 'app-inventario-list',
  standalone: true,
  templateUrl: './inventario-list.component.html',
  styleUrls: ['./inventario-list.component.scss'],
  imports: [
    HeaderComponent, SearchInputTextComponent, NgIcon, ChatBubbleComponent,
    CommonModule, FormsModule, DecimalPipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  viewProviders: [provideIcons({
    matSearchOutline, matSwapVertOutline, matHistoryOutline,
    matAddCircleOutline, matRemoveCircleOutline, matWarningOutline,
    matAddOutline, matArrowDownwardOutline, matArrowUpwardOutline,
    matCloseOutline,
    bootstrapChevronLeft, bootstrapChevronRight,
    bootstrapChevronBarLeft, bootstrapChevronBarRight
  })]
})
export class InventarioListComponent implements OnInit {
  private svc    = inject(InventarioService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  form: FormGroup;
  estadoFilter: 'critico' | 'sin_stock' | 'bajo' | '' = '';

  items:    InventarioItem[] = [];
  filtered: InventarioItem[] = [];
  load      = false;
  page      = 1;
  pageSize  = 10;
  totalPages  = 0;
  totalItems  = 0;
  startIndex  = 0;
  endIndex    = 0;

  actionsGrid: OptionsChatBubble[] = ACTIONS_GRID_MAIN_VIEW;

  // ── Modal de ajuste ──────────────────────────────────────────
  modalItem:   InventarioItem | null = null;
  modalTipo:   'entrada' | 'salida' = 'entrada';
  modalCantidad = 1;
  modalMotivo   = '';
  savingAjuste  = false;

  get criticos() { return this.items.filter(i => i.estado === 'critico' || i.estado === 'sin_stock').length; }
  get bajos()    { return this.items.filter(i => i.estado === 'bajo').length; }
  get normales() { return this.items.filter(i => i.estado === 'normal').length; }

  constructor() {
    this.form = new FormGroup({ name: new FormControl() });
  }

  ngOnInit(): void { this.load = true; this.loadData(); }

  loadData(): void {
    this.load = true;
    const estado = this.estadoFilter || undefined;
    this.svc.getAll(estado).subscribe({
      next: r => {
        this.items = r;
        this.page  = 1;
        this.applyFilter();
        this.load = false;
      },
      error: () => { this.load = false; this.toast.error('Error cargando inventario'); }
    });
  }

  updateIndexes(): void {
    this.startIndex = this.totalItems === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
    this.endIndex   = Math.min(this.page * this.pageSize, this.totalItems);
  }

  applyFilter(): void {
    const s = (this.form.get('name')?.value || '').toLowerCase();
    const base = !s
      ? this.items
      : this.items.filter(i =>
          i.nombre?.toLowerCase().includes(s) ||
          (i as any).codigo?.toLowerCase().includes(s)
        );
    this.totalItems = base.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    this.filtered   = base.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
    this.updateIndexes();
  }

  introSearch(): void {
    const name = this.form.get('name')?.value;
    name && name !== '' ? this.filter() : this.initPage();
  }

  filter():   void { this.page = 1; this.applyFilter(); }
  initPage(): void { this.form.reset(); this.estadoFilter = ''; this.page = 1; this.loadData(); }

  onEstadoChange(val: string): void {
    this.estadoFilter = (val as any) || '';
    this.page = 1;
    this.loadData();
  }

  getEstadoLabel(e: string): string {
    return ({ critico: 'Crítico', sin_stock: 'Sin Stock', bajo: 'Bajo', normal: 'Normal' } as Record<string,string>)[e] || e;
  }

  selectOption(option: OptionsChatBubble): void {
    if (option.action === 'add')     this.openAjusteFor(option.id!, 'entrada');
    if (option.action === 'remove')  this.openAjusteFor(option.id!, 'salida');
    if (option.action === 'history') this.verMovimientosDe(option.id!);
  }

  // ── Modal ────────────────────────────────────────────────────
  openAjuste(): void {
    // Abre el modal sin producto preseleccionado (ajuste general)
    this.modalItem     = null;
    this.modalTipo     = 'entrada';
    this.modalCantidad = 1;
    this.modalMotivo   = '';
  }

  openAjusteFor(id: number, tipo: 'entrada' | 'salida'): void {
    const item = this.items.find(i => i.id === id) ?? null;
    this.modalItem     = item;
    this.modalTipo     = tipo;
    this.modalCantidad = 1;
    this.modalMotivo   = '';
    this.savingAjuste  = false;
  }

  closeModal(): void { this.modalItem = null; }

  saveAjuste(): void {
    if (!this.modalItem) return;
    if (!this.modalCantidad || this.modalCantidad <= 0) {
      this.toast.warning('La cantidad debe ser mayor a 0'); return;
    }
    if (this.modalTipo === 'salida' && this.modalCantidad > Number(this.modalItem.stock_actual)) {
      this.toast.warning(`Stock insuficiente: solo hay ${this.modalItem.stock_actual} ${this.modalItem.unidad_medida}`);
      return;
    }
    this.savingAjuste = true;
    this.svc.ajuste({
      producto_id: this.modalItem.id,
      tipo:        this.modalTipo,
      cantidad:    this.modalCantidad,
      motivo:      this.modalMotivo || `Ajuste manual ${this.modalTipo}`
    }).subscribe({
      next: () => {
        this.toast.success(`${this.modalTipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`);
        this.savingAjuste = false;
        this.closeModal();
        this.loadData();
      },
      error: e => {
        this.savingAjuste = false;
        this.toast.error(e?.error?.error || 'Error en ajuste');
      }
    });
  }

  verMovimientosDe(id: number): void {
    this.router.navigate(['/inventario'], { queryParams: { producto: id } });
  }

  nextPage():     void { if (this.page < this.totalPages) { this.page++; this.applyFilter(); } }
  previousPage(): void { if (this.page > 1)               { this.page--; this.applyFilter(); } }
  firstPage():    void { this.page = 1;               this.applyFilter(); }
  lastPage():     void { this.page = this.totalPages; this.applyFilter(); }
}