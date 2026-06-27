import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../services/api';
import { ToastService } from '../../../services/toast';
import { Cliente, Producto } from '../../../models';
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
  selector: 'app-venta-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './venta-form.html',
})
export class VentaFormComponent implements OnInit {
  clientes      = signal<Cliente[]>([]);
  allProductos  = signal<Producto[]>([]);
  items         = signal<LineItem[]>([]);
  saving        = signal(false);
  loading       = signal(true);
  selProducto   = signal<Producto | null>(null);
  categorias    = signal<string[]>([]);

  clienteId       = '';
  metodoPago      = 'efectivo';
  fechaVence      = '';
  observaciones   = '';
  buscarProd      = '';
  filtroCategoria = '';
  selCantidad     = 1;
  selPrecio       = 0;
  pagina          = 1;
  Math            = Math;
  fmtQ            = fmtQ;

  // Nuevos campos
  aplicaIva    = false;
  tasaInteres  = 0;

  // Fecha mínima = mañana
  get fechaMinVence(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // Días de plazo calculados desde hoy hasta la fecha de vencimiento
  get diasCredito(): number {
    if (!this.fechaVence) return 0;
    const hoy   = new Date();
    const vence = new Date(this.fechaVence + 'T00:00:00');
    return Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Cálculos del resumen
  get subtotal(): number {
    return this.items().reduce((a, i) => a + i.subtotal, 0);
  }

  get iva(): number {
    return this.aplicaIva ? +(this.subtotal * 0.12).toFixed(2) : 0;
  }

  get totalBase(): number {
    return +(this.subtotal + this.iva).toFixed(2);
  }

  get montoInteres(): number {
    if (this.metodoPago !== 'credito' || this.tasaInteres <= 0) return 0;
    return +(this.totalBase * (this.tasaInteres / 100)).toFixed(2);
  }

  get totalFinal(): number {
    return +(this.totalBase + this.montoInteres).toFixed(2);
  }

  // Alias para compatibilidad
  get total(): number {
    return this.totalFinal;
  }

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

  totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.prodsFiltrados().length / POR_PAGINA))
  );

  prodsPagina = computed(() => {
    const start = (this.pagina - 1) * POR_PAGINA;
    return this.prodsFiltrados().slice(start, start + POR_PAGINA);
  });

  isEnCarrito(id: number): boolean {
    return this.items().some(i => i.producto_id === id);
  }

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.loading.set(true);
    try {
      const [cltsRes, prodsRes] = await Promise.all([
        this.api.get<any>('/clientes?limit=500'),
        this.api.get<any>('/productos?limit=500&activo=true')
      ]);
      this.clientes.set(Array.isArray(cltsRes) ? cltsRes : (cltsRes.data || []));
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
    } catch (e: any) {
      this.toast.error('Error cargando datos: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  onBuscar(val: string) {
    this.buscarProd = val;
    this.pagina = 1;
  }

  onFiltroCategoria() {
    this.pagina = 1;
  }

  onMetodoPagoChange() {
    if (this.metodoPago !== 'credito') {
      this.fechaVence  = '';
      this.tasaInteres = 0;
    }
  }

  seleccionarProducto(p: Producto) {
    this.selProducto.set(p);
    this.selPrecio   = p.precio_venta;
    this.selCantidad = 1;
  }

  agregarItem() {
    const prod = this.selProducto();
    if (!prod) return;
    if (!this.selCantidad || this.selCantidad <= 0) {
      this.toast.warning('Cantidad inválida'); return;
    }
    if (!this.selPrecio || this.selPrecio <= 0) {
      this.toast.warning('Precio inválido'); return;
    }
    if (prod.stock_actual! > 0 && this.selCantidad > prod.stock_actual!) {
      this.toast.warning(`Stock insuficiente. Disponible: ${prod.stock_actual} ${prod.unidad_medida}`);
      return;
    }
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
    if (!this.items().length) {
      this.toast.warning('Agrega al menos un producto'); return;
    }
    if (this.metodoPago === 'credito' && !this.fechaVence) {
      this.toast.warning('Ingresa la fecha de vencimiento del crédito'); return;
    }

    this.saving.set(true);
    try {
      await this.api.post('/ventas', {
        cliente_id:    this.clienteId ? +this.clienteId : null,
        metodo_pago:   this.metodoPago,
        fecha_vence:   this.metodoPago === 'credito' ? this.fechaVence : null,
        tasa_interes:  this.metodoPago === 'credito' ? this.tasaInteres : 0,
        aplica_iva:    this.aplicaIva,
        observaciones: this.observaciones || null,
        items: this.items().map(i => ({
          producto_id:     i.producto_id,
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario,
        }))
      });
      this.toast.success('✅ Venta registrada exitosamente');
      this.router.navigate(['/ventas']);
    } catch (e: any) {
      this.toast.error(e.message);
    } finally {
      this.saving.set(false);
    }
  }
}