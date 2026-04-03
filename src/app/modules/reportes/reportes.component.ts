// reportes.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matSearchOutline, matBarChartOutline, matDownloadOutline } from '@ng-icons/material-icons/outline';
import { ReportesService, ToastService } from '../../core/services/services';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [provideIcons({ matSearchOutline, matBarChartOutline, matDownloadOutline })],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit {
  private svc   = inject(ReportesService);
  private toast = inject(ToastService);

  desde = ''; hasta = ''; agrupar = 'dia'; rangoActivo = 'mes';
  loading = false;
  resumen: any = null; topProductos: any[] = []; porCategoria: any[] = []; serie: any[] = [];

  ngOnInit(): void { this.setRango('mes'); this.loadData(); }

  setRango(r: string): void {
    this.rangoActivo = r;
    const hoy = new Date();
    this.hasta = this.toLocalDate(hoy);
    if (r === 'semana') {
      const lun = new Date(hoy); lun.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
      this.desde = this.toLocalDate(lun); this.agrupar = 'dia';
    } else if (r === 'mes') {
      this.desde = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`; this.agrupar = 'dia';
    } else {
      this.desde = `${hoy.getFullYear()}-01-01`; this.agrupar = 'mes';
    }
  }

  loadData(): void {
    if (!this.desde || !this.hasta) return;
    this.loading = true; this.resumen = null;
    this.svc.ventas(this.desde, this.hasta, this.agrupar).subscribe({
      next: r => {
        this.resumen      = r.resumen;
        this.topProductos = r.top_productos  || [];
        this.porCategoria = r.por_categoria  || [];
        this.serie        = r.serie          || [];
        this.loading      = false;
      },
      error: () => { this.loading = false; this.toast.error('Error generando reporte'); }
    });
  }

  getTotalVentas(): number { return this.porCategoria.reduce((a, c) => a + +c.total, 0); }
  getPct(val: number): number { const t = this.getTotalVentas(); return t > 0 ? (val/t)*100 : 0; }

  // ── Exportar a Excel sin dependencias externas (usa CSV con extensión .xls)
  exportarExcel(): void {
    if (!this.resumen) { this.toast.error('Genera el reporte primero'); return; }

    const bom = '\uFEFF';
    let csv = bom;

    // Hoja 1: Resumen
    csv += `REPORTE DE VENTAS - Agroservicio El Triunfo\n`;
    csv += `Período:,${this.desde},al,${this.hasta}\n\n`;
    csv += `RESUMEN GENERAL\n`;
    csv += `Ventas Totales,Q ${this.resumen.m}\n`;
    csv += `Transacciones,${this.resumen.t}\n`;
    csv += `Ticket Promedio,Q ${this.resumen.avg}\n`;
    csv += `IVA Generado,Q ${this.resumen.iva}\n`;
    csv += `Descuentos,Q ${this.resumen.desc_}\n\n`;

    // Top Productos
    csv += `TOP PRODUCTOS VENDIDOS\n`;
    csv += `#,Producto,Unidades,Ingresos\n`;
    this.topProductos.forEach((p, i) => {
      csv += `${i+1},"${p.nombre}",${p.unidades},${p.ingresos}\n`;
    });
    csv += `\n`;

    // Por Categoría
    csv += `VENTAS POR CATEGORÍA\n`;
    csv += `Categoría,Total,% del Total\n`;
    this.porCategoria.forEach(c => {
      csv += `"${c.cat}",${c.total},${this.getPct(c.total).toFixed(1)}%\n`;
    });
    csv += `\n`;

    // Serie temporal
    if (this.serie.length > 0) {
      csv += `VENTAS POR PERÍODO\n`;
      csv += `Fecha,Nº Ventas,Monto Total,Promedio\n`;
      this.serie.forEach(s => {
        const prom = s.c > 0 ? (s.m / s.c).toFixed(2) : '0';
        csv += `${s.f},${s.c},${s.m},${prom}\n`;
      });
    }

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `reporte-ventas-${this.desde}-${this.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Reporte exportado correctamente');
  }

  // Exportar Excel real usando API nativa de tabla HTML
  exportarExcelReal(): void {
    if (!this.resumen) { this.toast.error('Genera el reporte primero'); return; }

    // Construir HTML de tabla completa
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<style>
  body { font-family: Arial; font-size: 11pt; }
  th { background: #00C793; color: white; font-weight: bold; padding: 6px; border: 1px solid #ccc; }
  td { padding: 5px; border: 1px solid #ccc; }
  .title { font-size: 14pt; font-weight: bold; color: #00C793; }
  .section { font-size: 12pt; font-weight: bold; margin-top: 10px; color: #374151; }
  .num { text-align: right; }
  .odd { background: #f9fafb; }
</style></head><body>`;

    html += `<p class="title">Reporte de Ventas — Agroservicio El Triunfo</p>`;
    html += `<p>Período: ${this.desde} al ${this.hasta} | Generado: ${new Date().toLocaleDateString('es-GT')}</p>`;

    // Resumen
    html += `<p class="section">Resumen General</p>`;
    html += `<table><tr><th>Indicador</th><th>Valor</th></tr>`;
    html += `<tr><td>Ventas Totales</td><td class="num">Q ${(+this.resumen.m).toLocaleString('es-GT', {minimumFractionDigits:2})}</td></tr>`;
    html += `<tr class="odd"><td>Transacciones</td><td class="num">${this.resumen.t}</td></tr>`;
    html += `<tr><td>Ticket Promedio</td><td class="num">Q ${(+this.resumen.avg).toLocaleString('es-GT', {minimumFractionDigits:2})}</td></tr>`;
    html += `<tr class="odd"><td>IVA Generado</td><td class="num">Q ${(+this.resumen.iva).toLocaleString('es-GT', {minimumFractionDigits:2})}</td></tr>`;
    html += `<tr><td>Descuentos</td><td class="num">Q ${(+this.resumen.desc_).toLocaleString('es-GT', {minimumFractionDigits:2})}</td></tr>`;
    html += `</table><br>`;

    // Top Productos
    html += `<p class="section">Top Productos Vendidos</p>`;
    html += `<table><tr><th>#</th><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr>`;
    this.topProductos.forEach((p, i) => {
      html += `<tr${i%2===1?' class="odd"':''}><td>${i+1}</td><td>${p.nombre}</td><td class="num">${(+p.unidades).toLocaleString()}</td><td class="num">Q ${(+p.ingresos).toLocaleString('es-GT',{minimumFractionDigits:0})}</td></tr>`;
    });
    html += `</table><br>`;

    // Por Categoría
    html += `<p class="section">Ventas por Categoría</p>`;
    html += `<table><tr><th>Categoría</th><th>Total</th><th>% del Total</th></tr>`;
    this.porCategoria.forEach((c, i) => {
      html += `<tr${i%2===1?' class="odd"':''}><td>${c.cat}</td><td class="num">Q ${(+c.total).toLocaleString('es-GT',{minimumFractionDigits:0})}</td><td class="num">${this.getPct(c.total).toFixed(1)}%</td></tr>`;
    });
    html += `</table><br>`;

    // Serie temporal
    if (this.serie.length > 0) {
      html += `<p class="section">Ventas por Período</p>`;
      html += `<table><tr><th>Fecha</th><th>Nº Ventas</th><th>Monto Total</th><th>Promedio</th></tr>`;
      this.serie.forEach((s, i) => {
        const prom = s.c > 0 ? s.m / s.c : 0;
        html += `<tr${i%2===1?' class="odd"':''}><td>${s.f}</td><td class="num">${s.c}</td><td class="num">Q ${(+s.m).toLocaleString('es-GT',{minimumFractionDigits:2})}</td><td class="num">Q ${prom.toLocaleString('es-GT',{minimumFractionDigits:0})}</td></tr>`;
      });
      html += `</table>`;
    }

    html += `</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `reporte-ventas-${this.desde}-${this.hasta}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Excel exportado correctamente');
  }

  private toLocalDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
