import { effect, Injectable, signal } from '@angular/core';
import translations from '../../assets/i18n/translations.json';

const LOCALE_KEY = 'locale';
export type Locale = keyof typeof translations;

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly locale = signal<Locale>(
    (localStorage.getItem(LOCALE_KEY) as Locale | null) ?? 'en'
  );

  readonly available: { code: Locale; label: string; flag: string }[] = [
    { code: 'en', label: 'English',   flag: '🇬🇧' },
    { code: 'es', label: 'Español',   flag: '🇪🇸' },
    { code: 'fr', label: 'Français',  flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch',   flag: '🇩🇪' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'it', label: 'Italiano',  flag: '🇮🇹' },
    { code: 'ja', label: '日本語',    flag: '🇯🇵' },
    { code: 'zh', label: '中文',      flag: '🇨🇳' },
  ];

  constructor() {
    effect(() => localStorage.setItem(LOCALE_KEY, this.locale()));
  }

  set(code: Locale) { this.locale.set(code); }

  t(key: string): string {
    const parts = key.split('.');
    let val: any = (translations as any)[this.locale()];
    for (const p of parts) val = val?.[p];
    return typeof val === 'string' ? val : key;
  }

  ta(key: string): string[] {
    const parts = key.split('.');
    let val: any = (translations as any)[this.locale()];
    for (const p of parts) val = val?.[p];
    return Array.isArray(val) ? val : [];
  }
}
