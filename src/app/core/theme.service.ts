import { Injectable, signal, effect } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  constructor() {
    document.documentElement.setAttribute('data-theme', this.dark() ? 'dark' : 'light');
    effect(() => {
      const isDark = this.dark();
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      this._syncStatusBar(isDark);
    });
  }

  toggle() { this.dark.update(v => !v); }

  private _syncStatusBar(isDark: boolean) {
    if (!Capacitor.isNativePlatform()) return;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark });
    });
  }
}
