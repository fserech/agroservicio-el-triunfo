import { Component, signal } from '@angular/core';
import { DashResumenComponent } from './resumen/resumen';
import { DashPrediccionComponent } from './prediccion/prediccion';

type Tab = 'resumen' | 'prediccion';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DashResumenComponent, DashPrediccionComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {
  tab = signal<Tab>('resumen');
  visitoPrediccion = signal(false);       // la pestaña pesada se monta al primer uso
  dias = signal(30);
  tick = signal(0);
  actualizado = signal(new Date());
  readonly periodos = [7, 30, 90, 180];

  irA(t: Tab) {
    this.tab.set(t);
    if (t === 'prediccion') this.visitoPrediccion.set(true);
  }
  refreshAll() { this.tick.update(v => v + 1); this.actualizado.set(new Date()); }
  hora() { return this.actualizado().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }); }
}
