// Modelos de la analítica (respuestas de /api/analitica/*)

export interface KpiBloque {
  ventas: number; transacciones: number; ticket: number; unidades: number;
  clientes: number; utilidad: number | null; margen: number | null;
}
export interface DiarioPunto { dia: string; total: number; n: number; unidades: number; utilidad: number | null; }

export interface ResumenResp {
  dias: number;
  puede_ver_margen: boolean;
  actual: KpiBloque;
  anterior: KpiBloque;
  delta: Record<keyof KpiBloque, number | null>;
  diario: DiarioPunto[];
  cuentas_cobrar: { total: number; n_abiertas: number; vencido: number; n_vencidas: number };
  inventario: { valor_costo: number | null; valor_venta: number; criticos: number; productos: number };
}

export interface PuntoPronostico { dia: string; valor: number; min: number; max: number; }
export interface TendenciaResp {
  dias: number; horizonte: number;
  historico: { dia: string; total: number; n: number; promedio_7d: number }[];
  pronostico: { ok: boolean; motivo?: string; indice_dia?: number[]; puntos: PuntoPronostico[] };
  resumen: { total_historico: number; proyeccion_total: number | null; ultimos_dias_total: number; cambio_esperado_pct: number | null };
}

export interface CategoriaDist { categoria: string; ingreso: number; unidades: number; utilidad: number | null; ingreso_prev: number; }
export interface TopProductoDist {
  id: number; nombre: string; codigo: string; unidad_medida: string; categoria: string;
  ingreso: number; unidades: number; utilidad: number | null; ingreso_prev: number;
}
export interface DistribucionResp {
  dias: number;
  categorias: CategoriaDist[];
  top_productos: TopProductoDist[];
  metodos_pago: { metodo: string; n: number; total: number }[];
  vendedores: { vendedor: string; n: number; total: number }[];
  mapa_calor: { dias: number; celdas: { dow: number; hora: number; n: number; total: number }[] };
  combos: { a: string; b: string; veces: number; pct: number }[];
}

export type ClaseProducto = 'estrella' | 'creciendo' | 'estable' | 'declive' | 'sin_rotacion' | 'nuevo';
export type RiesgoStock = 'ok' | 'quiebre' | 'bajo' | 'exceso';

export interface ProductoAnalitica {
  id: number; codigo: string; nombre: string; categoria: string; unidad: string;
  stock: number; stock_minimo: number; precio_venta: number;
  ventas: number; clientes: number; ultima_venta: string | null;
  unidades: number; ingreso: number;
  serie: number[];
  pronostico: { valor: number; min: number; max: number }[];
  demanda_30d: number; demanda_min: number; demanda_max: number; ingreso_proy_30d: number;
  tendencia_pct: number; consistencia: number;
  confianza: 'alta' | 'media' | 'baja';
  riesgo: RiesgoStock; sugerido: number; cobertura_dias: number | null;
  score: number; clase: ClaseProducto; abc: 'A' | 'B' | 'C' | null;
  margen_pct: number | null; utilidad: number | null; inversion_sugerida: number | null;
}
export interface ProductosResp {
  semanas: number; historial_dias: number; puede_ver_margen: boolean;
  resumen: {
    productos_activos: number; con_ventas: number; ingreso_historico: number; ingreso_proy_30d: number;
    riesgo_quiebre: number; sobrestock: number; sin_rotacion: number; inversion_sugerida: number | null;
  };
  productos: ProductoAnalitica[];
}

export interface IntegridadResp {
  ok: boolean; revisado: string; saldo_cuentas_cobrar: number;
  checks: { id: string; titulo: string; detalle: string; n: number; estado: 'ok' | 'warn' }[];
}
