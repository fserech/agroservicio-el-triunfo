import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OrdenCompra, DetalleOrden } from '../models/models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class OrdenesCompraService {
  private http = inject(HttpClient);

  getAll(estado='', proveedor_id?: number, page=1, limit=20): Observable<OrdenCompra[]> {
    let p = new HttpParams().set('page',page).set('limit',limit);
    if (estado)       p = p.set('estado', estado);
    if (proveedor_id) p = p.set('proveedor_id', proveedor_id);
    return this.http.get<OrdenCompra[]>(\/compras, { params: p });
  }
  getById(id: number): Observable<OrdenCompra> { return this.http.get<OrdenCompra>(\/compras/\); }
  create(d: { proveedor_id: number; sucursal_id?: number; items: Partial<DetalleOrden>[]; observaciones?: string; fecha_entrega?: string }): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(\/compras, d);
  }
  cambiarEstado(id: number, estado: string): Observable<OrdenCompra> {
    return this.http.patch<OrdenCompra>(\/compras/\/estado, { estado });
  }
  recibir(id: number): Observable<any> { return this.http.patch(\/compras/\/recibir, {}); }
}
