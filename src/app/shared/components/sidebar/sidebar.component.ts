// sidebar.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matDashboardOutline, matShoppingBagOutline, matReceiptLongOutline, matPeopleOutline,
  matInventory2Outline, matShoppingCartOutline, matHomeWorkOutline, matAssessmentOutline,
  matSettingsOutline, matPersonOutline, matAccountBalanceOutline,
  matChevronLeftOutline, matChevronRightOutline, matLogoutOutline
} from '@ng-icons/material-icons/outline';
import { AuthService } from '../../../core/services/services';
import { Usuario } from '../../../core/models/models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  providers: [provideIcons({
    matDashboardOutline, matShoppingBagOutline, matReceiptLongOutline, matPeopleOutline,
    matInventory2Outline, matShoppingCartOutline, matHomeWorkOutline, matAssessmentOutline,
    matSettingsOutline, matPersonOutline, matAccountBalanceOutline,
    matChevronLeftOutline, matChevronRightOutline, matLogoutOutline
  })],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  private auth = inject(AuthService);

  collapsed = false;
  user?: Usuario | null;

  get userInitials(): string {
    return this.user?.nombre?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  }

  navSections = [
    {
      label: 'Principal',
      items: [
        { label: 'Dashboard',  route: '/dashboard',  icon: 'matDashboardOutline' },
      ]
    },
    {
      label: 'Comercial',
      items: [
        { label: 'Ventas',     route: '/ventas',     icon: 'matShoppingBagOutline' },
        { label: 'Facturación',route: '/cuentas-cobrar', icon: 'matAccountBalanceOutline' },
        { label: 'Clientes',   route: '/clientes',   icon: 'matPeopleOutline' },
      ]
    },
    {
      label: 'Inventario',
      items: [
        { label: 'Productos',  route: '/productos',  icon: 'matInventory2Outline' },
        { label: 'Inventario', route: '/inventario', icon: 'matReceiptLongOutline', badge: '5', badgeType: 'danger' },
      ]
    },
    {
      label: 'Operaciones',
      items: [
        { label: 'Compras',    route: '/compras',    icon: 'matShoppingCartOutline', badge: '3', badgeType: 'warning' },
        { label: 'Proveedores',route: '/proveedores',icon: 'matHomeWorkOutline' },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { label: 'Reportes',   route: '/reportes',   icon: 'matAssessmentOutline' },
        { label: 'Usuarios',   route: '/usuarios',   icon: 'matPersonOutline' },
        { label: 'Configuración',route:'/configuracion', icon: 'matSettingsOutline' },
      ]
    }
  ];

  ngOnInit(): void { this.user = this.auth.user; }

  getRolLabel(rol?: string): string {
    return { admin: 'Administrador', supervisor: 'Supervisor', vendedor: 'Vendedor',
             bodeguero: 'Bodeguero', contador: 'Contador' }[rol || ''] || rol || '';
  }

  logout(): void { this.auth.logout(); }
}
