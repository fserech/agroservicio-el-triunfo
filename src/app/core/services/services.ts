// ================================================================
// AGROSERVICIO EL TRIUNFO — Servicios HTTP
// ================================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  AuthResponse, Usuario, Producto, InventarioItem, MovimientoInventario,
  Cliente, Venta, VentaEstado, Proveedor, OrdenCompra,
  CuentaCobrar, DashboardKpis, Configuracion, Categoria, Sucursal,
  PagedResponse, DetalleVenta, DetalleOrden
} from '../models/models';

const API = environment.apiUrl;

// ── Auth Service ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private _user$ = new BehaviorSubject<Usuario|null>(this.storedUser());

  user$ = this._user$.asObservable();
  get user() { return this._user$.value; }
  get isLoggedIn() { return !!this.getToken(); }
  get isAdmin()      { return this.user?.rol === 'admin'; }
  get isSupervisor() { return ['admin','supervisor'].includes(this.user?.rol||''); }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { username, password }).pipe(
      tap(r => { localStorage.setItem('token', r.token); localStorage.setItem('user', JSON.stringify(r.user)); this._user$.next(r.user); })
    );
  }

  logout(): void {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    this._user$.next(null); this.router.navigate(['/auth/login']);
  }

  getToken(): string|null { return localStorage.getItem('token'); }
  me(): Observable<Usuario> { return this.http.get<Usuario>(`${API}/auth/me`); }
  cambiarPassword(pa: string, pn: string): Observable<any> {
    return this.http.post(`${API}/auth/cambiar-password`, { password_actual: pa, password_nuevo: pn });
  }

  private storedUser(): Usuario|null {
    try { const s = localStorage.getItem('user'); return s ? JSON.parse(s) : null; } catch { return null; }
  }
}

// ── Dashboard Service ────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  kpis(): Observable<DashboardKpis>  { return this.http.get<DashboardKpis>(`${API}/dashboard/kpis`); }
  chart(): Observable<any[]>         { return this.http.get<any[]>(`${API}/dashboard/ventas-chart`); }
  topProductos(): Observable<any[]>  { return this.http.get<any[]>(`${API}/dashboard/top-productos`); }
  actividad(): Observable<any[]>     { return this.http.get<any[]>(`${API}/dashboard/actividad`); }
}

// ── Productos Service ─────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ProductosService {
  private http = inject(HttpClient);
  getAll(buscar='', categoria?: number, activo='true', page=1, limit=50): Observable<PagedResponse<Producto>> {
    let p = new HttpParams().set('page',page).set('limit',limit).set('activo',activo);
    if (buscar)    p = p.set('buscar', buscar);
    if (categoria) p = p.set('categoria', categoria);
    return this.http.get<PagedResponse<Producto>>(`${API}/productos`, { params: p });
  }
  getById(id: number): Observable<Producto> { return this.http.get<Producto>(`${API}/productos/${id}`); }
  create(d: Partial<Producto> & { stock_inicial?: number; stock_minimo?: number; stock_maximo?: number; ubicacion_bodega?: string }): Observable<Producto> {
    return this.http.post<Producto>(`${API}/productos`, d);
  }
  update(id: number, d: Partial<Producto>): Observable<Producto> { return this.http.put<Producto>(`${API}/productos/${id}`, d); }
  getCategorias(): Observable<Categoria[]> { return this.http.get<Categoria[]>(`${API}/categorias`); }
}

// ── Inventario Service ────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);
  getAll(estado?: 'critico'|'sin_stock'|'bajo'): Observable<InventarioItem[]> {
    let p = new HttpParams(); if (estado) p = p.set('estado', estado);
    return this.http.get<InventarioItem[]>(`${API}/inventario`, { params: p });
  }
  ajuste(d: { producto_id: number; tipo: 'entrada'|'salida'|'ajuste'; cantidad: number; motivo?: string }): Observable<any> {
    return this.http.post(`${API}/inventario/ajuste`, d);
  }
  movimientos(producto_id?: number, page=1, limit=50): Observable<MovimientoInventario[]> {
    let p = new HttpParams().set('page',page).set('limit',limit);
    if (producto_id) p = p.set('producto_id', producto_id);
    return this.http.get<MovimientoInventario[]>(`${API}/inventario/movimientos`, { params: p });
  }
}

// ── Clientes Service ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);
  getAll(buscar='', tipo='', page=1, limit=50): Observable<PagedResponse<Cliente>> {
    let p = new HttpParams().set('page',page).set('limit',limit);
    if (buscar) p = p.set('buscar', buscar);
    if (tipo)   p = p.set('tipo', tipo);
    return this.http.get<PagedResponse<Cliente>>(`${API}/clientes`, { params: p });
  }
  getById(id: number): Observable<Cliente> { return this.http.get<Cliente>(`${API}/clientes/${id}`); }
  create(d: Partial<Cliente>): Observable<Cliente>   { return this.http.post<Cliente>(`${API}/clientes`, d); }
  update(id: number, d: Partial<Cliente>): Observable<Cliente> { return this.http.put<Cliente>(`${API}/clientes/${id}`, d); }
}

