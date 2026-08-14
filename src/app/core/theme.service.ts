import { Injectable, signal, effect } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  constructor() {
    const isDarkInit = this.dark();
    document.documentElement.setAttribute('data-theme', isDarkInit ? 'dark' : 'light');
    this._syncStatusBar(isDarkInit);
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
    const bgColor = isDark ? '#13121F' : '#F5F4FF';
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      StatusBar.setBackgroundColor({ color: bgColor });
    });
  }
}
