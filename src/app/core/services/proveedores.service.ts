import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Proveedor } from '../models/models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private http = inject(HttpClient);

  getAll(buscar=''): Observable<Proveedor[]> {
    let p = new HttpParams(); if (buscar) p = p.set('buscar', buscar);
    return this.http.get<Proveedor[]>(\/proveedores, { params: p });
  }
  getById(id: number): Observable<Proveedor> { return this.http.get<Proveedor>(\/proveedores/\); }
  create(d: Partial<Proveedor>): Observable<Proveedor>             { return this.http.post<Proveedor>(\/proveedores, d); }
  update(id: number, d: Partial<Proveedor>): Observable<Proveedor> { return this.http.put<Proveedor>(\/proveedores/\, d); }
}
