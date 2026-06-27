import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth';

const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) { router.navigate(['/login']); return false; }
  return true;
};
const loginGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) { router.navigate(['/dashboard']); return false; }
  return true;
};

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/layout/layout').then(m => m.LayoutComponent),
    children: [
      { path: 'dashboard',     loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'ventas',        loadComponent: () => import('./pages/ventas/ventas').then(m => m.VentasComponent) },
      { path: 'ventas/nueva',  loadComponent: () => import('./pages/ventas/venta-form/venta-form').then(m => m.VentaFormComponent) },
      { path: 'clientes',      loadComponent: () => import('./pages/clientes/clientes').then(m => m.ClientesComponent) },
      { path: 'clientes/nuevo',      loadComponent: () => import('./pages/clientes/cliente-form/cliente-form').then(m => m.ClienteFormComponent) },
      { path: 'clientes/:id/editar', loadComponent: () => import('./pages/clientes/cliente-form/cliente-form').then(m => m.ClienteFormComponent) },
      { path: 'productos',     loadComponent: () => import('./pages/productos/productos').then(m => m.ProductosComponent) },
      { path: 'productos/nuevo',      loadComponent: () => import('./pages/productos/producto-form/producto-form').then(m => m.ProductoFormComponent) },
      { path: 'productos/:id/editar', loadComponent: () => import('./pages/productos/producto-form/producto-form').then(m => m.ProductoFormComponent) },
      { path: 'categorias',    loadComponent: () => import('./pages/categorias/categorias').then(m => m.CategoriasComponent) },
      { path: 'inventario',    loadComponent: () => import('./pages/inventario/inventario').then(m => m.InventarioComponent) },
      { path: 'compras',       loadComponent: () => import('./pages/compras/compras').then(m => m.ComprasComponent) },
      { path: 'compras/nueva', loadComponent: () => import('./pages/compras/compra-form/compra-form').then(m => m.CompraFormComponent) },
      { path: 'proveedores',   loadComponent: () => import('./pages/proveedores/proveedores').then(m => m.ProveedoresComponent) },
      { path: 'proveedores/nuevo',      loadComponent: () => import('./pages/proveedores/proveedor-form/proveedor-form').then(m => m.ProveedorFormComponent) },
      { path: 'proveedores/:id/editar', loadComponent: () => import('./pages/proveedores/proveedor-form/proveedor-form').then(m => m.ProveedorFormComponent) },
      { path: 'cuentas-cobrar', loadComponent: () => import('./pages/cuentas-cobrar/cuentas-cobrar').then(m => m.CuentasCobrarComponent) },
      { path: 'usuarios',      loadComponent: () => import('./pages/usuarios/usuarios').then(m => m.UsuariosComponent) },
      { path: 'usuarios/nuevo',      loadComponent: () => import('./pages/usuarios/usuario-form/usuario-form').then(m => m.UsuarioFormComponent) },
      { path: 'usuarios/:id/editar', loadComponent: () => import('./pages/usuarios/usuario-form/usuario-form').then(m => m.UsuarioFormComponent) },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
