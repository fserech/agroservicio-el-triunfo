import { Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SparklineComponent } from '../sparkline/sparkline';
import { fmtDelta } from '../../../utils/format';

/** Tarjeta KPI: valor, variación vs periodo anterior y mini tendencia. */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [SparklineComponent, NgTemplateOutlet, RouterLink],
  templateUrl: './stat-card.html',
})
export class StatCardComponent {
  label  = input.required<string>();
  value  = input.required<string>();
  /** undefined = sin chip · null = "nuevo" (no había base de comparación) */
  delta  = input<number | null | undefined>(undefined);
  /** true cuando subir es malo (p. ej. cuentas por cobrar) */
  invert = input(false);
  sub    = input('');
  hint   = input('');
  color  = input('#00C793');
  spark  = input<number[] | null>(null);
  /** Ruta del módulo de origen del dato (clic para ver el detalle) */
  link   = input<string | null>(null);

  texto = computed(() => fmtDelta(this.delta()));
  flecha = computed(() => {
    const d = this.delta();
    return d === null || d === undefined ? '' : d > 0.05 ? '▲' : d < -0.05 ? '▼' : '■';
  });
  chip = computed(() => {
    const d = this.delta();
    if (d === null) return 'bg-sky-50 text-sky-700 ring-sky-100';
    if (d === undefined || Math.abs(d) <= 0.05) return 'bg-slate-100 text-slate-500 ring-slate-200';
    const bueno = this.invert() ? d < 0 : d > 0;
    return bueno ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-rose-50 text-rose-700 ring-rose-100';
  });
}
