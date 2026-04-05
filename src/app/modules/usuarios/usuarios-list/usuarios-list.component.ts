import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matAddOutline, matModeEditOutline,
  matArrowDownwardOutline, matArrowUpwardOutline
} from '@ng-icons/material-icons/outline';
import {
  bootstrapChevronLeft, bootstrapChevronRight,
  bootstrapChevronBarLeft, bootstrapChevronBarRight
} from '@ng-icons/bootstrap-icons';
import { UsuariosService, ToastService } from '../../../core/services/services';
import { Usuario } from '../../../core/models/models';

@Component({
  selector: 'app-usuarios-list', standalone: true,
  imports: [HeaderComponent, CommonModule, NgIconComponent, DatePipe],
  providers: [provideIcons({
    matAddOutline, matModeEditOutline,
    matArrowDownwardOutline, matArrowUpwardOutline,
    bootstrapChevronLeft, bootstrapChevronRight,
    bootstrapChevronBarLeft, bootstrapChevronBarRight
  })],
  templateUrl: './usuarios-list.component.html', styleUrls: ['./usuarios-list.component.scss']
})
export class UsuariosListComponent implements OnInit {
  private svc    = inject(UsuariosService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items: Usuario[] = []; load = false;
  sortConfig = { sortBy: 'nombre', sortOrder: 'asc' };

  get activos()   { return this.items.filter(u => u.activo).length; }
  get inactivos() { return this.items.filter(u => !u.activo).length; }

  ngOnInit(): void { this.loadData(); }
  loadData(): void {
    this.load = true;
    this.svc.getAll().subscribe({
      next: r => { this.items = r; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando usuarios'); }
    });
  }
  changeSortOrderBy(field: string): void {
    if (this.sortConfig.sortBy === field) { this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc'; }
    else { this.sortConfig.sortBy = field; this.sortConfig.sortOrder = 'asc'; }
    this.items = [...this.items].sort((a: any, b: any) => {
      const cmp = (a[field]??'') > (b[field]??'') ? 1 : (a[field]??'') < (b[field]??'') ? -1 : 0;
      return this.sortConfig.sortOrder === 'asc' ? cmp : -cmp;
    });
  }
  getRolLabel(r: string): string {
    return ({admin:'Administrador',supervisor:'Supervisor',vendedor:'Vendedor',bodeguero:'Bodeguero',contador:'Contador'} as any)[r] || r;
  }
  getRolClass(r: string): string {
    return ({admin:'badge-danger',supervisor:'badge-warning',vendedor:'badge-success',bodeguero:'badge-info',contador:'badge-gray'} as any)[r] || 'badge-gray';
  }
  add():            void { this.router.navigate(['/usuarios/nuevo']); }
  edit(id: number): void { this.router.navigate(['/usuarios', id, 'editar']); }
}