import { Injectable, signal } from '@angular/core';

interface ConfirmState {
  message: string;
  confirmLabel: string;
  resolve: (v: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<ConfirmState | null>(null);

  confirm(message: string, confirmLabel = 'Eliminar'): Promise<boolean> {
    return new Promise(resolve => {
      this.pending.set({ message, confirmLabel, resolve });
    });
  }

  accept() {
    this.pending()?.resolve(true);
    this.pending.set(null);
  }

  dismiss() {
    this.pending()?.resolve(false);
    this.pending.set(null);
  }
}
