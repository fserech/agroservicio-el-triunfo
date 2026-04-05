import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Cliente, PagedResponse } from '../models/models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);

  getAll(buscar='', tipo='', page=1, limit=50): Observable<PagedResponse<Cliente>> {
    let p = new HttpParams().set('page',page).set('limit',limit);
    if (buscar) p = p.set('buscar', buscar);
    if (tipo)   p = p.set('tipo', tipo);
    return this.http.get<PagedResponse<Cliente>>(\/clientes, { params: p });
  }
  getById(id: number): Observable<Cliente> { return this.http.get<Cliente>(\/clientes/\); }
  create(d: Partial<Cliente>): Observable<Cliente>             { return this.http.post<Cliente>(\/clientes, d); }
  update(id: number, d: Partial<Cliente>): Observable<Cliente> { return this.http.put<Cliente>(\/clientes/\, d); }
}
