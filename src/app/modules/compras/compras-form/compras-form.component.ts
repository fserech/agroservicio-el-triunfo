// compras-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matArrowBackOutline, matSaveOutline, matAddOutline } from '@ng-icons/material-icons/outline';
import { bootstrapXCircle } from '@ng-icons/bootstrap-icons';
import { ComprasService, ProveedoresService, ProductosService, ToastService } from '../../../core/services/services';
import { Proveedor, Producto, DetalleOrden } from '../../../core/models/models';

@Component({
  selector: 'app-compras-form',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, ReactiveFormsModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({ matArrowBackOutline, matSaveOutline, matAddOutline, bootstrapXCircle })],
  templateUrl: './compras-form.component.html',
  styleUrls: ['./compras-form.component.scss']
})
export class ComprasFormComponent implements OnInit {
  private svc      = inject(ComprasService);
  private provSvc  = inject(ProveedoresService);
  private prodSvc  = inject(ProductosService);
  private toast    = inject(ToastService);
  private router   = inject(Router);
  private route    = inject(ActivatedRoute);
  private fb       = inject(FormBuilder);

  form!: FormGroup;
  proveedores: Proveedor[] = [];
  productos:   Producto[]  = [];
  items: DetalleOrden[] = [];
  saving = false;

  newItem = { producto_id: '' as any, cantidad: null as any, precio_unitario: null as any };

  get f()         { return this.form.controls; }
  get subtotal()  { return this.items.reduce((a, i) => a + i.subtotal, 0); }
  get iva()       { return this.subtotal * 0.12; }
  get total()     { return this.subtotal + this.iva; }

  ngOnInit(): void {
    this.form = this.fb.group({
      proveedor_id:   ['', [Validators.required]],
      fecha_entrega:  [''],
      observaciones:  [''],
    });

    this.provSvc.getAll().subscribe(r => this.proveedores = r);
    this.prodSvc.getAll('', undefined, 'true', 1, 200).subscribe(r => this.productos = r.data);

    const provId = this.route.snapshot.queryParamMap.get('proveedor_id');
    if (provId) this.form.patchValue({ proveedor_id: +provId });
  }

  addItem(): void {
    if (!this.newItem.producto_id || !this.newItem.cantidad || !this.newItem.precio_unitario) {
      this.toast.warning('Selecciona producto, cantidad y precio');
      return;
    }
    const subtotal = this.newItem.cantidad * this.newItem.precio_unitario;
    this.items.push({
      producto_id:     +this.newItem.producto_id,
      cantidad:        this.newItem.cantidad,
      precio_unitario: this.newItem.precio_unitario,
      subtotal
    });
    this.newItem = { producto_id: '', cantidad: null, precio_unitario: null };
  }

  removeItem(i: number): void { this.items.splice(i, 1); }

  getProductoNombre(id: number): string {
    return this.productos.find(p => p.id === +id)?.nombre || `Producto #${id}`;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.items.length) { this.toast.warning('Agrega al menos un producto'); return; }
    this.saving = true;
    const { proveedor_id, fecha_entrega, observaciones } = this.form.value;
    this.svc.create({ proveedor_id, fecha_entrega, observaciones, items: this.items }).subscribe({
      next:  () => { this.toast.success('Orden de compra creada exitosamente'); this.router.navigate(['/compras']); },
      error: e  => { this.saving = false; this.toast.error(e?.error?.error || 'Error creando orden'); }
    });
  }

  cancel(): void { this.router.navigate(['/compras']); }
}
