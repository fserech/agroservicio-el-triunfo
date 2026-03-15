import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ChatBubbleComponent } from '../../../shared/components/chat-bubble/chat-bubble.component';
import {
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import {
  matSearchOutline, matSwapVertOutline, matHistoryOutline,
  matAddCircleOutline, matRemoveCircleOutline, matWarningOutline,
  matAddOutline, matArrowDownwardOutline, matArrowUpwardOutline
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
    HeaderComponent, NgIcon, ChatBubbleComponent,
    CommonModule, FormsModule, DecimalPipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  viewProviders: [provideIcons({
    matSearchOutline, matSwapVertOutline, matHistoryOutline,
    matAddCircleOutline, matRemoveCircleOutline, matWarningOutline,
    matAddOutline, matArrowDownwardOutline, matArrowUpwardOutline,
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

  // Datos y paginación — mismo patrón que ClientesListComponent
  items:     InventarioItem[] = [];
  filtered:  InventarioItem[] = [];
  load        = false;
  page        = 1;
  pageSize    = 10;
  totalPages  = 0;
  totalItems  = 0;
  startIndex  = 0;
  endIndex    = 0;

  actionsGrid: OptionsChatBubble[] = ACTIONS_GRID_MAIN_VIEW;

  get criticos() { return this.items.filter(i => i.estado === 'critico' || i.estado === 'sin_stock').length; }
  get bajos()    { return this.items.filter(i => i.estado === 'bajo').length; }
  get normales() { return this.items.filter(i => i.estado === 'normal').length; }

  constructor() {
    this.form = new FormGroup({ name: new FormControl() });
  }

  ngOnInit(): void {
    this.load = true;
    this.loadData();
  }

  loadData(): void {
    this.load = true;
    const estado = this.estadoFilter || undefined;
    this.svc.getAll(estado).subscribe({
      next: r => {
        this.items     = r;
        this.applyFilter();
        this.totalItems  = this.filtered.length;
        this.totalPages  = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        this.page        = 1;
        this.updateIndexes();
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
    // Paginación en cliente sobre el array filtrado
    this.totalItems = base.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    this.filtered   = base.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
    this.updateIndexes();
  }

  introSearch(): void {
    const name = this.form.get('name')?.value;
    name && name !== '' ? this.filter() : this.initPage();
  }

  filter(): void {
    this.page = 1;
    this.applyFilter();
  }

  initPage(): void {
    this.form.reset();
    this.estadoFilter = '';
    this.page = 1;
    this.loadData();
  }

  onEstadoChange(val: string): void {
    this.estadoFilter = (val as any) || '';
    this.page = 1;
    this.loadData();
  }

  getEstadoLabel(e: string): string {
    return { critico: 'Crítico', sin_stock: 'Sin Stock', bajo: 'Bajo', normal: 'Normal' }[e] || e;
  }

  selectOption(option: OptionsChatBubble): void {
    if (option.action === 'add')     this.openAjusteFor(option.id!, 'entrada');
    if (option.action === 'remove')  this.openAjusteFor(option.id!, 'salida');
    if (option.action === 'history') this.verMovimientosDe(option.id!);
  }

  openAjuste(): void {
    this.toast.info('Usa los botones + / - en cada producto');
  }

  openAjusteFor(id: number, tipo: 'entrada' | 'salida'): void {
    const cantStr = prompt(`Cantidad a ${tipo === 'entrada' ? 'ingresar' : 'descontar'}:`);
    if (!cantStr || isNaN(+cantStr) || +cantStr <= 0) return;
    this.svc.ajuste({
      producto_id: id,
      tipo,
      cantidad: +cantStr,
      motivo: `Ajuste manual ${tipo}`
    }).subscribe({
      next:  () => { this.toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada`); this.loadData(); },
      error: e  => this.toast.error(e?.error?.error || 'Error en ajuste')
    });
  }

  verMovimientosDe(id: number): void {
    this.router.navigate(['/inventario'], { queryParams: { producto: id } });
  }

  // Paginación — mismo patrón que ClientesListComponent
  nextPage():     void { if (this.page < this.totalPages) { this.page++; this.applyFilter(); } }
  previousPage(): void { if (this.page > 1)               { this.page--; this.applyFilter(); } }
  firstPage():    void { this.page = 1;               this.applyFilter(); }
  lastPage():     void { this.page = this.totalPages; this.applyFilter(); }
}