// ── Ventas Service ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);
 
  getAll(f: { desde?:string; hasta?:string; estado?:string; cliente_id?:number; sucursal_id?:number; page?:number; limit?:number } = {}): Observable<PagedResponse<Venta>> {
    let p = new HttpParams();
    Object.entries(f).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v)); });
    return this.http.get<PagedResponse<Venta>>(`${API}/ventas`, { params: p });
  }
 
  getById(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${API}/ventas/${id}`);
  }
 
  create(d: {
    cliente_id?:    number;
    sucursal_id?:   number;
    items:          Partial<DetalleVenta>[];
    metodo_pago?:   string;
    descuento?:     number;
    aplica_iva?:    boolean;   // ← nuevo campo
    observaciones?: string;
  }): Observable<Venta> {
    return this.http.post<Venta>(`${API}/ventas`, d);
  }
 
  cambiarEstado(id: number, estado: VentaEstado): Observable<Venta> {
    return this.http.patch<Venta>(`${API}/ventas/${id}/estado`, { estado });
  }
 
  finalizar(id: number): Observable<Venta> { return this.cambiarEstado(id, 'FINALIZED'); }
  cancelar(id: number):  Observable<Venta> { return this.cambiarEstado(id, 'CANCEL'); }
}
 

// ── Proveedores Service ───────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private http = inject(HttpClient);
  getAll(buscar=''): Observable<Proveedor[]> {
    let p = new HttpParams(); if (buscar) p = p.set('buscar', buscar);
    return this.http.get<Proveedor[]>(`${API}/proveedores`, { params: p });
  }
  getById(id: number): Observable<Proveedor> { return this.http.get<Proveedor>(`${API}/proveedores/${id}`); }
  create(d: Partial<Proveedor>): Observable<Proveedor>          { return this.http.post<Proveedor>(`${API}/proveedores`, d); }
  update(id: number, d: Partial<Proveedor>): Observable<Proveedor> { return this.http.put<Proveedor>(`${API}/proveedores/${id}`, d); }
}

// ── Compras Service ───────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private http = inject(HttpClient);
  getAll(estado='', proveedor_id?: number, page=1, limit=20): Observable<OrdenCompra[]> {
    let p = new HttpParams().set('page',page).set('limit',limit);
    if (estado)      p = p.set('estado', estado);
    if (proveedor_id) p = p.set('proveedor_id', proveedor_id);
    return this.http.get<OrdenCompra[]>(`${API}/compras`, { params: p });
  }
  getById(id: number): Observable<OrdenCompra> { return this.http.get<OrdenCompra>(`${API}/compras/${id}`); }
  create(d: { proveedor_id: number; sucursal_id?: number; items: Partial<DetalleOrden>[]; observaciones?: string; fecha_entrega?: string }): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(`${API}/compras`, d);
  }
  cambiarEstado(id: number, estado: string): Observable<OrdenCompra> {
    return this.http.patch<OrdenCompra>(`${API}/compras/${id}/estado`, { estado });
  }
  recibir(id: number): Observable<any> { return this.http.patch(`${API}/compras/${id}/recibir`, {}); }
}

// ── Cuentas Cobrar Service ────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CuentasCobrarService {
  private http = inject(HttpClient);
 
  getAll(params?: { estado?: string; cliente_id?: number }): Observable<any[]> {
    let p = new HttpParams();
    if (params?.estado)     p = p.set('estado',     params.estado);
    if (params?.cliente_id) p = p.set('cliente_id', params.cliente_id);
    return this.http.get<any[]>(`${API}/cuentas-cobrar`, { params: p });
  }
 
  registrarPago(id: number, body: { monto: number; metodo_pago: string; referencia?: string }): Observable<any> {
    return this.http.post<any>(`${API}/cuentas-cobrar/${id}/pago`, body);
  }
}
 

// ── Reportes Service ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  ventas(desde: string, hasta: string, agrupar='dia'): Observable<any> {
    return this.http.get(`${API}/reportes/ventas`, { params: { desde, hasta, agrupar } });
  }
  inventario(): Observable<any> { return this.http.get(`${API}/reportes/inventario`); }
}

// ── Configuracion Service ─────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private http = inject(HttpClient);
  getAll(): Observable<Configuracion[]> { return this.http.get<Configuracion[]>(`${API}/configuracion`); }
  save(config: { clave: string; valor: string }[]): Observable<any> { return this.http.put(`${API}/configuracion`, { config }); }
}

// ── Usuarios Service ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  getAll(): Observable<Usuario[]>                              { return this.http.get<Usuario[]>(`${API}/usuarios`); }
  create(d: Partial<Usuario> & { password: string }): Observable<Usuario> { return this.http.post<Usuario>(`${API}/usuarios`, d); }
  update(id: number, d: Partial<Usuario>): Observable<Usuario> { return this.http.put<Usuario>(`${API}/usuarios/${id}`, d); }
}

// ── Sucursales Service ────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private http = inject(HttpClient);
  getAll(): Observable<Sucursal[]> { return this.http.get<Sucursal[]>(`${API}/sucursales`); }
}

// ── Toast Service ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new BehaviorSubject<{msg:string;type:string;id:number}[]>([]);
  toasts$ = this._toasts$.asObservable();
  private id = 0;
  show(msg: string, type: 'success'|'error'|'info'|'warning' = 'info', duration = 3500) {
    const toast = { msg, type, id: ++this.id };
    this._toasts$.next([...this._toasts$.value, toast]);
    setTimeout(() => this._toasts$.next(this._toasts$.value.filter(t => t.id !== toast.id)), duration);
  }
  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string)   { this.show(msg, 'error'); }
  info(msg: string)    { this.show(msg, 'info'); }
  warning(msg: string) { this.show(msg, 'warning'); }
}
