-- ─── EXTENSIONES ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USUARIOS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(100),
  password_hash TEXT         NOT NULL,
  rol           VARCHAR(20)  NOT NULL DEFAULT 'vendedor'
                CHECK (rol IN ('admin','supervisor','vendedor','bodeguero','contador')),
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  ultimo_acceso TIMESTAMP,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── CATEGORÍAS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── SUCURSALES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sucursales (
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  direccion TEXT,
  activo    BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO sucursales (id, nombre) VALUES (1, 'Principal')
  ON CONFLICT (id) DO NOTHING;

-- ─── PROVEEDORES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  razon_social  VARCHAR(200),
  nit           VARCHAR(20),
  categoria     VARCHAR(80)  DEFAULT 'General',
  contacto      VARCHAR(100),
  telefono      VARCHAR(20),
  email         VARCHAR(100),
  departamento  VARCHAR(80),
  direccion     TEXT,
  plazo_credito INTEGER      DEFAULT 0,
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── CLIENTES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  tipo            VARCHAR(20)  DEFAULT 'individual'
                  CHECK (tipo IN ('individual','empresa','cooperativa','finca','otro')),
  nit             VARCHAR(20),
  cui             VARCHAR(20),
  telefono        VARCHAR(20),
  email           VARCHAR(100),
  municipio       VARCHAR(80),
  departamento    VARCHAR(80),
  direccion       TEXT,
  credito_maximo  NUMERIC(12,2) DEFAULT 0,
  dias_credito    INTEGER       DEFAULT 0,
  notas           TEXT,
  activo          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ─── MIGRACIÓN: limpiar columnas obsoletas en clientes ───────────────────────
DO $$ BEGIN
  ALTER TABLE clientes DROP COLUMN IF EXISTS usuario_id;
  ALTER TABLE clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── PRODUCTOS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id            SERIAL PRIMARY KEY,
  codigo        VARCHAR(50)  UNIQUE,
  nombre        VARCHAR(200) NOT NULL,
  descripcion   TEXT,
  categoria_id  INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  precio_compra NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta  NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidad_medida VARCHAR(30)   NOT NULL DEFAULT 'unidad',
  activo        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_nombre    ON productos(nombre);

-- ─── INVENTARIO ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventario (
  id               SERIAL PRIMARY KEY,
  producto_id      INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  sucursal_id      INTEGER NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
  stock_actual     NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_minimo     NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_maximo     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ubicacion_bodega VARCHAR(100),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(producto_id, sucursal_id)
);
CREATE INDEX IF NOT EXISTS idx_inventario_producto ON inventario(producto_id);

-- ─── MOVIMIENTOS INVENTARIO ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id             SERIAL PRIMARY KEY,
  producto_id    INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  sucursal_id    INTEGER REFERENCES sucursales(id),
  tipo           VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada','salida','ajuste','venta','compra')),
  cantidad       NUMERIC(12,2) NOT NULL,
  stock_anterior NUMERIC(12,2),
  stock_nuevo    NUMERIC(12,2),
  motivo         VARCHAR(200),
  usuario_id     INTEGER REFERENCES usuarios(id),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
DO $$ BEGIN
  ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS stock_anterior NUMERIC(12,2);
  ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS stock_nuevo    NUMERIC(12,2);
  ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS sucursal_id    INTEGER REFERENCES sucursales(id) DEFAULT 1;
  ALTER TABLE movimientos_inventario ALTER COLUMN sucursal_id SET DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── VENTAS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id             SERIAL PRIMARY KEY,
  numero_factura VARCHAR(30) UNIQUE,
  cliente_id     INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  sucursal_id    INTEGER REFERENCES sucursales(id),
  usuario_id     INTEGER REFERENCES usuarios(id),
  fecha          TIMESTAMP NOT NULL DEFAULT NOW(),
  subtotal       NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuesto       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total          NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pago    VARCHAR(20) DEFAULT 'efectivo'
                 CHECK (metodo_pago IN ('efectivo','tarjeta','credito','transferencia','cheque')),
  estado         VARCHAR(20) DEFAULT 'PENDING'
                 CHECK (estado IN ('PENDING','IN_PROCESS','FINALIZED','CANCEL')),
  observaciones  TEXT,
  -- Campos para IVA opcional e interés de crédito
  tasa_interes   NUMERIC(5,2)  NOT NULL DEFAULT 0,
  monto_interes  NUMERIC(12,2) NOT NULL DEFAULT 0,
  aplica_iva     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente      ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha        ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_estado       ON ventas(estado);

-- ─── MIGRACIÓN: agregar columnas de IVA e interés si la tabla ya existe ──────
DO $$ BEGIN
  ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tasa_interes  NUMERIC(5,2)  NOT NULL DEFAULT 0;
  ALTER TABLE ventas ADD COLUMN IF NOT EXISTS monto_interes NUMERIC(12,2) NOT NULL DEFAULT 0;
  ALTER TABLE ventas ADD COLUMN IF NOT EXISTS aplica_iva    BOOLEAN       NOT NULL DEFAULT TRUE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── DETALLE VENTAS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id              SERIAL PRIMARY KEY,
  venta_id        INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES productos(id),
  cantidad        NUMERIC(12,2) NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta ON detalle_ventas(venta_id);

-- ─── COMPRAS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compras (
  id            SERIAL PRIMARY KEY,
  numero_orden  VARCHAR(30) UNIQUE,
  proveedor_id  INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  sucursal_id   INTEGER REFERENCES sucursales(id),
  usuario_id    INTEGER REFERENCES usuarios(id),
  fecha         TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_entrega TIMESTAMP,
  subtotal      NUMERIC(12,2) DEFAULT 0,
  impuesto      NUMERIC(12,2) DEFAULT 0,
  total         NUMERIC(12,2) DEFAULT 0,
  estado        VARCHAR(20) DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','aprobada','en_transito','recibida','cancelada')),
  observaciones TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP
);

-- ─── DETALLE COMPRAS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS detalle_compras (
  id              SERIAL PRIMARY KEY,
  compra_id       INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES productos(id),
  cantidad        NUMERIC(12,2) NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL
);

-- ─── CUENTAS POR COBRAR ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuentas_cobrar (
  id              SERIAL PRIMARY KEY,
  venta_id        INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
  cliente_id      INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  monto_total     NUMERIC(12,2) NOT NULL,
  monto_pagado    NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo           NUMERIC(12,2) GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
  fecha_vence     DATE,
  estado          VARCHAR(20) DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','parcial','pagada','vencida')),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── AUDITORÍA ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  accion      VARCHAR(50) NOT NULL,
  detalle     JSONB,
  ip          VARCHAR(50),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion  ON auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha   ON auditoria(created_at);

-- ─── MIGRACIONES COMPATIBILIDAD ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE inventario ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion (
  id          SERIAL PRIMARY KEY,
  clave       VARCHAR(100) NOT NULL UNIQUE,
  valor       TEXT,
  descripcion VARCHAR(200),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('factura_prefijo',  'F-2026-',                 'Prefijo para número de factura'),
  ('empresa_nombre',   'Agroservicio El Triunfo',  'Nombre de la empresa'),
  ('empresa_nit',      'CF',                       'NIT de la empresa'),
  ('moneda_simbolo',   'Q',                        'Símbolo de moneda'),
  ('iva_porcentaje',   '12',                       'Porcentaje de IVA')
ON CONFLICT (clave) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÍNDICES PARA ESCALABILIDAD
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Productos ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_productos_categoria  ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_nombre     ON productos USING gin(to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_productos_codigo     ON productos(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_activo     ON productos(activo) WHERE activo = true;

-- ── Inventario ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventario_producto  ON inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_inventario_sucursal  ON inventario(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_inventario_stock     ON inventario(stock_actual) WHERE stock_actual <= stock_minimo;

-- ── Clientes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clientes_nombre      ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_nit         ON clientes(nit) WHERE nit IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_tipo        ON clientes(tipo);
CREATE INDEX IF NOT EXISTS idx_clientes_activo      ON clientes(activo) WHERE activo = true;

-- ── Ventas ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ventas_cliente       ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha         ON ventas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_estado        ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario       ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_factura       ON ventas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_estado  ON ventas(fecha DESC, estado);
CREATE INDEX IF NOT EXISTS idx_ventas_mes           ON ventas(date_trunc('month', fecha), estado);
CREATE INDEX IF NOT EXISTS idx_ventas_metodo_iva    ON ventas(metodo_pago, aplica_iva);

-- ── Detalle Ventas ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta    ON detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto ON detalle_ventas(producto_id);

-- ── Compras ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_compras_proveedor    ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha        ON compras(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_compras_estado       ON compras(estado);
CREATE INDEX IF NOT EXISTS idx_compras_orden        ON compras(numero_orden);

-- ── Detalle Compras ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_detalle_compras_compra   ON detalle_compras(compra_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compras_producto ON detalle_compras(producto_id);

-- ── Proveedores ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre   ON proveedores(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_activo   ON proveedores(activo) WHERE activo = true;

-- ── Cuentas por Cobrar ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cuentas_cliente      ON cuentas_cobrar(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_estado       ON cuentas_cobrar(estado);
CREATE INDEX IF NOT EXISTS idx_cuentas_vence        ON cuentas_cobrar(fecha_vence) WHERE estado IN ('pendiente','parcial','vencida');

-- ── Movimientos Inventario ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha    ON movimientos_inventario(created_at DESC);

-- ── Auditoría ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario    ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion     ON auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha      ON auditoria(created_at DESC);

-- ── Configuración ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_configuracion_clave  ON configuracion(clave);

-- ─── FUNCIÓN: sincronizar todas las secuencias automáticamente ───────────────
CREATE OR REPLACE FUNCTION sync_all_sequences() RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      s.relname AS seq_name,
      t.relname AS table_name,
      a.attname AS col_name
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid
    JOIN pg_class t  ON t.oid  = d.refobjid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S'
  LOOP
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 0) + 1, false)',
      r.seq_name, r.col_name, r.table_name
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;