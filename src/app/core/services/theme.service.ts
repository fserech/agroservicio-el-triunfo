import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private dark = false;

  toggle() {
    this.dark = !this.dark;
    document.documentElement.classList.toggle('dark', this.dark);
  }

  get isDark() { return this.dark; }
}
