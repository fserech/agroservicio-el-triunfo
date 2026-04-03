// theme.service.ts — servicio centralizado para modo oscuro/claro
import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal<boolean>(this.loadTheme());

  constructor() {
    // Aplicar tema al iniciar y cada vez que cambia
    effect(() => {
      const dark = this.isDark();
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  }

  toggle(): void { this.isDark.update(v => !v); }

  setDark(val: boolean): void { this.isDark.set(val); }

  private loadTheme(): boolean {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
