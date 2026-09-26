# Agroservicio CRM — Frontend Angular

## Tecnologías
- **Angular 19** (standalone components, signals, lazy loading)
- **Tailwind CSS v3** con @tailwindcss/forms
- **TypeScript strict**

## Estructura de Componentes

### Componentes Compartidos (`src/app/components/shared/`)
| Componente | Descripción |
|---|---|
| `sidebar` | Menú lateral con navegación y estado activo |
| `topbar` | Barra superior con título dinámico y hamburger |
| `toast` | Notificaciones en tiempo real |
| `badge` | Badges de estado reutilizables |
| `kpi-card` | Tarjetas de métricas con color |
| `pagination` | Paginación inteligente con ellipsis |
| `empty-state` | Estado vacío personalizable |
| `confirm-modal` | Modal de confirmación de acciones |

### Páginas (`src/app/pages/`)
| Página | Ruta | Descripción |
|---|---|---|
| `login` | `/login` | Autenticación |
| `layout` | `/` | Shell con sidebar + topbar |
| `dashboard` | `/dashboard` | KPIs, gráficas, accesos rápidos |
| `ventas` | `/ventas` | Lista con filtros y acciones |
| `venta-form` | `/ventas/nueva` | Formulario de venta |
| `clientes` | `/clientes` | Gestión de clientes |
| `cliente-form` | `/clientes/nuevo`, `/clientes/:id/editar` | CRUD cliente |
| `productos` | `/productos` | Catálogo de productos |
| `producto-form` | `/productos/nuevo`, `/productos/:id/editar` | CRUD producto |
| `inventario` | `/inventario` | Vista de stock con ajustes |
| `compras` | `/compras` | Órdenes de compra |
| `compra-form` | `/compras/nueva` | Nueva orden |
| `proveedores` | `/proveedores` | Gestión de proveedores |
| `proveedor-form` | `/proveedores/nuevo`, etc. | CRUD proveedor |
| `cuentas-cobrar` | `/cuentas-cobrar` | Cuentas + registro de pagos |
| `usuarios` | `/usuarios` | Gestión de usuarios |
| `usuario-form` | `/usuarios/nuevo`, etc. | CRUD usuario |

## Servicios
- `AuthService` — Manejo de token JWT con Angular Signals
- `ApiService` — Cliente HTTP genérico con tipado
- `ToastService` — Sistema de notificaciones global

## Desarrollo
```bash
cd frontend-src
npm install
ng serve --proxy-config proxy.conf.json
```

## Build producción
```bash
ng build --configuration=production
# Output en: dist/crm-angular/browser/
# Copiar contenido a frontend/dist/
```

## Proxy de desarrollo
Crea `proxy.conf.json`:
```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```
