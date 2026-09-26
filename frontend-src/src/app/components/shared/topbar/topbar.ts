import { Component, Output, EventEmitter, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../services/auth';
import { ToastService } from '../../../services/toast';
import { ApiService } from '../../../services/api';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard', '/ventas': 'Ventas', '/ventas/nueva': 'Nueva Venta',
  '/clientes': 'Clientes', '/clientes/nuevo': 'Nuevo Cliente',
  '/productos': 'Productos', '/productos/nuevo': 'Nuevo Producto',
  '/categorias': 'Categorías', '/inventario': 'Inventario',
  '/compras': 'Órdenes de Compra', '/compras/nueva': 'Nueva Orden de Compra',
  '/proveedores': 'Proveedores', '/proveedores/nuevo': 'Nuevo Proveedor',
  '/cuentas-cobrar': 'Cuentas por Cobrar',
  '/usuarios': 'Usuarios', '/usuarios/nuevo': 'Nuevo Usuario',
};

interface RestoreResult {
  ok: boolean;
  total_filas: number;
  tablas: Record<string, { insertados: number; omitidos: number }>;
  errores: string[];
}

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class TopbarComponent {
  @Output() menuToggle = new EventEmitter<void>();

  title       = 'Dashboard';
  menuOpen    = signal(false);
  busy        = signal<string | null>(null);

  // Restore modal state
  restoreModal  = signal(false);
  restoreType   = signal<'json' | 'excel'>('json');
  restoreFile   = signal<File | null>(null);
  restoreDrag   = signal(false);
  restoreResult = signal<RestoreResult | null>(null);

  get userInitial() { return (this.authService.user()?.nombre || 'U').charAt(0).toUpperCase(); }
  get isAdmin()     { return () => this.authService.user()?.rol === 'admin'; }

  tableEntries() {
    const r = this.restoreResult();
    if (!r) return [];
    return Object.entries(r.tablas);
  }

  constructor(
    public authService: AuthService,
    private router: Router,
    private toast: ToastService,
    private api: ApiService,
  ) {
    this.updateTitle(router.url);
    router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.updateTitle(e.urlAfterRedirects));
  }

  updateTitle(url: string) {
    const base = url.split('?')[0];
    this.title = TITLES[base]
      || Object.entries(TITLES).find(([k]) => base.startsWith(k + '/'))?.[1]
      || 'CRM';
  }

  toggleMenu() { this.menuOpen.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.restoreModal() && !(e.target as HTMLElement).closest('app-topbar')) {
      this.menuOpen.set(false);
    }
  }

  // ── EXPORTAR ──────────────────────────────────────────────────────────────
  async backup(format: 'json' | 'excel' | 'sql') {
    this.menuOpen.set(false);
    this.busy.set(`export-${format}`);
    try {
      const ext   = format === 'excel' ? 'xlsx' : format;
      const date  = new Date().toISOString().slice(0, 10);
      const fname = `agroservicio-backup-${date}.${ext}`;
      const res   = await fetch(`/api/backup/${format}`, {
        headers: { Authorization: `Bearer ${this.authService.token()}` }
      });
      if (!res.ok) {
        // Try to parse error as JSON, fallback to text
        let errMsg = 'Error al generar backup';
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch { errMsg = await res.text() || errMsg; }
        throw new Error(errMsg);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('El archivo generado está vacío');
      this.downloadBlob(blob, fname);
      this.toast.success(`✅ Backup ${format.toUpperCase()} descargado (${(blob.size/1024).toFixed(1)} KB)`);
    } catch(e: any) {
      this.toast.error('Error al exportar: ' + e.message);
    } finally { this.busy.set(null); }
  }

  // ── IMPORTAR / RESTAURAR ──────────────────────────────────────────────────
  openRestore(type: 'json' | 'excel') {
    this.menuOpen.set(false);
    this.restoreType.set(type);
    this.restoreFile.set(null);
    this.restoreResult.set(null);
    this.restoreModal.set(true);
  }

  closeRestore() {
    this.restoreModal.set(false);
    this.restoreFile.set(null);
    this.restoreResult.set(null);
    if (this.restoreResult()?.ok) {
      // Recargar la página para reflejar los datos restaurados
      window.location.reload();
    }
  }

  onRestoreFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.restoreFile.set(file);
  }

  onRestoreDrop(e: DragEvent) {
    e.preventDefault();
    this.restoreDrag.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.restoreFile.set(file);
  }

  // Abrir file input desde botón del menú (para .json o .xlsx)
  openRestore_legacy(type: 'json' | 'excel') { this.openRestore(type); }

  onFileSelected(e: Event, type: 'json' | 'excel') {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.restoreType.set(type);
    this.restoreFile.set(file);
    this.restoreResult.set(null);
    this.restoreModal.set(true);
  }

  async doRestore() {
    const file = this.restoreFile();
    if (!file) return;

    const type    = this.restoreType();
    const endpoint = type === 'json' ? '/backup/restaurar-json' : '/backup/restaurar-excel';
    this.busy.set(`restore-${type}`);

    try {
      const result = await this.api.uploadFile<RestoreResult>(endpoint, file);
      this.restoreResult.set(result);
      if (result.errores.length === 0) {
        this.toast.success(`Restauración exitosa — ${result.total_filas} filas cargadas`);
      } else {
        this.toast.warning(`Restauración con ${result.errores.length} advertencia(s)`);
      }
    } catch(e: any) {
      this.toast.error('Error al restaurar: ' + e.message);
    } finally { this.busy.set(null); }
  }

  logout() {
    this.menuOpen.set(false);
    this.authService.logout().then(() => this.router.navigate(['/login']));
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }
}
