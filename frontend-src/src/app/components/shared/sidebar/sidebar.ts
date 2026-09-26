import { Component, Output, EventEmitter, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { filter } from 'rxjs/operators';

interface NavItem { label: string; route: string; icon: string; group: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() open = false;
  @Output() closeEvent = new EventEmitter<void>();

  isDesktop = false;
  currentRoute = '';
  private resizeListener!: () => void;

  navItems: NavItem[] = [
    { label: 'Dashboard',          route: '/dashboard',       icon: '📊', group: 'Principal' },
    { label: 'Ventas',             route: '/ventas',          icon: '🛒', group: 'Comercial' },
    { label: 'Clientes',           route: '/clientes',        icon: '👥', group: 'Comercial' },
    { label: 'Cuentas por Cobrar', route: '/cuentas-cobrar', icon: '💳', group: 'Comercial' },
    { label: 'Productos',          route: '/productos',       icon: '📦', group: 'Catálogo' },
    { label: 'Categorías',         route: '/categorias',      icon: '🏷️', group: 'Catálogo' },
    { label: 'Inventario',         route: '/inventario',      icon: '🏪', group: 'Catálogo' },
    { label: 'Compras',            route: '/compras',         icon: '📋', group: 'Abastecimiento' },
    { label: 'Proveedores',        route: '/proveedores',     icon: '🚚', group: 'Abastecimiento' },
    { label: 'Usuarios',           route: '/usuarios',        icon: '🔐', group: 'Sistema' },
  ];

  get groups(): string[] { return [...new Set(this.navItems.map(i => i.group))]; }
  getGroupItems(group: string) { return this.navItems.filter(i => i.group === group); }
  get userInitial() { return (this.authService.user()?.nombre || 'U').charAt(0).toUpperCase(); }
  isActive(route: string): boolean { return this.currentRoute.startsWith(route); }

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.isDesktop = window.innerWidth >= 1024;
    this.currentRoute = this.router.url;
    this.resizeListener = () => { this.isDesktop = window.innerWidth >= 1024; };
    window.addEventListener('resize', this.resizeListener);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => { this.currentRoute = e.urlAfterRedirects; });
  }

  ngOnDestroy() { window.removeEventListener('resize', this.resizeListener); }
  logout() { this.authService.logout().then(() => this.router.navigate(['/login'])); }
}
