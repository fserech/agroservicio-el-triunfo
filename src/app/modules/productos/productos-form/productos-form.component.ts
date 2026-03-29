import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matArrowBackOutline, matSaveOutline, matAddOutline,
  matModeEditOutline, matDeleteOutline, matCheckOutline, matCloseOutline
} from '@ng-icons/material-icons/outline';
import { EventBusService, ProductosService, ToastService } from '../../../core/services/services';
import { Categoria } from '../../../core/models/models';

@Component({
  selector: 'app-productos-form',
  standalone: true,
  imports: [HeaderComponent, CommonModule, ReactiveFormsModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({
    matArrowBackOutline, matSaveOutline, matAddOutline,
    matModeEditOutline, matDeleteOutline, matCheckOutline, matCloseOutline
  })],
  templateUrl: './productos-form.component.html',
  styleUrls: ['./productos-form.component.scss']
})
export class ProductosFormComponent implements OnInit {
  private svc    = inject(ProductosService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb     = inject(FormBuilder);
  private eventBus = inject(EventBusService);

  form!: FormGroup;
  categorias: Categoria[] = [];
  isEdit     = false;
  saving     = false;
  productoId?: number;

  // ── Nueva categoría ──────────────────────────────────────
  mostrarNuevaCategoria = false;
  nuevaCategoriaName    = '';
  savingCategoria       = false;

  // ── Editar categoría ─────────────────────────────────────
  editandoCategoriaId: number | null = null;
  editandoCategoriaName = '';
  savingEditCategoria   = false;

  // ── Eliminar categoría ───────────────────────────────────
  deletingCategoriaId: number | null = null;

  // ── Panel de gestión visible ─────────────────────────────
  mostrarGestionCategorias = false;

  get f() { return this.form.controls; }

  get margenCalculado(): number | null {
    if (!this.form) return null;
    const compra = +this.form.get('precio_compra')?.value;
    const venta  = +this.form.get('precio_venta')?.value;
    if (!compra || compra === 0) return null;
    return ((venta - compra) / compra) * 100;
  }

  ngOnInit(): void {
    this.buildForm();
    this.svc.getCategorias().subscribe(c => this.categorias = c);
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEdit     = true;
      this.productoId = +id;
      this.svc.getById(+id).subscribe({
        next:  p => this.form.patchValue(p),
        error: () => { this.toast.error('Error cargando producto'); this.router.navigate(['/productos']); }
      });
    }
  }

  buildForm(): void {
    this.form = this.fb.group({
      codigo:           [''],
      nombre:           ['', [Validators.required, Validators.minLength(2)]],
      descripcion:      [''],
      categoria_id:     ['', [Validators.required]],
      precio_compra:    [null, [Validators.required, Validators.min(0.01)]],
      precio_venta:     [null, [Validators.required, Validators.min(0.01)]],
      unidad_medida:    ['Litro', [Validators.required]],
      stock_inicial:    [0],
      stock_minimo:     [0],
      stock_maximo:     [9999],
      ubicacion_bodega: [''],
      activo:           [true],
    });
  }

  // ── NUEVA CATEGORÍA ──────────────────────────────────────
  toggleNuevaCategoria(): void {
    this.mostrarNuevaCategoria   = !this.mostrarNuevaCategoria;
    this.nuevaCategoriaName      = '';
    this.mostrarGestionCategorias = false;
    this.cancelarEdicionCategoria();
  }

  agregarCategoria(): void {
    const nombre = this.nuevaCategoriaName.trim();
    if (!nombre) return;
    this.savingCategoria = true;
    this.svc.createCategoria({ nombre }).subscribe({
      next: (nueva) => {
        this.categorias            = [...this.categorias, nueva].sort((a,b) => a.nombre.localeCompare(b.nombre));
        this.form.patchValue({ categoria_id: nueva.id });
        this.mostrarNuevaCategoria = false;
        this.nuevaCategoriaName    = '';
        this.savingCategoria       = false;
        this.toast.success('Categoría creada');
      },
      error: (e) => {
        this.savingCategoria = false;
        this.toast.error(e?.error?.error || 'Error creando categoría');
      }
    });
  }

  // ── EDITAR CATEGORÍA ─────────────────────────────────────
  iniciarEdicionCategoria(cat: Categoria): void {
    this.editandoCategoriaId   = cat.id;
    this.editandoCategoriaName = cat.nombre;
  }

  cancelarEdicionCategoria(): void {
    this.editandoCategoriaId   = null;
    this.editandoCategoriaName = '';
  }

  guardarEdicionCategoria(cat: Categoria): void {
    const nombre = this.editandoCategoriaName.trim();
    if (!nombre || nombre === cat.nombre) { this.cancelarEdicionCategoria(); return; }
    this.savingEditCategoria = true;
    this.svc.updateCategoria(cat.id, { nombre }).subscribe({
      next: (actualizada) => {
        this.categorias = this.categorias
          .map(c => c.id === actualizada.id ? actualizada : c)
          .sort((a,b) => a.nombre.localeCompare(b.nombre));
        this.cancelarEdicionCategoria();
        this.savingEditCategoria = false;
        this.toast.success('Categoría actualizada');
      },
      error: (e) => {
        this.savingEditCategoria = false;
        this.toast.error(e?.error?.error || 'Error actualizando categoría');
      }
    });
  }

  // ── ELIMINAR CATEGORÍA ───────────────────────────────────
  eliminarCategoria(cat: Categoria): void {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"? Solo se puede si no tiene productos activos.`)) return;
    this.deletingCategoriaId = cat.id;
    this.svc.deleteCategoria(cat.id).subscribe({
      next: () => {
        this.categorias = this.categorias.filter(c => c.id !== cat.id);
        const catActual = this.form.get('categoria_id')?.value;
        if (+catActual === cat.id) this.form.patchValue({ categoria_id: '' });
        this.deletingCategoriaId = null;
        this.toast.success('Categoría eliminada');
      },
      error: (e) => {
        this.deletingCategoriaId = null;
        this.toast.error(e?.error?.error || 'Error eliminando categoría');
      }
    });
  }

  // ── PANEL GESTIÓN ────────────────────────────────────────
  toggleGestionCategorias(): void {
    this.mostrarGestionCategorias = !this.mostrarGestionCategorias;
    this.mostrarNuevaCategoria    = false;
    this.cancelarEdicionCategoria();
  }

  // ── GUARDAR PRODUCTO ─────────────────────────────────────
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const data = this.form.value;
    const req  = this.isEdit && this.productoId
      ? this.svc.update(this.productoId, data)
      : this.svc.create(data);
    req.subscribe({
      next:  () => {
        this.toast.success(this.isEdit ? 'Producto actualizado' : 'Producto creado exitosamente');
        this.eventBus.emitRefresh();
        this.router.navigate(['/productos']);
      },
      error: e => {
        this.saving = false;
        this.toast.error(e?.error?.error || 'Error guardando producto');
      }
    });
  }

  cancel(): void { this.router.navigate(['/productos']); }
}