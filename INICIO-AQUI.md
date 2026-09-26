# Agroservicio El Triunfo — CRM

## ▶ Levantar el sistema

```bash
# 1. Entrar a la carpeta crm
cd crm

# 2. Bajar contenedores anteriores si hubiera (limpieza total)
docker compose down -v --remove-orphans

# 3. Construir e iniciar
docker compose up --build
```

## 🌐 Acceder

Abrir: **http://localhost:8080**

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | Admin2026! | Administrador |
| supervisor | Super2026! | Supervisor |
| vendedor1 | Vend2026! | Vendedor |

## 📁 Estructura

```
crm/
├── docker-compose.yml      ← Archivo principal de Docker
├── nginx/nginx.conf        ← Configuración del servidor web
├── frontend/dist/          ← Angular compilado (listo para producción)
├── backend/                ← API Node.js + Express
└── frontend-src/           ← Código fuente Angular (para desarrollo)
```

## 🔧 Desarrollo del frontend

```bash
cd frontend-src
npm install
# Crear proxy.conf.json con { "/api": { "target": "http://localhost:3000" } }
npx ng serve --proxy-config proxy.conf.json
# Abrir: http://localhost:4200
```
