import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { SearchInputTextComponent } from '../../../shared/components/search-input-text/search-input-text.component';
import { NgClass, DecimalPipe, CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ChatBubbleComponent } from '../../../shared/components/chat-bubble/chat-bubble.component';
import {
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import {
  matSearchOutline, matFilterAltOutline, matAddOutline,
  matArrowDownwardOutline, matArrowUpwardOutline,
  matDeleteOutline, matModeEditOutline, matRemoveRedEyeOutline
} from '@ng-icons/material-icons/outline';
import { Router } from '@angular/router';
import { ClientesService, ToastService } from '../../../core/services/services';
import { Cliente } from '../../../core/models/models';
import { OptionsChatBubble } from '../../../core/interfaces/options-chat-bubble';
import { ACTIONS_GRID_MAIN_VIEW } from '../../../core/constants/actions-menu';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  templateUrl: './clientes-list.component.html',
  styleUrls: ['./clientes-list.component.scss'],
  imports: [
    HeaderComponent, SearchInputTextComponent, NgIcon, ChatBubbleComponent,
    NgClass, CommonModule, FormsModule, DecimalPipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  viewProviders: [provideIcons({
    matSearchOutline, matFilterAltOutline, matAddOutline,
    matArrowDownwardOutline, matArrowUpwardOutline,
    matDeleteOutline, matModeEditOutline, matRemoveRedEyeOutline,
    bootstrapChevronLeft, bootstrapChevronRight,
    bootstrapChevronBarLeft, bootstrapChevronBarRight
  })]
})
export class ClientesListComponent implements OnInit {
  private svc    = inject(ClientesService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  form: FormGroup;
  tipoFilter = '';

  ItemsList: Cliente[] = [];
  load        = false;
  page        = 1;
  pageSize    = 10;
  totalPages  = 0;
  totalItems  = 0;
  startIndex  = 0;
  endIndex    = 0;
  filters     = '';

  sortConfig: { sortBy: string; sortOrder: 'asc' | 'desc' } = {
    sortBy: 'nombre', sortOrder: 'asc'
  };

  actionsGrid: OptionsChatBubble[] = ACTIONS_GRID_MAIN_VIEW;

  get totalFacturado() { return this.ItemsList.reduce((a, c) => a + Number(c.total_compras   || 0), 0); }
  get saldoPendiente() { return this.ItemsList.reduce((a, c) => a + Number(c.saldo_pendiente  || 0), 0); }
  get conCredito()     { return this.ItemsList.filter(c => Number(c.credito_maximo) > 0).length; }

  constructor() {
    this.form = new FormGroup({ name: new FormControl() });
  }

  ngOnInit(): void {
    this.load = true;
    this.getPageItems(this.sortConfig.sortOrder, this.sortConfig.sortBy, this.page, this.pageSize);
  }

  getPageItems(sortOrder: string, sortBy: string, page: number, pageSize: number, filters = ''): void {
    this.load = true;
    const nombre = this.form.get('name')?.value || '';
    this.svc.getAll(nombre, this.tipoFilter, page, pageSize).subscribe({
      next: r => {
        this.ItemsList = r.data.map(c => ({
          ...c,
          total_compras:   Number(c.total_compras   ?? 0),
          saldo_pendiente: Number(c.saldo_pendiente  ?? 0),
          credito_maximo:  Number(c.credito_maximo   ?? 0),
          dias_credito:    Number(c.dias_credito     ?? 0),
        }));
        this.totalPages = Math.max(1, Math.ceil(r.total / pageSize));
        this.totalItems = r.total;
        this.page       = page;
        this.sortConfig = { sortBy, sortOrder: sortOrder as 'asc' | 'desc' };
        this.updateIndexes();
        this.load = false;
      },
      error: () => { this.load = false; this.toast.error('Error cargando clientes'); }
    });
  }

  updateIndexes(): void {
    this.startIndex = (this.page - 1) * this.pageSize + 1;
    this.endIndex   = Math.min(this.page * this.pageSize, this.totalItems);
  }

  introSearch(): void {
    const name = this.form.get('name')?.value;
    if (name && name !== '') { this.filter(name); } else { this.initPage(); }
  }

  filter(name?: string): void {
    this.filters = name ? `&name=${name}` : '';
    this.getPageItems(this.sortConfig.sortOrder, this.sortConfig.sortBy, 1, this.pageSize, this.filters);
  }

  initPage(): void {
    this.form.reset();
    this.filters = '';
    this.getPageItems(this.sortConfig.sortOrder, this.sortConfig.sortBy, 1, this.pageSize);
  }

  changeSortOrderBy(field: string): void {
    if (field === this.sortConfig.sortBy) {
      this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.sortBy    = field;
      this.sortConfig.sortOrder = 'asc';
    }
    this.getPageItems(this.sortConfig.sortOrder, this.sortConfig.sortBy, this.page, this.pageSize, this.filters);
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    this.svc.delete(id).subscribe({
      next:  () => { this.toast.success('Cliente eliminado'); this.getPageItems(this.sortConfig.sortOrder, this.sortConfig.sortBy, this.page, this.pageSize, this.filters); },
      error: (e) => this.toast.error(e?.error?.error || 'Error al eliminar')
    });
  }

  selectOption(option: OptionsChatBubble): void {
    if (option.action === 'view')   this.view(option.id!);
    if (option.action === 'edit')   this.edit(option.id!);
    if (option.action === 'delete') this.delete(option.id!);
  }

  getTipoLabel(t: string): string {
    return ({ individual: 'Individual', empresa: 'Empresa',
              cooperativa: 'Cooperativa', finca: 'Finca' } as Record<string,string>)[t] || t || 'N/A';
  }

  add():            void { this.router.navigate(['/clientes/nuevo']); }
  view(id: number): void { this.router.navigate(['/clientes', id]); }
  edit(id: number): void { this.router.navigate(['/clientes', id, 'editar']); }

  nextPage():     void { if (this.page < this.totalPages) this.getPageItems(this.sortConfig.sortOrder, this.sortConfig.sortBy, this.page + 1, this.pageSize, this.filters); }
  previousPage(): void { if (this.page > 1)              this.getPageItems(this.sortConfig.sortOrder, this.sortConfig.sortBy, this.page - 1, this.pageSize, this.filters); }
  firstPage():    void { this.getPageItems(this.sortConfig.sortOrder, this.sortConfig.sortBy, 1,               this.pageSize, this.filters); }
  lastPage():     void { this.getPageItems(this.sortConfig.sortOrder, this.sortConfig.sortBy, this.totalPages, this.pageSize, this.filters); }
}