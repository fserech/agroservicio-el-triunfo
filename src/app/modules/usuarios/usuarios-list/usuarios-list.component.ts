// usuarios-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matAddOutline, matModeEditOutline } from '@ng-icons/material-icons/outline';
import { bootstrapToggleOn, bootstrapToggleOff } from '@ng-icons/bootstrap-icons';
import { UsuariosService, ToastService } from '../../../core/services/services';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { Usuario } from '../../../core/models/models';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, NgIconComponent, DatePipe, HeaderComponent],
  providers: [provideIcons({ matAddOutline, matModeEditOutline, bootstrapToggleOn, bootstrapToggleOff })],
  templateUrl: './usuarios-list.component.html',
  styleUrls: ['./usuarios-list.component.scss']
})
export class UsuariosListComponent implements OnInit {
  private svc    = inject(UsuariosService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items: Usuario[] = [];
  load = false;

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    this.svc.getAll().subscribe({
      next:  r => { this.items = r; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando usuarios'); }
    });
  }

  getRolLabel(rol: string): string {
    return {
      admin: 'Administrador', supervisor: 'Supervisor',
      vendedor: 'Vendedor', bodeguero: 'Bodeguero', contador: 'Contador'
    }[rol] || rol;
  }

  add():          void { this.router.navigate(['/usuarios/nuevo']); }
  edit(id:number):void { this.router.navigate(['/usuarios', id, 'editar']); }

  toggleActivo(u: Usuario): void {
    this.svc.update(u.id, { ...u, activo: !u.activo }).subscribe({
      next:  r => { u.activo = r.activo; this.toast.success(`Usuario ${r.activo ? 'activado' : 'desactivado'}`); },
      error: e  => this.toast.error(e?.error?.error || 'Error')
    });
  }
}
