import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Usuario } from '../models/models';
import { environment } from '@env/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);

  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${API}/usuarios`);
  }

  create(d: Partial<Usuario> & { password: string }): Observable<Usuario> {
    return this.http.post<Usuario>(`${API}/usuarios`, d);
  }

  update(id: number, d: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${API}/usuarios/${id}`, d);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/usuarios/${id}`);
  }
}