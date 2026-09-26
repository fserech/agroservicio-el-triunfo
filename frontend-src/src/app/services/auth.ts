import { Injectable, signal } from '@angular/core';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'crm_token';
  private readonly USER_KEY  = 'crm_user';

  token = signal<string>(this.getStored(this.TOKEN_KEY) || '');
  user  = signal<User | null>(this.getStoredJSON(this.USER_KEY));

  isAuthenticated(): boolean {
    return !!this.token() && !!this.user();
  }

  setAuth(token: string, user: User) {
    this.token.set(token);
    this.user.set(user);
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch {}
  }

  async logout() {
    // Notificar al backend para revocar el token
    const token = this.token();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch { /* Si falla la petición, igual cerramos localmente */ }
    }
    this.clearLocal();
  }

  clearLocal() {
    this.token.set('');
    this.user.set(null);
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch {}
  }

  private getStored(key: string): string {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  }

  private getStoredJSON(key: string): User | null {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
}
