// sidebar.component.ts — Diseño Librería Yami + navegación Agroservicio
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matDashboardOutline, matShoppingBagOutline, matPeopleOutline,
  matInventory2Outline, matShoppingCartOutline, matHomeWorkOutline,
  matAssessmentOutline, matSettingsOutline, matPersonOutline,
  matAccountBalanceOutline, matKeyboardDoubleArrowLeftOutline,
  matLogOutOutline, matReceiptLongOutline,
  matHomeOutline, matGroupOutline, matGroupsOutline,
  matLoyaltyOutline, matLocalShippingOutline, matTodayOutline,
  matReceiptOutline, matAddShoppingCartOutline, matCategoryOutline
} from '@ng-icons/material-icons/outline';
import { matDarkModeRound, matLightModeRound } from '@ng-icons/material-icons/round';
import { AuthService, ToastService } from '../../../core/services/services';
import { ThemeService } from '../../../core/services/theme.service';
import { Usuario } from '../../../core/models/models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  providers: [provideIcons({
    matDashboardOutline, matShoppingBagOutline, matPeopleOutline,
    matInventory2Outline, matShoppingCartOutline, matHomeWorkOutline,
    matAssessmentOutline, matSettingsOutline, matPersonOutline,
    matAccountBalanceOutline, matKeyboardDoubleArrowLeftOutline,
    matLogOutOutline, matReceiptLongOutline,
    matHomeOutline, matGroupOutline, matGroupsOutline,
    matLoyaltyOutline, matLocalShippingOutline, matTodayOutline,
    matReceiptOutline, matAddShoppingCartOutline, matCategoryOutline,
    matDarkModeRound, matLightModeRound
  })],
  template: `
    <nav [ngClass]="showSideBar ? 'w-52 xl:w-64' : 'w-[70px]'"
      class="hidden h-full flex-col justify-between overflow-auto bg-white pt-3 transition-all duration-300
             scrollbar-thin scrollbar-track-gray-50 scrollbar-thumb-gray-100
             dark:bg-slate-900 dark:scrollbar-thumb-slate-800 dark:scrollbar-track-slate-950
             border dark:border-slate-800 lg:flex">
      <div class="px-4">

        <!-- Logo -->
        <div class="relative h-10 mb-2">
          <div *ngIf="showSideBar" class="flex items-center">
            <div class="flex items-center justify-center rounded p-1">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                   style="background: linear-gradient(135deg, #00C793, #009e75);">
                <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
                  <path d="M12 2C8 2 4 6 4 10c0 6 8 12 8 12s8-6 8-12c0-4-4-8-8-8zm0 10a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </div>
              <div class="ml-2">
                <div class="text-xs font-bold text-gray-700 dark:text-gray-200">El Triunfo</div>
                <div class="text-xs text-gray-400 dark:text-gray-500">Agroservicio</div>
              </div>
            </div>
          </div>
          <button (click)="toggleSidebar()"
            class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded
                   text-gray-400 transition-all duration-200 hover:text-gray-500
                   dark:text-slate-400 dark:hover:text-slate-300"
            [ngClass]="{ 'rotate-180': !showSideBar }">
            <ng-icon name="matKeyboardDoubleArrowLeftOutline" class="text-2xl"></ng-icon>
          </button>
        </div>

        <!-- Separator -->
        <div class="pt-3">
          <hr class="border-dashed border-gray-200 dark:border-slate-500"/>
        </div>

        <!-- Menu Items -->
        <div class="pt-4">
          <div *ngIf="showSideBar" class="mx-1 mb-2 flex items-center justify-between">
            <small class="text-xs font-semibold text-gray-400 dark:text-slate-200">Dashboard</small>
          </div>
          <ul class="flex flex-col space-y-1">
            <li *ngFor="let item of menuItems">
              <a [routerLink]="item.route" routerLinkActive="active-item-menu"
                 class="group relative text-gray-400 dark:text-slate-400 flex h-9 cursor-pointer
                        items-center truncate justify-start pl-2 tracking-wide rounded
                        text-xs font-semibold ml-2 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-950">
                <div class="pointer-events-none absolute m-2">
                  <ng-icon [name]="item.icon" size="20"></ng-icon>
                </div>
                <span *ngIf="showSideBar" class="ml-9">{{ item.label }}</span>
                <!-- Tooltip cuando está colapsado -->
                <div *ngIf="!showSideBar" class="fixed w-full z-50">
                  <span class="absolute left-14 -top-[34px] w-auto min-w-max origin-left scale-0 rounded-md
                               bg-black p-2 text-xs font-bold text-white shadow-md
                               transition-all duration-200 group-hover:scale-100
                               dark:bg-white dark:text-slate-900">
                    {{ item.label }}
                  </span>
                </div>
              </a>
            </li>
          </ul>
        </div>

      </div>

      <!-- Footer: usuario + tema -->
      <div class="border-t dark:border-slate-800 p-3 mt-4">
        <div *ngIf="showSideBar" class="flex items-center gap-2 mb-2">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
               style="background: linear-gradient(135deg, #00C793, #009e75);">
            {{ userInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">{{ user?.nombre }}</div>
            <div class="text-xs text-gray-400 dark:text-gray-500">{{ getRolLabel(user?.rol) }}</div>
          </div>
        </div>
        <div class="flex gap-1" [class.justify-center]="!showSideBar">
          <button (click)="toggleTheme()"
            class="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-gray-600
                   hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-950">
            <ng-icon [name]="isDark ? 'matLightModeRound' : 'matDarkModeRound'" size="18"
                     [ngClass]="{'text-yellow-500': isDark}"></ng-icon>
          </button>
          <button (click)="logout()"
            class="flex h-8 w-8 items-center justify-center rounded text-red-400 hover:bg-red-50 dark:hover:bg-slate-950">
            <ng-icon name="matLogOutOutline" size="18"></ng-icon>
          </button>
        </div>
      </div>
    </nav>

    <!-- MOBILE BOTTOM NAVBAR -->
    <section class="fixed bottom-0 z-10 block w-full h-16 shadow bg-white border-t p-0 dark:bg-slate-950 lg:hidden">
      <div class="flex justify-around text-xs font-semibold text-gray-600 dark:text-slate-300 h-full">
        <a *ngFor="let item of mobileItems"
           [routerLink]="item.route" routerLinkActive="active-item"
           class="flex flex-col items-center justify-center px-2 py-1 text-center
                  hover:text-gray-800 hover:dark:text-slate-100 flex-1">
          <ng-icon [name]="item.icon" size="24" class="text-gray-400"></ng-icon>
          <span class="text-gray-400 text-xs mt-0.5">{{ item.label }}</span>
        </a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: contents; }

    .active-item-menu {
      @apply dark:text-white bg-gray-100 dark:bg-slate-800;
      color: #00C793 !important;
    }

    .active-item {
      @apply dark:text-white bg-gray-200 dark:bg-slate-800 border dark:border-slate-800 rounded-lg;
    }
  `]
})
export class SidebarComponent implements OnInit {
  private auth     = inject(AuthService);
  private theme    = inject(ThemeService);

