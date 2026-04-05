import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthResponse, Usuario } from '../models/models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private _user$ = new BehaviorSubject<Usuario|null>(this.storedUser());

  user$ = this._user$.asObservable();
  get user()         { return this._user$.value; }
  get isLoggedIn()   { return !!this.getToken(); }
  get isAdmin()      { return this.user?.rol === 'admin'; }
  get isSupervisor() { return ['admin','supervisor'].includes(this.user?.rol||''); }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(\/auth/login, { username, password }).pipe(
      tap(r => { localStorage.setItem('token', r.token); localStorage.setItem('user', JSON.stringify(r.user)); this._user$.next(r.user); })
    );
  }

  logout(): void {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    this._user$.next(null); this.router.navigate(['/auth/login']);
  }

  getToken(): string|null { return localStorage.getItem('token'); }
  me(): Observable<Usuario> { return this.http.get<Usuario>(\/auth/me); }
  cambiarPassword(pa: string, pn: string): Observable<any> {
    return this.http.post(\/auth/cambiar-password, { password_actual: pa, password_nuevo: pn });
  }

  private storedUser(): Usuario|null {
    try { const s = localStorage.getItem('user'); return s ? JSON.parse(s) : null; } catch { return null; }
  }
}
