// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Auth (sin guard)
  { path: 'auth/login', loadComponent: () => import('./modules/auth/login/login.component').then(m => m.LoginComponent) },

  // App layout (con guard)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: 'dashboard',     loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent) },

      // VENTAS
      { path: 'ventas',        loadComponent: () => import('./modules/ventas/ventas-list/ventas-list.component').then(m => m.VentasListComponent) }, 
      { path: 'ventas/nuevo',  loadComponent: () => import('./modules/ventas/ventas-form/ventas-form.component').then(m => m.VentasFormComponent) },
      { path: 'ventas/:id', loadComponent: () => import('./modules/ventas/ventas-detail/ventas-detail.component').then(m => m.VentasDetailComponent) },

      // CLIENTES
      { path: 'clientes',            loadComponent: () => import('./modules/clientes/clientes-list/clientes-list.component').then(m => m.ClientesListComponent) },
      { path: 'clientes/nuevo',      loadComponent: () => import('./modules/clientes/clientes-form/clientes-form.component').then(m => m.ClientesFormComponent) },
      { path: 'clientes/:id/editar', loadComponent: () => import('./modules/clientes/clientes-form/clientes-form.component').then(m => m.ClientesFormComponent) },

      // PRODUCTOS
      { path: 'productos',             loadComponent: () => import('./modules/productos/productos-list/productos-list.component').then(m => m.ProductosListComponent) },
      { path: 'productos/nuevo',       loadComponent: () => import('./modules/productos/productos-form/productos-form.component').then(m => m.ProductosFormComponent) },
      { path: 'productos/:id/editar',  loadComponent: () => import('./modules/productos/productos-form/productos-form.component').then(m => m.ProductosFormComponent) },

      // INVENTARIO
      { path: 'inventario',            loadComponent: () => import('./modules/inventario/inventario-list/inventario-list.component').then(m => m.InventarioListComponent) },

      // COMPRAS
      { path: 'compras',        loadComponent: () => import('./modules/compras/compras-list/compras-list.component').then(m => m.ComprasListComponent) },
      { path: 'compras/nuevo',  loadComponent: () => import('./modules/compras/compras-form/compras-form.component').then(m => m.ComprasFormComponent) },

      // PROVEEDORES
      { path: 'proveedores',             loadComponent: () => import('./modules/proveedores/proveedores-list/proveedores-list.component').then(m => m.ProveedoresListComponent) },
      { path: 'proveedores/nuevo',       loadComponent: () => import('./modules/proveedores/proveedores-form/proveedores-form.component').then(m => m.ProveedoresFormComponent) },
      { path: 'proveedores/:id/editar',  loadComponent: () => import('./modules/proveedores/proveedores-form/proveedores-form.component').then(m => m.ProveedoresFormComponent) },

      // CUENTAS POR COBRAR
      { path: 'cuentas-cobrar', loadComponent: () => import('./modules/cuentas-cobrar/cuentas-cobrar.component').then(m => m.CuentasCobrarComponent) },

      // REPORTES
      { path: 'reportes',       loadComponent: () => import('./modules/reportes/reportes.component').then(m => m.ReportesComponent) },

      // CONFIGURACIÓN (solo admin)
      { path: 'configuracion',  canActivate: [adminGuard], loadComponent: () => import('./modules/configuracion/configuracion.component').then(m => m.ConfiguracionComponent) },

      // USUARIOS (solo admin)
      { path: 'usuarios',            canActivate: [adminGuard], loadComponent: () => import('./modules/usuarios/usuarios-list/usuarios-list.component').then(m => m.UsuariosListComponent) },
      { path: 'usuarios/nuevo',      canActivate: [adminGuard], loadComponent: () => import('./modules/usuarios/usuarios-form/usuarios-form.component').then(m => m.UsuariosFormComponent) },
      { path: 'usuarios/:id/editar', canActivate: [adminGuard], loadComponent: () => import('./modules/usuarios/usuarios-form/usuarios-form.component').then(m => m.UsuariosFormComponent) },
    ]
  },

  { path: '**', redirectTo: 'dashboard' }
];
