import { effect, Injectable, signal } from '@angular/core';
import translations from '../../assets/i18n/translations.json';

const LOCALE_KEY = 'locale';
export type Locale = keyof typeof translations;

export const DEFAULT_LOCALE: Locale = 'en';

const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'it', label: 'Italiano',  flag: '🇮🇹' },
  { code: 'ja', label: '日本語',    flag: '🇯🇵' },
  { code: 'zh', label: '中文',      flag: '🇨🇳' },
];

function isLocale(code: unknown): code is Locale {
  return typeof code === 'string' && LOCALES.some(l => l.code === code);
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  // English until the device or the account says otherwise. The stored value is validated
  // because it also arrives from user metadata, which is editable.
  readonly locale = signal<Locale>(
    isLocale(localStorage.getItem(LOCALE_KEY)) ? localStorage.getItem(LOCALE_KEY) as Locale : DEFAULT_LOCALE
  );

  readonly available = LOCALES;

  constructor() {
    effect(() => localStorage.setItem(LOCALE_KEY, this.locale()));
  }

  set(code: Locale) { this.locale.set(code); }

  /** Apply a code of unknown provenance, ignoring anything unsupported. */
  setIfSupported(code: unknown): void {
    if (isLocale(code)) this.locale.set(code);
  }

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
