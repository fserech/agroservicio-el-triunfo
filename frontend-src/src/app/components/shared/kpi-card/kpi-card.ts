import { Component, Input } from '@angular/core';
import { KpiData } from '../../../models';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  templateUrl: './kpi-card.html',
})
export class KpiCardComponent {
  @Input() kpi!: KpiData;
}
