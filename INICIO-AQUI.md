# Agroservicio El Triunfo — CRM

## ▶ Levantar el sistema

Desde la carpeta del proyecto (donde está `docker-compose.yml`), con Docker Desktop abierto:

```bash
docker compose up --build
```

Abrir: **http://localhost:8080**

> Para empezar de cero (borra TODA la base de datos): `docker compose down -v --remove-orphans`

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | Admin2026! | Administrador |

> El sistema arranca con **un solo registro por módulo** (1 categoría, 1 producto, 1 cliente, 1 proveedor,
> 1 compra, 1 venta con su cuenta por cobrar), coherentes entre sí. Crea los demás usuarios desde el módulo Usuarios.

## 👤 Cambiar usuario y contraseña

Cada usuario puede cambiar sus datos desde el menú de arriba a la derecha (tu usuario) → **Mi perfil**:
nombre, usuario de acceso, correo y contraseña. Cambiar el usuario o la contraseña pide la contraseña actual;
al cambiar la contraseña se cierra la sesión. La contraseña nueva requiere 8 caracteres, una mayúscula y un número.
El administrador también puede editar a los demás desde el módulo Usuarios (Usuarios → Editar), incluido el usuario de acceso (login). Siempre debe quedar al menos un administrador activo.

## 🛡️ Integridad de datos

- El `seed` solo siembra si no existen usuarios (antes se ejecutaba en cada arranque, duplicaba
  clientes y cuentas por cobrar y reiniciaba stock y precios). Para forzarlo: `node src/db/seed.js --force`.
- Al arrancar, el backend **repara duplicados** de versiones anteriores (clientes y proveedores idénticos,
  cuentas por cobrar repetidas) y crea un índice único: una cuenta por cobrar por venta.
- El Dashboard muestra un panel **"Datos conciliados entre módulos"** (admin, supervisor y contador).
- Los KPIs de Ventas, Compras, Clientes y Productos se calculan sobre **todo** el conjunto filtrado,
  no solo la página visible, y usan las mismas reglas que el Dashboard.

## 🏷️ Código de producto automático

El código se genera solo al crear el producto (`FERT-004`, `SEM-012`, `PROD-001`…): prefijo según la categoría
y número correlativo. No se escribe a mano; el formulario muestra el que se asignará. También aplica a la
importación desde Excel.

## 🗑️ Eliminar clientes, proveedores y productos

Solo **admin** y **supervisor**. Sin historial se elimina. Con historial se ofrece:
- **Desactivar**: deja de aparecer al vender/comprar, conserva facturas y reportes; se reactiva editándolo.
- **Eliminar definitivamente** (solo admin, clientes y proveedores): las ventas u órdenes se conservan pero quedan
  sin cliente/proveedor. No se permite si el cliente tiene deuda o el proveedor tiene órdenes abiertas.
- Los **productos con ventas** solo se pueden desactivar (las facturas dependen de ellos).

## 📊 Dashboard con predicción de demanda

Pestañas **Resumen** y **Predicción de productos**. Para probar con 6 meses de historial de demostración:

```bash
docker compose exec backend node src/db/seed-demo-historial.js            # cargar demo
docker compose exec backend node src/db/seed-demo-historial.js --limpiar  # borrar demo
```

El demo crea su propio catálogo (productos `DEMO-*`, clientes y proveedores demo) y `--limpiar` lo elimina TODO,
sin tocar tus datos reales. Hazlo antes de operar de verdad.

## 🔧 Desarrollo del frontend

```bash
cd frontend-src
npm install
npx ng serve --proxy-config proxy.conf.json   # http://localhost:4200 (API en :3000)
```
