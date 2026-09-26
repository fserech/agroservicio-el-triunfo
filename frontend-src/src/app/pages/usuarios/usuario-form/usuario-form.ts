import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api';
import { ToastService } from '../../../services/toast';
import { AuthService } from '../../../services/auth';

interface UserForm {
  nombre:  string;
  email:   string;
  rol:     string;
  activo:  boolean;
}

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './usuario-form.html',
})
export class UsuarioFormComponent implements OnInit {
  isEdit           = false;
  id: number | null = null;
  saving           = signal(false);
  loadingUser      = signal(false);
  showPass         = signal(false);
  originalUsername = '';

  form: UserForm = { nombre: '', email: '', rol: 'vendedor', activo: true };
  username  = '';
  password  = '';
  password2 = '';

  roles = [
    { value: 'admin',      label: '🔴 Administrador' },
    { value: 'supervisor', label: '🟡 Supervisor'     },
    { value: 'vendedor',   label: '🟢 Vendedor'       },
    { value: 'bodeguero',  label: '🔵 Bodeguero'      },
    { value: 'contador',   label: '🟣 Contador'       },
  ];

  rolDesc(rol: string): string {
    const m: Record<string, string> = {
      admin:      'Acceso total al sistema, puede gestionar usuarios',
      supervisor: 'Puede ver reportes y supervisar operaciones',
      vendedor:   'Puede registrar ventas y ver clientes',
      bodeguero:  'Puede gestionar inventario y compras',
      contador:   'Puede ver reportes financieros y cuentas',
    };
    return m[rol] || '';
  }

  // Password strength
  get passStrength() {
    if (!this.password) return 0;
    let s = 0;
    if (this.password.length >= 8)          s++;
    if (/[A-Z]/.test(this.password))        s++;
    if (/[0-9]/.test(this.password))        s++;
    if (/[^A-Za-z0-9]/.test(this.password)) s++;
    return s;
  }

  get passLabel() {
    return ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][this.passStrength] || '';
  }

  get canSave() {
    if (!this.form.nombre?.trim()) return false;
    if (!this.isEdit && !this.username.trim()) return false;
    if (!this.isEdit && !this.password) return false;
    if (this.password && this.password !== this.password2) return false;
    return true;
  }

  sanitizeUsername(val: string): string {
    return val.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  }

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return; // Nuevo usuario

    this.isEdit = true;
    this.id = +id;
    this.loadingUser.set(true);

    try {
      // Buscar usuario por id desde la lista
      const all = await this.api.get<any[]>('/usuarios');
      const u   = all.find(u => u.id === +id);
      if (!u) {
        this.toast.error('Usuario no encontrado');
        this.router.navigate(['/usuarios']);
        return;
      }
      this.form = {
        nombre:  u.nombre  || '',
        email:   u.email   || '',
        rol:     u.rol     || 'vendedor',
        activo:  u.activo  ?? true,
      };
      this.originalUsername = u.username;
    } catch(e: any) {
      this.toast.error(e.message);
      this.router.navigate(['/usuarios']);
    } finally {
      this.loadingUser.set(false);
    }
  }

  async save() {
    // Validaciones
    if (!this.form.nombre?.trim()) {
      this.toast.warning('El nombre es requerido'); return;
    }
    if (!this.isEdit && !this.username.trim()) {
      this.toast.warning('El nombre de usuario es requerido'); return;
    }
    if (!this.isEdit && !this.password) {
      this.toast.warning('La contraseña es requerida'); return;
    }
    if (this.password && this.password.length < 6) {
      this.toast.warning('La contraseña debe tener al menos 6 caracteres'); return;
    }
    if (this.password && this.password !== this.password2) {
      this.toast.warning('Las contraseñas no coinciden'); return;
    }

    this.saving.set(true);
    try {
      const body: any = { ...this.form };
      if (!this.isEdit) body.username = this.username;
      if (this.password) body.password = this.password;

      if (this.isEdit) {
        await this.api.put(`/usuarios/${this.id}`, body);
        this.toast.success('Usuario actualizado correctamente');
      } else {
        await this.api.post('/usuarios', body);
        this.toast.success('Usuario creado correctamente');
      }
      this.router.navigate(['/usuarios']);
    } catch(e: any) {
      this.toast.error(e.message);
    } finally {
      this.saving.set(false);
    }
  }
}
