import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CuentaCobrar } from '../models/models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class CuentasCobrarService {
  private http = inject(HttpClient);

  getAll(estado='', cliente_id?: number): Observable<CuentaCobrar[]> {
    let p = new HttpParams();
    if (estado)     p = p.set('estado', estado);
    if (cliente_id) p = p.set('cliente_id', cliente_id);
    return this.http.get<CuentaCobrar[]>(\/cuentas-cobrar, { params: p });
  }
  registrarPago(id: number, monto: number, metodo_pago: string, referencia?: string): Observable<any> {
    return this.http.post(\/cuentas-cobrar/\/pago, { monto, metodo_pago, referencia });
  }
}
