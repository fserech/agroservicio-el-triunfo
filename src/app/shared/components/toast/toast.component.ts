// toast.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matCheckCircleOutline, matErrorOutline,
  matWarningOutline, matInfoOutline
} from '@ng-icons/material-icons/outline';
import { ToastService } from '../../../core/services/services';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, AsyncPipe, NgIconComponent],
  providers: [provideIcons({ matCheckCircleOutline, matErrorOutline, matWarningOutline, matInfoOutline })],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent {
  private toastSvc = inject(ToastService);
  toasts$ = this.toastSvc.toasts$;

  getIcon(type: string): string {
    return { success: 'matCheckCircleOutline', error: 'matErrorOutline',
             warning: 'matWarningOutline', info: 'matInfoOutline' }[type] || 'matInfoOutline';
  }
}
