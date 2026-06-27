import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api';
import { ToastService } from '../../../services/toast';
import { Producto, Categoria } from '../../../models';

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './producto-form.html',
})
export class ProductoFormComponent implements OnInit {
  isEdit = false; id: number | null = null;
  saving = signal(false);
  categorias = signal<Categoria[]>([]);
  margen = 0;
  form: Partial<Producto> = { activo: true, precio_compra: 0, precio_venta: 0, unidad_medida: 'unidad', stock_actual: 0, stock_minimo: 0, stock_maximo: 0 };
  unidades = ['unidad','qq','lb','kg','lt','m','saco','caja','rollo','sobre','par'];

  constructor(private api: ApiService, private toast: ToastService, private router: Router, private route: ActivatedRoute) {}

  async ngOnInit() {
    try { this.categorias.set(await this.api.get<Categoria[]>('/categorias')); } catch {}
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true; this.id = +id;
      try { this.form = await this.api.get<Producto>(`/productos/${id}`); this.calcMargen(); }
      catch(e: any) { this.toast.error(e.message); this.router.navigate(['/productos']); }
    }
  }

  calcMargen() {
    const pc = +(this.form.precio_compra||0), pv = +(this.form.precio_venta||0);
    this.margen = pv ? ((pv - pc) / pv) * 100 : 0;
  }

  async save() {
    if (!this.form.nombre?.trim()) { this.toast.warning('El nombre es requerido'); return; }
    this.saving.set(true);
    try {
      const body = { ...this.form };
      if (!this.isEdit) { (body as any).stock_inicial = body.stock_actual; }
      if (this.isEdit) { await this.api.put(`/productos/${this.id}`, body); this.toast.success('Producto actualizado'); }
      else             { await this.api.post('/productos', body);         this.toast.success('Producto creado'); }
      this.router.navigate(['/productos']);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.saving.set(false); }
  }
}
