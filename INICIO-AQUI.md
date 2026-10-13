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
| mlopez | Admin2026! | Supervisor |
| cgomez | Admin2026! | Vendedor |
| ptzoy | Admin2026! | Bodeguero |
| rmerida | Admin2026! | Contador |

## 🛡️ Integridad de datos

- El `seed` solo siembra si la base está vacía (antes se ejecutaba en cada arranque, duplicaba
  clientes y cuentas por cobrar y reiniciaba stock y precios). Para forzarlo: `node src/db/seed.js --force`.
- Al arrancar, el backend **repara duplicados** de versiones anteriores (clientes y proveedores idénticos,
  cuentas por cobrar repetidas) y crea un índice único: una cuenta por cobrar por venta.
- El Dashboard muestra un panel **"Datos conciliados entre módulos"** (admin, supervisor y contador).
- Los KPIs de Ventas, Compras, Clientes y Productos se calculan sobre **todo** el conjunto filtrado,
  no solo la página visible, y usan las mismas reglas que el Dashboard.

## 🗑️ Eliminar clientes, proveedores y productos

Solo **admin** y **supervisor**. Si el registro no tiene historial se elimina; si lo tiene (ventas, compras,
cuentas por cobrar o movimientos) se ofrece **desactivarlo**: deja de aparecer al vender/comprar pero se
conservan facturas y reportes. Se reactiva editándolo.

## 📊 Dashboard con predicción de demanda

Pestañas **Resumen** y **Predicción de productos**. Para probar con 6 meses de historial de demostración:

```bash
docker compose exec backend node src/db/seed-demo-historial.js            # cargar demo
docker compose exec backend node src/db/seed-demo-historial.js --limpiar  # borrar demo
```

Las filas demo se marcan con `observaciones = '[DEMO]'`. Bórralas antes de operar con datos reales.

## 🔧 Desarrollo del frontend

```bash
cd frontend-src
npm install
npx ng serve --proxy-config proxy.conf.json   # http://localhost:4200 (API en :3000)
```
