import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  constructor() {
    document.documentElement.setAttribute('data-theme', this.dark() ? 'dark' : 'light');
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.dark() ? 'dark' : 'light');
      localStorage.setItem('theme', this.dark() ? 'dark' : 'light');
    });
  }

  toggle() { this.dark.update(v => !v); }
}
