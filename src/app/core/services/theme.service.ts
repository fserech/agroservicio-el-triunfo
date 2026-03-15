// theme.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  public default = 'light';
  public themeChanged = signal(this.theme);

  constructor() {
    // Aplicar tema guardado al iniciar
    this.applyTheme(this.theme);
  }

  public get theme(): string {
    return localStorage.getItem('theme') ?? this.default;
  }

  public set theme(value: string) {
    localStorage.setItem('theme', value);
    this.themeChanged.set(value);
    this.applyTheme(value);
  }

  public get isDark(): boolean {
    return this.theme === 'dark';
  }

  private applyTheme(theme: string): void {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