  showSideBar = true;
  user?: Usuario | null;

  get isDark()       { return this.theme.isDark; }
  get userInitials() {
    return this.user?.nombre?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  }

  menuItems = [
    { label: 'Inicio',        route: '/dashboard',       icon: 'matHomeOutline' },
    { label: 'Ventas',        route: '/ventas',          icon: 'matShoppingBagOutline' },
    { label: 'Clientes',      route: '/clientes',        icon: 'matGroupsOutline' },
    { label: 'Productos',     route: '/productos',       icon: 'matLoyaltyOutline' },
    { label: 'Inventario',    route: '/inventario',      icon: 'matInventory2Outline' },
    { label: 'Compras',       route: '/compras',         icon: 'matAddShoppingCartOutline' },
    { label: 'Proveedores',   route: '/proveedores',     icon: 'matLocalShippingOutline' },
    { label: 'Por Cobrar',    route: '/cuentas-cobrar',  icon: 'matReceiptOutline' },
    { label: 'Reportes',      route: '/reportes',        icon: 'matAssessmentOutline' },
    { label: 'Usuarios',      route: '/usuarios',        icon: 'matGroupOutline' },
    { label: 'Configuración', route: '/configuracion',   icon: 'matSettingsOutline' },
  ];

  mobileItems = [
    { label: 'Inicio',     route: '/dashboard',  icon: 'matHomeOutline' },
    { label: 'Ventas',     route: '/ventas',     icon: 'matShoppingBagOutline' },
    { label: 'Productos',  route: '/productos',  icon: 'matLoyaltyOutline' },
    { label: 'Inventario', route: '/inventario', icon: 'matInventory2Outline' },
    { label: 'Compras',    route: '/compras',    icon: 'matAddShoppingCartOutline' },
  ];

  ngOnInit(): void { this.user = this.auth.user; }

  toggleSidebar(): void { this.showSideBar = !this.showSideBar; }

  toggleTheme(): void {
    this.theme.theme = !this.isDark ? 'dark' : 'light';
  }

  getRolLabel(rol?: string): string {
    return {
      admin: 'Administrador', supervisor: 'Supervisor',
      vendedor: 'Vendedor', bodeguero: 'Bodeguero', contador: 'Contador'
    }[rol || ''] || rol || '';
  }

  logout(): void { this.auth.logout(); }
}
