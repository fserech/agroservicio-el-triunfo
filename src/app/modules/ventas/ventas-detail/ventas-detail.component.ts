import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matArrowBackOutline, matPrintOutline,
  matPersonOutline, matPaymentsOutline, matCalendarTodayOutline
} from '@ng-icons/material-icons/outline';
import { bootstrapCheckCircleFill, bootstrapXCircle } from '@ng-icons/bootstrap-icons';
import { VentasService, ToastService } from '../../../core/services/services';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-ventas-detail',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, NgIconComponent, HeaderComponent],
  providers: [provideIcons({
    matArrowBackOutline, matPrintOutline,
    matPersonOutline, matPaymentsOutline, matCalendarTodayOutline,
    bootstrapCheckCircleFill, bootstrapXCircle
  })],
  templateUrl: './ventas-detail.component.html',
  styleUrls: ['./ventas-detail.component.scss']
})
export class VentasDetailComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private svc    = inject(VentasService);
  private toast  = inject(ToastService);

  venta: any   = null;
  load         = true;
  showPrintModal = false;

  get items()     { return this.venta?.detalles ?? this.venta?.items ?? []; }
  get subtotal()  { return this.items.reduce((a: number, i: any) => a + Number(i.subtotal ?? 0), 0); }
  get descuento() { return Number(this.venta?.descuento ?? 0); }
  get iva()       { return Number(this.venta?.iva ?? 0); }
  get total()     { return Number(this.venta?.total ?? 0); }

  // numero_factura es el campo real en la BD
  get numeroRecibo() { return this.venta?.numero_factura ?? ''; }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getById(id).subscribe({
      next:  v  => { this.venta = v; this.load = false; },
      error: () => { this.load = false; this.toast.error('No se pudo cargar la venta'); }
    });
  }

  back(): void { this.router.navigate(['/ventas']); }

  print(): void { this.openPrintWindow(); }

  private openPrintWindow(): void {
    if (!this.venta) return;
    const v         = this.venta;
    const items     = (v.detalles ?? v.items ?? []) as any[];
    const subtotal  = items.reduce((a: number, i: any) => a + Number(i.subtotal ?? 0), 0);
    const descuento = Number(v.descuento ?? 0);
    const iva       = Number(v.iva ?? 0);
    const total     = Number(v.total ?? 0);

    const metodoPagoLabel: Record<string, string> = {
      efectivo: 'Efectivo', tarjeta: 'Tarjeta',
      credito: 'Crédito', transferencia: 'Transferencia'
    };
    const fmt   = (n: number) => 'Q ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fecha = new Date(v.fecha).toLocaleDateString('es-GT',
      { day: '2-digit', month: '2-digit', year: 'numeric' });

    const rows = items.map((d: any) => `
      <tr>
        <td>${d.producto_nombre ?? d.pn ?? d.nombre ?? ''}</td>
        <td style="text-align:center">${d.cantidad}</td>
        <td style="text-align:right">${fmt(Number(d.precio_unitario))}</td>
        <td style="text-align:right">${fmt(Number(d.subtotal))}</td>
      </tr>`).join('');

    // IVA solo se muestra si es mayor a 0
    const filaIva = iva > 0
      ? `<div class="row"><span>IVA (12%)</span><span>${fmt(iva)}</span></div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="es"><head>
  <meta charset="UTF-8">
  <title>Recibo ${v.numero_factura}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;color:#111;padding:16px;max-width:380px;margin:auto}
    .c{text-align:center}.b{font-weight:700}.r{text-align:right}
    .title{font-size:16px;font-weight:700;margin-bottom:2px}
    .sub{font-size:11px;color:#555}
    .line{border-top:1px dashed #888;margin:8px 0}
    .row{display:flex;justify-content:space-between;margin:3px 0;font-size:11px}
    .total{font-size:15px;font-weight:700}
    .discount{color:#10b981}
    table{width:100%;border-collapse:collapse;margin:4px 0}
    td,th{font-size:11px;padding:2px 3px}
    th{border-bottom:1px solid #333}
    .no-print{margin-top:20px;text-align:center}
    .no-print button{padding:8px 24px;background:#10b981;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:sans-serif}
    @media print{.no-print{display:none!important}body{padding:0}}
  </style>
</head><body>
  <div class="c b title">Agroservicio</div>
  <div class="c sub">Recibo de Venta</div>
  <div class="line"></div>
  <div class="row"><span>Recibo:</span><b>${v.numero_factura}</b></div>
  <div class="row"><span>Fecha:</span><span>${fecha}</span></div>
  <div class="row"><span>Cliente:</span><span>${v.cliente_nombre ?? v.cn ?? 'Consumidor final'}</span></div>
  ${(v.cliente_nit ?? v.nit) ? `<div class="row"><span>NIT:</span><span>${v.cliente_nit ?? v.nit}</span></div>` : ''}
  <div class="row"><span>Método pago:</span><span>${metodoPagoLabel[v.metodo_pago as string] ?? v.metodo_pago ?? ''}</span></div>
  <div class="line"></div>
  <table>
    <thead><tr>
      <th style="text-align:left">Producto</th>
      <th style="text-align:center">Cant</th>
      <th style="text-align:right">P/U</th>
      <th style="text-align:right">Sub</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="line"></div>
  <div class="row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
  ${descuento > 0 ? `<div class="row discount"><span>Descuento</span><span>− ${fmt(descuento)}</span></div>` : ''}
  ${filaIva}
  <div class="line"></div>
  <div class="row total"><span>TOTAL</span><span>${fmt(total)}</span></div>
  <div class="line"></div>
  ${v.observaciones ? `<div class="sub" style="margin:6px 0">Nota: ${v.observaciones}</div>` : ''}
  <div class="c sub" style="margin-top:12px">¡Gracias por su compra!</div>
  <div class="no-print">
    <button onclick="window.print()">🖨 Imprimir</button>
  </div>
  <script>window.onload=()=>window.print();<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=440,height=650');
    if (win) { win.document.write(html); win.document.close(); }
    else { this.toast.warning('Permite las ventanas emergentes para imprimir'); }
  }

  finalizar(): void {
    if (!confirm('¿Finalizar esta venta?')) return;
    this.svc.finalizar(this.venta.id).subscribe({
      next: () => { this.toast.success('Venta finalizada'); this.ngOnInit(); },
      error: e  => this.toast.error(e?.error?.error || 'Error al finalizar')
    });
  }

  cancelar(): void {
    if (!confirm('¿Cancelar esta venta? Se revertirá el stock.')) return;
    this.svc.cancelar(this.venta.id).subscribe({
      next: () => { this.toast.success('Venta cancelada'); this.ngOnInit(); },
      error: e  => this.toast.error(e?.error?.error || 'Error al cancelar')
    });
  }

  getStatusLabel(s: string): string {
    return ({ PENDING: 'Pendiente', IN_PROCESS: 'En Proceso',
              FINALIZED: 'Finalizada', CANCEL: 'Cancelada' } as Record<string,string>)[s] || s;
  }

  getMetodoLabel(m: string): string {
    const map: Record<string, string> = {
      efectivo: 'Efectivo', tarjeta: 'Tarjeta',
      credito: 'Crédito', transferencia: 'Transferencia'
    };
    return map[m] || m || '—';
  }
}