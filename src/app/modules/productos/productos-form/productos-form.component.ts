// productos-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matArrowBackOutline, matSaveOutline } from '@ng-icons/material-icons/outline';
import { ProductosService, ToastService } from '../../../core/services/services';
import { Categoria } from '../../../core/models/models';

@Component({
  selector: 'app-productos-form',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, ReactiveFormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({ matArrowBackOutline, matSaveOutline })],
  templateUrl: './productos-form.component.html',
  styleUrls: ['./productos-form.component.scss']
})
export class ProductosFormComponent implements OnInit {
  private svc    = inject(ProductosService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb     = inject(FormBuilder);

  form!: FormGroup;
  categorias: Categoria[] = [];
  isEdit = false;
  saving = false;
  productoId?: number;

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
      this.isEdit = true; this.productoId = +id;
      this.svc.getById(+id).subscribe({
        next:  p => this.form.patchValue(p),
        error: () => { this.toast.error('Error cargando producto'); this.router.navigate(['/productos']); }
      });
    }
  }

  buildForm(): void {
    this.form = this.fb.group({
      codigo:          [''],
      nombre:          ['', [Validators.required, Validators.minLength(2)]],
      descripcion:     [''],
      categoria_id:    ['', [Validators.required]],
      precio_compra:   [null, [Validators.required, Validators.min(0.01)]],
      precio_venta:    [null, [Validators.required, Validators.min(0.01)]],
      unidad_medida:   ['Litro', [Validators.required]],
      stock_inicial:   [0],
      stock_minimo:    [0],
      stock_maximo:    [9999],
      ubicacion_bodega:[''],
      activo:          [true],
    });
  }

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
