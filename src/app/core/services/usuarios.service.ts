import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Usuario } from '../models/models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);

  getAll(): Observable<Usuario[]>                                          { return this.http.get<Usuario[]>(\/usuarios); }
  create(d: Partial<Usuario> & { password: string }): Observable<Usuario> { return this.http.post<Usuario>(\/usuarios, d); }
  update(id: number, d: Partial<Usuario>): Observable<Usuario>            { return this.http.put<Usuario>(\/usuarios/\, d); }
}
