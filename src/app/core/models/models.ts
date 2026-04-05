// ================================================================
// AGROSERVICIO EL TRIUNFO — Models / Interfaces
// ================================================================

export interface Usuario {
  id: number; nombre: string; username: string; email?: string;
  rol: 'admin'|'supervisor'|'vendedor'|'bodeguero'|'contador';
  activo: boolean; ultimo_acceso?: string; created_at?: string;
}

export interface AuthResponse { token: string; user: Usuario; }

export interface Categoria { id: number; nombre: string; descripcion?: string; }
export interface Sucursal  { id: number; nombre: string; direccion?: string; telefono?: string; activa: boolean; }

export interface Producto {
  id: number; codigo?: string; nombre: string; descripcion?: string;
  categoria_id: number; cat_nombre?: string;
  precio_compra: number; precio_venta: number; unidad_medida: string;
  activo: boolean; margen?: number;
  stock_actual?: number; stock_minimo?: number; stock_maximo?: number;
  ubicacion_bodega?: string; estado_stock?: 'normal'|'bajo'|'critico'|'sin_stock';
  created_at?: string; updated_at?: string;
}

export interface InventarioItem {
  id: number; codigo?: string; nombre: string; cat: string;
  unidad_medida: string; stock_actual: number; stock_minimo: number;
  stock_maximo: number; ubicacion_bodega?: string; ultima_actualizacion?: string;
  sucursal?: string; estado: 'normal'|'bajo'|'critico'|'sin_stock'; pct_ocupacion?: number;
}

export interface MovimientoInventario {
  id: number; producto_id: number; prod_nombre?: string;
  tipo: 'entrada'|'salida'|'ajuste'; cantidad: number;
  stock_anterior?: number; stock_nuevo?: number;
  motivo?: string; usuario?: string; created_at: string;
}

export interface Cliente {
  id: number; nombre: string;
  tipo: 'individual'|'empresa'|'cooperativa'|'finca'|'otro';
  nit?: string; cui?: string; telefono?: string; email?: string;
  direccion?: string; municipio?: string; departamento?: string;
  credito_maximo: number; dias_credito: number; notas?: string;
  activo: boolean; total_compras?: number; num_pedidos?: number;
  ultima_compra?: string; saldo_pendiente?: number;
  created_at?: string; updated_at?: string;
}

export type VentaEstado = 'PENDING'|'IN_PROCESS'|'FINALIZED'|'CANCEL';
export type MetodoPago  = 'efectivo'|'tarjeta'|'credito'|'transferencia'|'cheque';

export interface DetalleVenta {
  id?: number; venta_id?: number; producto_id: number;
  pn?: string; codigo?: string;
  cantidad: number; precio_unitario: number; descuento?: number; subtotal: number;
}

export interface Venta {
  id: number; numero_factura: string;
  cliente_id?: number; cliente_nombre?: string; cliente_nit?: string;
  sucursal_id?: number; sucursal_nombre?: string;
  usuario_id: number; vendedor?: string;
  subtotal: number; descuento: number; iva: number; total: number;
  estado: VentaEstado; metodo_pago: MetodoPago; observaciones?: string;
  fecha: string; items?: DetalleVenta[];
  created_at?: string; updated_at?: string;
}

export interface Proveedor {
  id: number; nombre: string; razon_social?: string; nit?: string;
  contacto?: string; telefono?: string; email?: string;
  direccion?: string; departamento?: string; categoria?: string;
  plazo_credito: number; activo: boolean;
  compras_totales?: number; num_ordenes?: number;
}

export type OrdenEstado = 'pendiente'|'aprobada'|'en_transito'|'recibida'|'cancelada';

export interface DetalleOrden {
  id?: number; orden_id?: number; producto_id: number;
  prod_nombre?: string; codigo?: string;
  cantidad: number; precio_unitario: number; subtotal: number;
}

export interface OrdenCompra {
  id: number; numero_orden: string;
  proveedor_id: number; prov_nombre?: string;
  sucursal_id?: number; usuario_id: number; creado_por?: string;
  subtotal: number; iva: number; total: number;
  estado: OrdenEstado; observaciones?: string;
  fecha: string; fecha_entrega?: string; fecha_recepcion?: string;
  items?: DetalleOrden[];
}

export type CuentaEstado = 'pendiente'|'parcial'|'pagada'|'vencida';

export interface CuentaCobrar {
  id: number; venta_id: number; numero_factura?: string;
  cliente_id: number; cliente_nombre?: string;
  monto_total: number; monto_pagado: number; saldo: number;
  fecha_vence?: string; estado: CuentaEstado; created_at: string;
}

export interface DashboardKpis {
  ventas_hoy: number; ventas_hoy_count: number;
  ventas_mes: number; ventas_mes_count: number;
  valor_inventario: number; total_productos: number;
  clientes_activos: number; stock_critico: number;
  cuentas_por_cobrar: number;
}

export interface Configuracion { id: number; clave: string; valor: string; descripcion?: string; }

export interface PagedResponse<T> { data: T[]; total: number; page: number; limit: number; }

// Extiende PagedResponse para incluir monto_total que devuelve el backend de ventas
export interface VentasPagedResponse extends PagedResponse<Venta> { monto_total: number; }

export interface SortConfig { sortBy: string; sortOrder: 'asc'|'desc'; }