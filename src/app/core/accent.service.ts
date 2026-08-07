import { Injectable, signal, effect } from '@angular/core';

export type Accent = 'violet' | 'rose' | 'emerald' | 'sky' | 'amber';

export const ACCENT_PALETTE: { id: Accent; color: string }[] = [
  { id: 'violet',  color: '#7B6CF6' },
  { id: 'rose',    color: '#F43F5E' },
  { id: 'emerald', color: '#10B981' },
  { id: 'sky',     color: '#0EA5E9' },
  { id: 'amber',   color: '#F59E0B' },
];

const KEY = 'accent';

@Injectable({ providedIn: 'root' })
export class AccentService {
  readonly accent = signal<Accent>(
    (localStorage.getItem(KEY) as Accent | null) ?? 'violet'
  );

  readonly palette = ACCENT_PALETTE;

  constructor() {
    this.apply(this.accent());
    effect(() => this.apply(this.accent()));
  }

  set(accent: Accent) { this.accent.set(accent); }

  private apply(a: Accent) {
    localStorage.setItem(KEY, a);
    if (a === 'violet') {
      document.documentElement.removeAttribute('data-accent');
    } else {
      document.documentElement.setAttribute('data-accent', a);
    }
  }
}
