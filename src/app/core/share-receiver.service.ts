import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { RoutinesStore } from '../features/routines/stores/routines.store';
import { detectPlatform, getPlatformName } from '../features/routines/utils/platform';
import { RoutineSummary } from '../features/routines/models/RoutineSummary';

@Injectable({ providedIn: 'root' })
export class ShareReceiverService {
  private store = inject(RoutinesStore);

  readonly pendingUrl = signal<string | null>(null);

  readonly availableRoutines = computed<RoutineSummary[]>(() => this.store.routines());
  readonly defaultRoutineId = computed<string>(() => this.store.inboxRoutine()?.id ?? '');
  readonly pendingPlatformName = computed<string>(() => {
    const url = this.pendingUrl();
    return url ? getPlatformName(detectPlatform(url)) : '';
  });

  async checkIncomingShare() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { SendIntent } = await import('send-intent');
      const result = await SendIntent.checkSendIntentReceived();
      if (result?.url) {
        this.pendingUrl.set(decodeURIComponent(result.url));
      } else if ((result as any)?.title) {
        // some apps pass the URL in the title field
        const maybeUrl = (result as any).title;
        if (maybeUrl?.startsWith('http')) this.pendingUrl.set(maybeUrl);
      }
    } catch {}
  }

  async confirmShare(name: string, routineId: string): Promise<void> {
    const url = this.pendingUrl();
    if (!url || !routineId) return;
    const finalName = name.trim() || this.pendingPlatformName();
    await this.store.addExercise(routineId, { name: finalName, videoUrl: url });
    this.pendingUrl.set(null);
  }

  clear() { this.pendingUrl.set(null); }
}
