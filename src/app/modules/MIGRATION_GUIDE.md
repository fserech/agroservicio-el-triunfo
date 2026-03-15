# 🌿 Agroservicio El Triunfo — Migración de Diseño
## Librería Yami Design → Agroservicio Backend

---

## ¿Qué se cambió?

El frontend del **Agroservicio** ahora usa exactamente el **mismo sistema de diseño** de Librería Yami:
- Mismos componentes de tabla (`table-grid`)
- Misma paginación (`pagination`, `pagination-child`, `btn-pagination`)
- Mismos botones (`btn-primary`, `btn-success`, `btn-back`, `btn-action`)
- Mismo sidebar colapsable con toggle
- Mismas tarjetas KPI (`kpi-card`)
- Modo oscuro idéntico (Tailwind dark classes)

**El backend y los servicios NO se tocaron.**

---

## Archivos entregados

| Archivo | Descripción |
|---|---|
| `src/styles.scss` | Sistema de diseño unificado (variables + clases Yami) |
| `src/app/shared/components/header/header.component.ts` | Header idéntico al de Librería Yami |
| `src/app/shared/components/sidebar/sidebar.component.ts` | Sidebar colapsable estilo Yami + nav Agroservicio |
| `src/app/shared/services/theme.service.ts` | Servicio de tema dark/light |
| `src/app/app-shell/app-shell.component.html` | Layout principal estilo Yami |
| `src/app/app-shell/app-shell.component.ts` | Shell component actualizado |
| `src/app/modules/auth/login/login.component.html` | Login con branding Agroservicio + inputs Yami |
| `src/app/modules/auth/login/login.component.scss` | Estilos login |
| `src/app/modules/dashboard/dashboard.component.html` | Dashboard con KPIs estilo Yami |
| `src/app/modules/ventas/ventas-list/ventas-list.component.html` | Tabla ventas estilo Yami completa |
| `src/app/modules/productos/productos-list/productos-list.component.html` | Tabla productos estilo Yami |

---

## Cómo aplicar al resto de módulos

Para los módulos no incluidos (**clientes, compras, proveedores, inventario, reportes, usuarios**), aplica el mismo patrón:

### Estructura de página lista (grid):

```html
<app-header headerTitle="..." headerDescription="..."></app-header>

<div class="p-2 m-2 bg-white rounded dark:bg-slate-900 border dark:border-slate-800">

  <!-- BARRA DE FILTROS sticky -->
  <div class="sticky top-0 z-10 ... border-b dark:border-slate-600">
    <!-- botón nuevo float-right -->
    <!-- search-wrap + date-input desktop -->
    <!-- search-wrap móvil -->
  </div>

  <!-- KPIs -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-2 my-3">
    <div class="kpi-card">
      <span class="kpi-accent" style="background:var(--primary)"></span>
      <div class="kpi-label">Etiqueta</div>
      <div class="kpi-value">Valor</div>
    </div>
  </div>

  <!-- PAGINACIÓN MÓVIL TOP: class="content-sm" -->

  <!-- TABLA DESKTOP: class="table-grid w-full mt-4 hidden sm:table" -->
  <!-- TABLA MÓVIL: class="table-grid w-full mt-4 sm:hidden" -->

  <!-- PAGINACIÓN DESKTOP: class="content-desktop" + .pagination + .pagination-child -->
  <!-- PAGINACIÓN MÓVIL BOTTOM: class="content-sm" -->

</div>
```

### Estructura de formulario:

```html
<app-header [headerTitle]="isEdit ? 'Editar X' : 'Nuevo X'" headerDescription="..."></app-header>

<div class="p-2 m-2">
  <div class="card max-w-3xl mx-auto">
    <div class="card-header">
      <span class="card-title">...</span>
      <button class="btn-back btn-sm" (click)="cancel()">
        <ng-icon name="matArrowBackOutline" size="16"></ng-icon> Volver
      </button>
    </div>
    <div class="card-body p-5">
      <form [formGroup]="form" (ngSubmit)="save()">
        <h3 class="section-title">Sección</h3>
        <div class="form-grid-2">
          <div class="form-group">
            <label>Campo *</label>
            <input formControlName="campo" type="text" placeholder="...">
            <span class="error-msg" *ngIf="...">Error</span>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button type="button" class="btn-back" (click)="cancel()">Cancelar</button>
          <button type="submit" class="btn-primary h-10 px-6 font-bold" [disabled]="saving">
            <span class="spinner-sm" *ngIf="saving"></span>
            <ng-icon name="matSaveOutline" size="16"></ng-icon>
            {{ isEdit ? 'Actualizar' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
```

---

## Paleta de colores del sistema

| Variable | Color | Uso |
|---|---|---|
| `--primary` | `#00C793` | Botones principales, acentos, precios |
| `--blue` | `#3887BF` | Botones de búsqueda/filtro |
| `--danger` | `#ef4444` | Errores, eliminar, cancelar |
| `--warning` | `#f59e0b` | Alertas, pendientes |
| `--success` | `#10b981` | Éxito, finalizado, activo |
| `--text-2` | `#64748b` | Texto secundario |

---

## Dependencias requeridas

Las mismas que Librería Yami:
- `@ng-icons/core` + `@ng-icons/material-icons` + `@ng-icons/bootstrap-icons`
- `tailwindcss` con plugin `dark mode: 'class'`
- `@angular/material` (solo si se usan mat-select/mat-datepicker)
