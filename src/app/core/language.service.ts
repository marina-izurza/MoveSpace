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

/**
 * First launch only: follow the device. Tags carry a region (`es-ES`, `pt-BR`, `zh-Hans-CN`)
 * while the catalogue is keyed by language, so compare on the primary subtag. English when
 * the device speaks something the app does not.
 */
function deviceLocale(): Locale {
  const tags = [navigator.language, ...(navigator.languages ?? [])];
  for (const tag of tags) {
    const base = typeof tag === 'string' ? tag.split('-')[0].toLowerCase() : null;
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  // Own choice first, then the device on a fresh install, English as the floor. The stored
  // value is validated because it also arrives from user metadata, which is editable.
  readonly locale = signal<Locale>(
    isLocale(localStorage.getItem(LOCALE_KEY)) ? localStorage.getItem(LOCALE_KEY) as Locale : deviceLocale()
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
