// ventas-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matArrowBackOutline, matSearchOutline, matShoppingCartOutline } from '@ng-icons/material-icons/outline';
import { bootstrapXCircle } from '@ng-icons/bootstrap-icons';
import { VentasService, ProductosService, ClientesService, ToastService } from '../../../core/services/services';
import { Producto, Cliente } from '../../../core/models/models';

interface CartItem {
  producto_id: number; nombre: string; unidad: string;
  precio_unitario: number; cantidad: number; subtotal: number;
}

@Component({
  selector: 'app-ventas-form',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({ matArrowBackOutline, matSearchOutline, matShoppingCartOutline, bootstrapXCircle })],
  templateUrl: './ventas-form.component.html',
  styleUrls: ['./ventas-form.component.scss']
})
export class VentasFormComponent implements OnInit {
  private svc      = inject(VentasService);
  private prodSvc  = inject(ProductosService);
  private cliSvc   = inject(ClientesService);
  private toast    = inject(ToastService);
  private router   = inject(Router);

  productos: Producto[]          = [];
  productosFiltrados: Producto[] = [];
  clientes: Cliente[]            = [];
  cart: CartItem[]               = [];

  selectedClienteId: number | null = null;
  metodoPago   = 'efectivo';
  descuento    = 0;
  observaciones = '';
  searchProd   = '';
  saving       = false;

  get subtotal() { return this.cart.reduce((a, i) => a + i.subtotal, 0); }
  get iva()      { return (this.subtotal - this.descuento) * 0.12; }
  get total()    { return this.subtotal - this.descuento + this.iva; }

  ngOnInit(): void {
    this.prodSvc.getAll('', undefined, 'true', 1, 200).subscribe(r => {
      this.productos = r.data;
      this.productosFiltrados = r.data;
    });
    this.cliSvc.getAll('', '', 1, 200).subscribe(r => this.clientes = r.data);
  }

  filterProductos(): void {
    const t = this.searchProd.toLowerCase();
    this.productosFiltrados = t
      ? this.productos.filter(p => p.nombre.toLowerCase().includes(t) || p.cat_nombre?.toLowerCase().includes(t))
      : this.productos;
  }

  addToCart(p: Producto): void {
    const existing = this.cart.find(i => i.producto_id === p.id);
    if (existing) {
      existing.cantidad++;
      existing.subtotal = existing.cantidad * existing.precio_unitario;
    } else {
      this.cart.push({
        producto_id: p.id, nombre: p.nombre, unidad: p.unidad_medida,
        precio_unitario: p.precio_venta, cantidad: 1, subtotal: p.precio_venta
      });
    }
  }

  changeQty(item: CartItem, delta: number): void {
    item.cantidad = Math.max(1, item.cantidad + delta);
    item.subtotal = item.cantidad * item.precio_unitario;
  }

  removeFromCart(i: number): void { this.cart.splice(i, 1); }

  save(): void {
    if (!this.cart.length) { this.toast.warning('Agrega al menos un producto'); return; }
    this.saving = true;
    this.svc.create({
      cliente_id:    this.selectedClienteId ?? undefined,
      items:         this.cart.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario, subtotal: i.subtotal })),
      metodo_pago:   this.metodoPago,
      descuento:     this.descuento,
      observaciones: this.observaciones
    }).subscribe({
      next:  v => { this.toast.success(`Venta ${v.numero_factura} creada por Q ${v.total}`); this.router.navigate(['/ventas']); },
      error: e  => { this.saving = false; this.toast.error(e?.error?.error || 'Error procesando venta'); }
    });
  }

  cancel(): void { this.router.navigate(['/ventas']); }
}
