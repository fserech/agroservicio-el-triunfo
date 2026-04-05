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
  selector: 'app-productos-form', standalone: true,
  imports: [HeaderComponent, CommonModule, ReactiveFormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({ matArrowBackOutline, matSaveOutline })],
  templateUrl: './productos-form.component.html', styleUrls: ['./productos-form.component.scss']
})
export class ProductosFormComponent implements OnInit {
  private svc    = inject(ProductosService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb     = inject(FormBuilder);

  form!: FormGroup; isEdit = false; saving = false; productoId?: number;
  categorias: Categoria[] = [];
  get f() { return this.form.controls; }

  get margenCalculado(): number | null {
    const pc = +this.form?.get('precio_compra')?.value;
    const pv = +this.form?.get('precio_venta')?.value;
    if (!pc || !pv || pc <= 0) return null;
    return ((pv - pc) / pv) * 100;
  }

  ngOnInit(): void {
    this.svc.getCategorias().subscribe(c => this.categorias = c);
    this.form = this.fb.group({
      nombre:          ['', [Validators.required]],
      codigo:          [''],
      descripcion:     [''],
      categoria_id:    ['', [Validators.required]],
      unidad_medida:   ['unidad', [Validators.required]],
      precio_compra:   [0, [Validators.required, Validators.min(0.01)]],
      precio_venta:    [0, [Validators.required, Validators.min(0.01)]],
      stock_inicial:   [0, [Validators.min(0)]],
      stock_minimo:    [0, [Validators.min(0)]],
      stock_maximo:    [0, [Validators.min(0)]],
      ubicacion_bodega:[''],
      activo:          [true],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEdit = true; this.productoId = +id;
      this.svc.getById(+id).subscribe({
        next:  p => this.form.patchValue(p),
        error: () => { this.toast.error('Error cargando producto'); this.router.navigate(['/productos']); }
      });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value;
    const req = this.isEdit && this.productoId
      ? this.svc.update(this.productoId, val)
      : this.svc.create(val);
    req.subscribe({
      next:  () => { this.toast.success(this.isEdit ? 'Producto actualizado' : 'Producto creado'); this.router.navigate(['/productos']); },
      error: e  => { this.saving = false; this.toast.error(e?.error?.error || 'Error al guardar'); }
    });
  }

  cancel(): void { this.router.navigate(['/productos']); }
}