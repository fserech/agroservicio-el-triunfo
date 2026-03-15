import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matPrintOutline } from '@ng-icons/material-icons/outline';
import { VentasService, ToastService } from '../../../core/services/services';

@Component({
  selector: 'app-ventas-print',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, NgIconComponent],
  providers: [provideIcons({ matPrintOutline })],
  templateUrl: './ventas-print.component.html',
  styleUrls: ['./ventas-print.component.scss']
})
export class VentasPrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc   = inject(VentasService);
  private toast = inject(ToastService);

  venta: any = null;
  load  = true;
  empresa = 'Agroservicio';   // ← ajusta o trae de un ConfigService

  get items()    { return this.venta?.detalles ?? this.venta?.items ?? []; }
  get subtotal() { return this.items.reduce((a: number, i: any) => a + Number(i.subtotal ?? 0), 0); }
  get descuento(){ return Number(this.venta?.descuento ?? 0); }
  get iva()      { return Number(this.venta?.iva ?? 0); }
  get total()    { return Number(this.venta?.total ?? 0); }

  getMetodoLabel(m: string): string {
    const map: Record<string, string> = {
      efectivo: 'Efectivo', tarjeta: 'Tarjeta',
      credito: 'Crédito', transferencia: 'Transferencia'
    };
    return map[m] || m || '—';
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getById(id).subscribe({
      next: v => {
        this.venta = v;
        this.load  = false;
        // Dispara la impresión automáticamente tras renderizar
        setTimeout(() => window.print(), 400);
      },
      error: () => {
        this.load = false;
        this.toast.error('No se pudo cargar la venta para imprimir');
      }
    });
  }

  print(): void { window.print(); }
}