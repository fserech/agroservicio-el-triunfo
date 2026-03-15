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
  producto_id:     number;
  nombre:          string;
  unidad:          string;
  precio_unitario: number;
  cantidad:        number;
  subtotal:        number;
  stock_disponible: number;
}

@Component({
  selector: 'app-ventas-form',
  standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({ matArrowBackOutline, matSearchOutline, matShoppingCartOutline, bootstrapXCircle })],
  templateUrl: './ventas-form.component.html',
  styleUrls: ['./ventas-form.component.scss']
})
export class VentasFormComponent implements OnInit {
  private svc     = inject(VentasService);
  private prodSvc = inject(ProductosService);
  private cliSvc  = inject(ClientesService);
  private toast   = inject(ToastService);
  private router  = inject(Router);

  productos:           Producto[] = [];
  productosFiltrados:  Producto[] = [];
  clientes:            Cliente[]  = [];
  cart:                CartItem[] = [];

  selectedClienteId: number | null = null;
  metodoPago    = 'efectivo';
  descuento     = 0;
  observaciones = '';
  searchProd    = '';
  saving        = false;

  /** true = IVA incluido en el cálculo, false = sin IVA */
  ivaActivo = true;

  // ── Cálculos ──────────────────────────────────────────────────────────────

  get subtotal(): number {
    return this.cart.reduce((a, i) => a + i.subtotal, 0);
  }

  get baseImponible(): number {
    return Math.max(0, this.subtotal - this.descuento);
  }

  get iva(): number {
    return this.ivaActivo ? +(this.baseImponible * 0.12).toFixed(2) : 0;
  }

  get total(): number {
    return +(this.baseImponible + this.iva).toFixed(2);
  }

  // ── Inicialización ────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.prodSvc.getAll('', undefined, 'true', 1, 200).subscribe(r => {
      this.productos          = r.data;
      this.productosFiltrados = r.data;
    });
    this.cliSvc.getAll('', '', 1, 200).subscribe(r => this.clientes = r.data);
  }

  // ── Catálogo ──────────────────────────────────────────────────────────────

  filterProductos(): void {
    const t = this.searchProd.toLowerCase();
    this.productosFiltrados = t
      ? this.productos.filter(p =>
          p.nombre.toLowerCase().includes(t) ||
          p.cat_nombre?.toLowerCase().includes(t))
      : this.productos;
  }

  /** Devuelve true si el producto no tiene stock disponible */
  sinStock(p: Producto): boolean {
    return p.estado_stock === 'sin_stock' || Number(p.stock_actual ?? 0) <= 0;
  }

  addToCart(p: Producto): void {
    // Bloquear si no hay stock
    if (this.sinStock(p)) {
      this.toast.warning(`"${p.nombre}" no tiene stock disponible`);
      return;
    }

    const precio = Number(p.precio_venta);   // la API puede devolver string
    const stock  = Number(p.stock_actual ?? 0);
    const existing = this.cart.find(i => i.producto_id === p.id);

    if (existing) {
      // Validar que no supere el stock disponible
      if (existing.cantidad >= existing.stock_disponible) {
        this.toast.warning(`Stock insuficiente: solo hay ${existing.stock_disponible} ${existing.unidad}`);
        return;
      }
      existing.cantidad++;
      existing.subtotal = +(existing.cantidad * existing.precio_unitario).toFixed(2);
    } else {
      this.cart.push({
        producto_id:      p.id,
        nombre:           p.nombre,
        unidad:           p.unidad_medida,
        precio_unitario:  precio,
        cantidad:         1,
        subtotal:         +precio.toFixed(2),
        stock_disponible: stock
      });
    }
  }

  changeQty(item: CartItem, delta: number): void {
    const nueva = item.cantidad + delta;
    if (nueva < 1) return;
    if (nueva > item.stock_disponible) {
      this.toast.warning(`Stock máximo disponible: ${item.stock_disponible} ${item.unidad}`);
      return;
    }
    item.cantidad = nueva;
    item.subtotal = +(item.cantidad * item.precio_unitario).toFixed(2);
  }

  removeFromCart(i: number): void { this.cart.splice(i, 1); }

  // ── Guardar ───────────────────────────────────────────────────────────────

  save(): void {
    if (!this.cart.length) { this.toast.warning('Agrega al menos un producto'); return; }
    this.saving = true;
    this.svc.create({
      cliente_id:    this.selectedClienteId ?? undefined,
      items:         this.cart.map(i => ({
                       producto_id:     i.producto_id,
                       cantidad:        i.cantidad,
                       precio_unitario: i.precio_unitario,
                       subtotal:        i.subtotal
                     })),
      metodo_pago:   this.metodoPago,
      descuento:     this.descuento,
      observaciones: this.observaciones
    }).subscribe({
      next:  v => {
        this.toast.success(`Venta ${v.numero_factura} creada por Q ${v.total}`);
        this.router.navigate(['/ventas']);
      },
      error: e => {
        this.saving = false;
        this.toast.error(e?.error?.error || 'Error procesando venta');
      }
    });
  }

  cancel(): void { this.router.navigate(['/ventas']); }
}