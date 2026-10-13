import { Component, ElementRef, NgZone, OnDestroy, effect, inject, input, viewChild } from '@angular/core';
import {
  Chart, ChartConfiguration,
  BarController, LineController, DoughnutController, BubbleController,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js';

// Solo se registra lo necesario (tree-shaking → bundle más liviano)
Chart.register(
  BarController, LineController, DoughnutController, BubbleController,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
);

// ── Tema global coherente con Tailwind (slate) ──────────────────────────────
Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = '#64748b';                       // slate-500
Chart.defaults.borderColor = '#f1f5f9';                 // slate-100
Chart.defaults.animation = { duration: 600, easing: 'easeOutQuart' };
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.legend.labels.boxHeight = 8;
Chart.defaults.plugins.legend.labels.padding = 14;
Object.assign(Chart.defaults.plugins.tooltip, {
  backgroundColor: '#0f172a',                           // slate-900
  titleColor: '#f8fafc',
  bodyColor: '#e2e8f0',
  padding: 10,
  cornerRadius: 8,
  boxPadding: 4,
  displayColors: true,
  usePointStyle: true,
  titleFont: { weight: 'bold', size: 11 },
});

/**
 * Envoltorio mínimo de Chart.js.
 * Uso: <div class="h-64"><app-chart [config]="cfg()" /></div>
 * El contenedor padre define la altura (Tailwind: h-64, h-72…).
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  host: { class: 'block w-full h-full' },
  template: `<div class="relative w-full h-full"><canvas #cv></canvas></div>`,
})
export class ChartComponent implements OnDestroy {
  config = input.required<ChartConfiguration<any, any, any>>();

  private cv = viewChild.required<ElementRef<HTMLCanvasElement>>('cv');
  private zone = inject(NgZone);
  private chart?: Chart;

  constructor() {
    effect(() => {
      const cfg = this.config();
      const el = this.cv().nativeElement;
      // Fuera de la zona de Angular: evita ciclos de detección de cambios por eventos del canvas
      this.zone.runOutsideAngular(() => {
        this.chart?.destroy();
        this.chart = new Chart(el, cfg);
      });
    });
  }

  ngOnDestroy() { this.chart?.destroy(); }
}
