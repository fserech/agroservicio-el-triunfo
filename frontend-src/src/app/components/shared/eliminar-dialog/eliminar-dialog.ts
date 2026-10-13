import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ApiService } from '../../../services/api';

/**
 * Diálogo de eliminación en dos pasos:
 *  1) confirmar  → DELETE /recurso/:id            (borra si no tiene historial)
 *  2) historial  → si el backend responde HAS_HISTORY, ofrece DESACTIVAR
 *                  (DELETE /recurso/:id?desactivar=1) para no perder reportes ni facturas.
 */
@Component({
  selector: 'app-eliminar-dialog',
  standalone: true,
  templateUrl: './eliminar-dialog.html',
})
export class EliminarDialogComponent {
  private api = inject(ApiService);

  visible  = input(false);
  endpoint = input('');            // p. ej. '/clientes/12'
  entidad  = input('registro');   // 'cliente' | 'proveedor' | 'producto'
  nombre   = input('');

  cerrado = output<void>();
  hecho   = output<'eliminado' | 'desactivado'>();

  fase       = signal<'confirmar' | 'historial'>('confirmar');
  detalle    = signal('');
  error      = signal('');
  trabajando = signal(false);

  constructor() {
    effect(() => {
      if (this.visible()) untracked(() => {
        this.fase.set('confirmar'); this.detalle.set(''); this.error.set(''); this.trabajando.set(false);
      });
    });
  }

  async eliminar() {
    this.trabajando.set(true); this.error.set('');
    try {
      const r: any = await this.api.delete(this.endpoint());
      this.hecho.emit(r?.accion === 'desactivado' ? 'desactivado' : 'eliminado');
    } catch (e: any) {
      if (e.code === 'HAS_HISTORY') { this.detalle.set(e.message); this.fase.set('historial'); }
      else this.error.set(e.message);
    } finally { this.trabajando.set(false); }
  }

  async desactivar() {
    this.trabajando.set(true); this.error.set('');
    try {
      await this.api.delete(this.endpoint() + '?desactivar=1');
      this.hecho.emit('desactivado');
    } catch (e: any) { this.error.set(e.message); }
    finally { this.trabajando.set(false); }
  }
}
