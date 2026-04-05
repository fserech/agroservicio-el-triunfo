import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Venta, VentaEstado, PagedResponse, DetalleVenta } from '../models/models';
import { environment } from '@env/environment.production';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);

  getAll(f: { desde?:string; hasta?:string; estado?:string; cliente_id?:number; sucursal_id?:number; page?:number; limit?:number } = {}): Observable<PagedResponse<Venta>> {
    let p = new HttpParams();
    Object.entries(f).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v)); });
    return this.http.get<PagedResponse<Venta>>(`${API}/ventas`, { params: p });
  }
  getById(id: number): Observable<Venta> { return this.http.get<Venta>(`${API}/ventas/${id}`); }
  create(d: { cliente_id?: number; sucursal_id?: number; items: Partial<DetalleVenta>[]; metodo_pago?: string; descuento?: number; observaciones?: string }): Observable<Venta> {
    return this.http.post<Venta>(`${API}/ventas`, d);
  }
  cambiarEstado(id: number, estado: VentaEstado): Observable<Venta> {
    return this.http.patch<Venta>(`${API}/ventas/${id}/estado`, { estado });
  }
  finalizar(id: number): Observable<Venta> { return this.cambiarEstado(id, 'FINALIZED'); }
  cancelar(id: number):  Observable<Venta> { return this.cambiarEstado(id, 'CANCEL'); }
}
