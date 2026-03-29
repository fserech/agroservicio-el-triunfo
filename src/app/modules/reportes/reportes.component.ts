// reportes.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matSearchOutline } from '@ng-icons/material-icons/outline';
import { ReportesService, ToastService } from '../../core/services/services';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, FormsModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [provideIcons({ matSearchOutline })],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit {
  private svc   = inject(ReportesService);
  private toast = inject(ToastService);

  desde   = '';
  hasta   = '';
  agrupar = 'dia';
  loading = false;

  resumen:      any = null;
  topProductos: any[] = [];
  porCategoria: any[] = [];
  serie:        any[] = [];
rangoActivo: any;

  ngOnInit(): void {
    this.setRango('mes');
    this.loadData();
  }

  setRango(r: string): void {
    const hoy = new Date();
    this.hasta = hoy.toISOString().split('T')[0];
    if (r === 'semana') {
      const lun = new Date(hoy); lun.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
      this.desde = lun.toISOString().split('T')[0];
      this.agrupar = 'dia';
    } else if (r === 'mes') {
      this.desde = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`;
      this.agrupar = 'dia';
    } else {
      this.desde = `${hoy.getFullYear()}-01-01`;
      this.agrupar = 'mes';
    }
  }

  loadData(): void {
    if (!this.desde || !this.hasta) return;
    this.loading = true;
    this.svc.ventas(this.desde, this.hasta, this.agrupar).subscribe({
      next: r => {
        this.resumen      = r.resumen;
        this.topProductos = r.top_productos;
        this.porCategoria = r.por_categoria;
        this.serie        = r.serie;
        this.loading      = false;
      },
      error: () => { this.loading = false; this.toast.error('Error generando reporte'); }
    });
  }

  getTotalVentas(): number {
    return this.porCategoria.reduce((a, c) => a + +c.total, 0);
  }

  getPct(val: number): number {
    const t = this.getTotalVentas();
    return t > 0 ? (val / t) * 100 : 0;
  }
}
