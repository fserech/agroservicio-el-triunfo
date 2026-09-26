import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast';
import { AuthService } from '../../services/auth';
import { KpiCardComponent } from '../../components/shared/kpi-card/kpi-card';
import { BadgeComponent } from '../../components/shared/badge/badge';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ActionButtonsComponent } from '../../components/shared/action-buttons/action-buttons';
import { ConfirmModalComponent } from '../../components/shared/confirm-modal/confirm-modal';
import { User, KpiData } from '../../models';
import { fmtDate } from '../../utils/format';

const ROL_LABEL:   Record<string, string> = { admin: 'Administrador', supervisor: 'Supervisor', vendedor: 'Vendedor', bodeguero: 'Bodeguero', contador: 'Contador' };
const ROL_VARIANT: Record<string, any>   = { admin: 'danger', supervisor: 'warning', vendedor: 'success', bodeguero: 'info', contador: 'gray' };
const ROL_COLORS:  Record<string, string> = { admin: '#ef4444', supervisor: '#f59e0b', vendedor: '#00C793', bodeguero: '#3887BF', contador: '#8b5cf6' };

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, RouterModule, KpiCardComponent, BadgeComponent, EmptyStateComponent, ActionButtonsComponent, ConfirmModalComponent],
  templateUrl: './usuarios.html',
})
export class UsuariosComponent implements OnInit {
  usuarios     = signal<User[]>([]);
  kpis         = signal<KpiData[]>([]);
  loading      = signal(true);
  confirmModal = signal(false);
  deletingUser: User | null = null;

  fmtDate = fmtDate;
  rolLabel(r: string)   { return ROL_LABEL[r]   || r; }
  rolVariant(r: string) { return ROL_VARIANT[r] || 'gray'; }
  rolColor(r: string)   { return ROL_COLORS[r]  || '#64748b'; }

  // Botones por usuario: siempre Editar; Eliminar solo si no es su propia cuenta
  userButtons(u: User) {
    const isSelf = u.id === this.auth.user()?.id;
    const btns: any[] = [
      { label: 'Editar', type: 'edit', icon: 'edit', routerLink: ['/usuarios', u.id, 'editar'] }
    ];
    // Solo admin puede eliminar; no puede eliminarse a sí mismo
    if (this.auth.user()?.rol === 'admin' && !isSelf) {
      btns.push({ label: 'Eliminar', type: 'delete', icon: 'delete' });
    }
    return btns;
  }

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private auth: AuthService
  ) {}

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const data = await this.api.get<User[]>('/usuarios');
      this.usuarios.set(data);
      const activos = data.filter(u => u.activo).length;
      const admins  = data.filter(u => u.rol === 'admin').length;
      this.kpis.set([
        { label: 'Total Usuarios', value: data.length,             color: '#00C793' },
        { label: 'Activos',        value: activos,                 color: '#10b981' },
        { label: 'Inactivos',      value: data.length - activos,   color: '#ef4444' },
        { label: 'Admins',         value: admins,                  color: '#3887BF' },
      ]);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.loading.set(false); }
  }

  onAction(type: string, u: User) {
    if (type === 'delete') {
      this.deletingUser = u;
      this.confirmModal.set(true);
    }
  }

  async confirmDelete() {
    if (!this.deletingUser) return;
    this.confirmModal.set(false);
    try {
      await this.api.delete(`/usuarios/${this.deletingUser.id}`);
      this.toast.success(`Usuario "${this.deletingUser.username}" eliminado`);
      this.deletingUser = null;
      await this.load();
    } catch(e: any) {
      this.toast.error(e.message);
    }
  }
}
