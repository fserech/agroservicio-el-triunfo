// header.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="md:p-1 m-2 bg-white rounded dark:bg-slate-900 border dark:border-slate-800 rounded-md p-2 text-center md:text-left md:rounded">
      <div class="ml-2">
        <h1 class="text-gray-400 dark:text-gray-300 text-lg font-bold">{{ headerTitle }}</h1>
        <p class="text-gray-400 dark:text-gray-300 text-xs hidden sm:block">{{ headerDescription }}</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class HeaderComponent {
  @Input() headerTitle       = '';
  @Input() headerDescription = '';
}
