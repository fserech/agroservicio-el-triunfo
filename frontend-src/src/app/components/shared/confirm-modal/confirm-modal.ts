import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.html',
})
export class ConfirmModalComponent {
  @Input() visible = false;
  @Input() title = '¿Confirmar acción?';
  @Input() message = '';
  @Input() icon = '⚠️';
  @Input() confirmLabel = 'Confirmar';
  @Input() confirmClass = 'btn-primary flex-1 justify-center';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  confirm() { this.confirmed.emit(); }
  cancel()  { this.cancelled.emit(); }
}
