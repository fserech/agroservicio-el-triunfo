import { Component, computed, input } from '@angular/core';

let uid = 0;

/** Mini gráfica SVG (sin dependencias). `forecast` dibuja la continuación punteada. */
@Component({
  selector: 'app-sparkline',
  standalone: true,
  host: { class: 'block w-full h-full' },
  template: `
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" class="w-full h-full overflow-visible">
      <defs>
        <linearGradient [attr.id]="gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.28" />
          <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0" />
        </linearGradient>
      </defs>
      @if (fill() && area()) { <path [attr.d]="area()" [attr.fill]="'url(#' + gid + ')'" /> }
      <path [attr.d]="line()" fill="none" [attr.stroke]="color()" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      @if (dash()) {
        <path [attr.d]="dash()" fill="none" [attr.stroke]="color()" stroke-width="1.4" stroke-dasharray="3 3"
              stroke-linecap="round" opacity="0.7" vector-effect="non-scaling-stroke" />
      }
    </svg>`,
})
export class SparklineComponent {
  values   = input.required<number[]>();
  forecast = input<number[]>([]);
  color    = input('#00C793');
  fill     = input(true);
  gid = 'spk' + ++uid;

  private pts = computed(() => {
    const all = [...this.values(), ...this.forecast()];
    if (all.length < 2) return [] as number[][];
    const min = Math.min(...all), max = Math.max(...all), rng = max - min || 1;
    return all.map((v, i) => [(i / (all.length - 1)) * 100, 28 - ((v - min) / rng) * 26]);
  });
  private toPath = (p: number[][]) => p.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(' ');

  line = computed(() => this.toPath(this.pts().slice(0, this.values().length)));
  area = computed(() => {
    const p = this.pts().slice(0, this.values().length);
    return p.length > 1 ? `${this.toPath(p)} L${p[p.length - 1][0].toFixed(2)},30 L0,30 Z` : '';
  });
  dash = computed(() => {
    const n = this.values().length;
    return this.forecast().length ? this.toPath(this.pts().slice(n - 1)) : '';
  });
}
