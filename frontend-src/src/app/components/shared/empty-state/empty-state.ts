import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.html',
})
export class EmptyStateComponent {
  @Input() icon = '📭';
  @Input() message = 'Sin datos';
}
