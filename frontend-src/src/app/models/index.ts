export interface User {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  email?: string;
  activo?: boolean;
  ultimo_acceso?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Cliente {
  id: number;
  nombre: string;
  tipo: string;
  nit?: string;
  cui?: string;
  telefono?: string;
  email?: string;
  municipio?: string;
  departamento?: string;
  direccion?: string;
  credito_maximo?: number;
  dias_credito?: number;
  notas?: string;
  activo?: boolean;
  total_compras?: number;
  saldo_pendiente?: number;
}

export interface Producto {
  id: number;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  categoria_id?: number;
  cat_nombre?: string;
  precio_compra: number;
  precio_venta: number;
  unidad_medida: string;
  stock_actual?: number;
  stock_minimo?: number;
  stock_maximo?: number;
  ubicacion_bodega?: string;
  estado_stock?: string;
  margen?: number;
  activo?: boolean;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  productos_count?: number;
}

export interface Venta {
  id: number;
  numero_factura: string;
  fecha: string;
  cliente_nombre?: string;
  cliente_nit?: string;
  vendedor?: string;
  subtotal?: number;
  impuesto?: number;
  total: number;
  metodo_pago: string;
  estado: string;
  observaciones?: string;
  items?: VentaItem[];
}

export interface VentaItem {
  producto_id: number;
  nombre?: string;
  unidad?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number;
}

export interface Proveedor {
  id: number;
  nombre: string;
  razon_social?: string;
  nit?: string;
  categoria?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  departamento?: string;
  direccion?: string;
  plazo_credito?: number;
  activo?: boolean;
  compras_totales?: number;
}

export interface Compra {
  id: number;
  numero_orden: string;
  prov_nombre: string;
  fecha: string;
  fecha_entrega?: string;
  subtotal?: number;
  impuesto?: number;
  total: number;
  estado: string;
  creado_por?: string;
  items?: VentaItem[];
}

export interface CuentaCobrar {
  id: number;
  numero_factura?: string;
  cliente_nombre: string;
  monto_total: number;
  monto_pagado: number;
  saldo: number;
  fecha_vence?: string;
  estado: string;
}

export interface InventarioItem {
  id: number;
  nombre: string;
  codigo?: string;
  cat?: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida: string;
  ubicacion_bodega?: string;
  estado: string;
}

export interface DashboardKpis {
  ventas_hoy: number;
  ventas_hoy_count: number;
  ventas_mes: number;
  ventas_mes_count: number;
  cuentas_por_cobrar: number;
  stock_critico: number;
  clientes_activos: number;
  valor_inventario: number;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface KpiData {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}
