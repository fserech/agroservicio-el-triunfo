import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth';
import { AuthResponse } from '../../models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  username = '';
  password = '';
  loading  = signal(false);
  error    = signal('');

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  async doLogin() {
    if (!this.username || !this.password) { this.error.set('Ingrese usuario y contraseña'); return; }
    this.loading.set(true); this.error.set('');
    try {
      const res = await this.api.post<AuthResponse>('/auth/login', { username: this.username, password: this.password });
      this.auth.setAuth(res.token, res.user);
      this.router.navigate(['/dashboard']);
    } catch(e: any) {
      this.error.set(e.message || 'Error de autenticación');
    } finally { this.loading.set(false); }
  }
}
