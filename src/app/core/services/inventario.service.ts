import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { InventarioItem, MovimientoInventario } from '../models/models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);

  getAll(estado?: 'critico'|'sin_stock'|'bajo'): Observable<InventarioItem[]> {
    let p = new HttpParams(); if (estado) p = p.set('estado', estado);
    return this.http.get<InventarioItem[]>(\/inventario, { params: p });
  }
  ajuste(d: { producto_id: number; tipo: 'entrada'|'salida'|'ajuste'; cantidad: number; motivo?: string }): Observable<any> {
    return this.http.post(\/inventario/ajuste, d);
  }
  movimientos(producto_id?: number, page=1, limit=50): Observable<MovimientoInventario[]> {
    let p = new HttpParams().set('page',page).set('limit',limit);
    if (producto_id) p = p.set('producto_id', producto_id);
    return this.http.get<MovimientoInventario[]>(\/inventario/movimientos, { params: p });
  }
}
