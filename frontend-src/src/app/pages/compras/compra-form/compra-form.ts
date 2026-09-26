import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../services/api';
import { ToastService } from '../../../services/toast';
import { Proveedor, Producto } from '../../../models';
import { fmtQ } from '../../../utils/format';

interface LineItem {
  producto_id: number;
  nombre: string;
  codigo: string;
  unidad: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

const POR_PAGINA = 10;

@Component({
  selector: 'app-compra-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './compra-form.html',
})
export class CompraFormComponent implements OnInit {
  proveedores   = signal<Proveedor[]>([]);
  allProductos  = signal<Producto[]>([]);
  items         = signal<LineItem[]>([]);
  saving        = signal(false);
  loading       = signal(true);
  selProducto   = signal<Producto | null>(null);
  categorias    = signal<string[]>([]);

  proveedorId    = '';
  fechaEntrega   = '';
  observaciones  = '';
  buscarProd     = '';
  filtroCategoria = '';
  selCantidad    = 1;
  selPrecio      = 0;
  pagina         = 1;
  submitted      = false;
  Math           = Math;
  fmtQ           = fmtQ;

  get hoy() { return new Date().toISOString().split('T')[0]; }
  get subtotal() { return this.items().reduce((a, i) => a + i.subtotal, 0); }
  get iva()      { return this.subtotal * 0.12; }
  get total()    { return this.subtotal + this.iva; }

  prodsFiltrados = computed(() => {
    const b   = this.buscarProd.toLowerCase().trim();
    const cat = this.filtroCategoria.toLowerCase();
    return this.allProductos().filter(p =>
      (!b || p.nombre.toLowerCase().includes(b) ||
             (p.codigo || '').toLowerCase().includes(b) ||
             (p.cat_nombre || '').toLowerCase().includes(b)) &&
      (!cat || (p.cat_nombre || '').toLowerCase() === cat)
    );
  });

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.prodsFiltrados().length / POR_PAGINA)));

  prodsPagina = computed(() => {
    const start = (this.pagina - 1) * POR_PAGINA;
    return this.prodsFiltrados().slice(start, start + POR_PAGINA);
  });

  isEnOrden(id: number) { return this.items().some(i => i.producto_id === id); }
  isEnCarrito(id: number) { return this.isEnOrden(id); }

  constructor(private api: ApiService, private toast: ToastService, private router: Router) {}

  async ngOnInit() {
    this.loading.set(true);
    try {
      const [provsRes, prodsRes] = await Promise.all([
        this.api.get<any>('/proveedores'),
        this.api.get<any>('/productos?limit=500&activo=true')
      ]);
      this.proveedores.set(Array.isArray(provsRes) ? provsRes : (provsRes.data || []));
      const lista = (Array.isArray(prodsRes) ? prodsRes : (prodsRes.data || [])).map((p: any) => ({
        ...p,
        precio_venta:  parseFloat(p.precio_venta  || 0),
        precio_compra: parseFloat(p.precio_compra || 0),
        stock_actual:  parseFloat(p.stock_actual  ?? 0),
        stock_minimo:  parseFloat(p.stock_minimo  ?? 0),
      }));
      this.allProductos.set(lista);
      const cats = [...new Set(lista.map((p: any) => p.cat_nombre).filter(Boolean))].sort();
      this.categorias.set(cats as string[]);
    } catch(e: any) {
      this.toast.error('Error cargando datos: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  onBuscar(val: string) { this.buscarProd = val; this.pagina = 1; }
  onFiltroCategoria()   { this.pagina = 1; }

  seleccionarProducto(p: Producto) {
    this.selProducto.set(p);
    this.selPrecio   = p.precio_compra;
    this.selCantidad = 1;
  }

  agregarItem() {
    const prod = this.selProducto();
    if (!prod) return;
    if (!this.selCantidad || this.selCantidad <= 0) { this.toast.warning('Cantidad inválida'); return; }
    if (!this.selPrecio || this.selPrecio <= 0)     { this.toast.warning('Ingresa el precio de compra'); return; }
    const exist = this.items().find(i => i.producto_id === prod.id);
    if (exist) {
      exist.cantidad += this.selCantidad;
      exist.subtotal  = +(exist.cantidad * exist.precio_unitario).toFixed(2);
      this.items.set([...this.items()]);
      this.toast.info('Cantidad actualizada');
    } else {
      this.items.update(arr => [...arr, {
        producto_id:     prod.id,
        nombre:          prod.nombre,
        codigo:          prod.codigo || '',
        unidad:          prod.unidad_medida,
        precio_unitario: this.selPrecio,
        cantidad:        this.selCantidad,
        subtotal:        +(this.selCantidad * this.selPrecio).toFixed(2),
      }]);
    }
    this.selProducto.set(null);
    this.selCantidad = 1;
    this.selPrecio   = 0;
  }

  removeItem(item: LineItem) {
    this.items.update(arr => arr.filter(i => i !== item));
    if (this.selProducto()?.id === item.producto_id) this.selProducto.set(null);
  }

  async save() {
    this.submitted = true;
    if (!this.proveedorId)    { this.toast.warning('Selecciona un proveedor'); return; }
    if (!this.items().length) { this.toast.warning('Agrega al menos un producto'); return; }
    this.saving.set(true);
    try {
      await this.api.post('/compras', {
        proveedor_id:  +this.proveedorId,
        observaciones: this.observaciones || null,
        fecha_entrega: this.fechaEntrega  || null,
        items: this.items().map(i => ({
          producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario
        }))
      });
      this.toast.success('✅ Orden de compra creada');
      this.router.navigate(['/compras']);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.saving.set(false); }
  }
}
