import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api';
import { AuthService } from '../../../services/auth';
import { ToastService } from '../../../services/toast';
import { User } from '../../../models';

/** "Mi perfil": el propio usuario cambia sus datos de acceso y su contraseña. */
@Component({
  selector: 'app-perfil-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './perfil-dialog.html',
})
export class PerfilDialogComponent {
  private api    = inject(ApiService);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  visible = input(false);
  cerrado = output<void>();

  tab        = signal<'datos' | 'password'>('datos');
  error      = signal('');
  trabajando = signal(false);

  // Mis datos
  nombre = ''; username = ''; email = ''; passUsuario = '';
  // Contraseña
  pActual = ''; pNuevo = ''; pConfirma = '';

  constructor() {
    effect(() => { if (this.visible()) untracked(() => this.reset()); });
  }

  private reset() {
    const u = this.auth.user();
    this.nombre = u?.nombre || ''; this.username = u?.username || ''; this.email = u?.email || '';
    this.passUsuario = ''; this.pActual = ''; this.pNuevo = ''; this.pConfirma = '';
    this.tab.set('datos'); this.error.set(''); this.trabajando.set(false);
  }

  get cambiaUsuario() { return this.username.trim().toLowerCase() !== (this.auth.user()?.username || ''); }
  limpiarUsuario() { this.username = this.username.toLowerCase().replace(/[^a-z0-9._-]/g, ''); }

  /** Requisitos de la contraseña nueva (los mismos que valida el servidor) */
  get reglas() {
    const p = this.pNuevo;
    return [
      { ok: p.length >= 8,  texto: 'Mínimo 8 caracteres' },
      { ok: /[A-Z]/.test(p), texto: 'Una mayúscula' },
      { ok: /[0-9]/.test(p), texto: 'Un número' },
    ];
  }

  async guardarDatos() {
    this.error.set('');
    if (this.nombre.trim().length < 2) return this.error.set('Escribe tu nombre');
    if (this.username.trim().length < 3) return this.error.set('El usuario debe tener al menos 3 caracteres');
    if (this.cambiaUsuario && !this.passUsuario) return this.error.set('Escribe tu contraseña actual para cambiar el usuario');
    this.trabajando.set(true);
    try {
      const r: any = await this.api.put('/auth/perfil', {
        nombre: this.nombre, username: this.username, email: this.email, password_actual: this.passUsuario,
      });
      this.auth.setAuth(r.token, { ...(this.auth.user() as User), ...r.user });
      this.toast.success('Perfil actualizado');
      this.cerrado.emit();
    } catch (e: any) { this.error.set(e.message); }
    finally { this.trabajando.set(false); }
  }

  async cambiarPassword() {
    this.error.set('');
    if (!this.pActual) return this.error.set('Escribe tu contraseña actual');
    if (this.reglas.some(r => !r.ok)) return this.error.set('La contraseña nueva no cumple los requisitos');
    if (this.pNuevo !== this.pConfirma) return this.error.set('La confirmación no coincide');
    if (this.pNuevo === this.pActual) return this.error.set('La contraseña nueva debe ser distinta a la actual');
    this.trabajando.set(true);
    try {
      await this.api.post('/auth/cambiar-password', { password_actual: this.pActual, password_nuevo: this.pNuevo });
      this.toast.success('Contraseña actualizada. Inicia sesión con la nueva.');
      this.cerrado.emit();
      this.auth.clearLocal();               // el servidor revocó la sesión actual
      this.router.navigate(['/login']);
    } catch (e: any) { this.error.set(e.message); }
    finally { this.trabajando.set(false); }
  }
}
