import { Injectable } from '@angular/core';
import { ApiService } from './api';
import { DistribucionResp, IntegridadResp, ProductosResp, ResumenResp, TendenciaResp } from '../models/analitica';

@Injectable({ providedIn: 'root' })
export class AnaliticaService {
  constructor(private api: ApiService) {}

  resumen(dias: number)      { return this.api.get<ResumenResp>(`/analitica/resumen?dias=${dias}`); }
  tendencia(dias: number)    { return this.api.get<TendenciaResp>(`/analitica/tendencia?dias=${dias}&horizonte=14`); }
  distribucion(dias: number) { return this.api.get<DistribucionResp>(`/analitica/distribucion?dias=${dias}`); }
  integridad()               { return this.api.get<IntegridadResp>('/analitica/integridad'); }
  productos(semanas: number) { return this.api.get<ProductosResp>(`/analitica/productos?semanas=${semanas}`); }
}
