import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { RoutinesStore } from '../features/routines/stores/routines.store';
import {
  detectPlatform, extractCaption, extractUrl, fetchVideoTitle, getPlatformName
} from '../features/routines/utils/platform';
import { RoutineSummary } from '../features/routines/models/RoutineSummary';

@Injectable({ providedIn: 'root' })
export class ShareReceiverService {
  private store = inject(RoutinesStore);

  readonly pendingUrl = signal<string | null>(null);
  readonly pendingName = signal<string>('');
  readonly saving = signal(false);
  readonly saveError = signal(false);

  // The Android intent is never cleared, so the same share can be handed to us more than once
  // (on resume, on a re-check). Remember what we already consumed and ignore repeats.
  private consumedUrl: string | null = null;
  private listening = false;

  readonly availableRoutines = computed<RoutineSummary[]>(() => this.store.routines());
  readonly routinesLoaded = computed<boolean>(() => this.store.listLoaded());
  readonly defaultRoutineId = computed<string>(() => this.store.inboxRoutine()?.id ?? '');
  readonly pendingPlatformName = computed<string>(() => {
    const url = this.pendingUrl();
    return url ? getPlatformName(detectPlatform(url)) : '';
  });

  async checkIncomingShare() {
    if (!Capacitor.isNativePlatform()) return;

    // A share that arrives while the app is already running reaches MainActivity.onNewIntent,
    // which re-emits this event — the initial check alone would miss every warm start.
    if (!this.listening) {
      this.listening = true;
      window.addEventListener('sendIntentReceived', () => this.checkIncomingShare());
    }

    try {
      const { SendIntent } = await import('send-intent');
      const result = await SendIntent.checkSendIntentReceived();
      if (!result) return;

      // `url` is the raw EXTRA_TEXT: it may be a bare link, a link inside a caption, or absent
      // with the link sitting in the title instead.
      const rawText = this.safeDecode(result.url ?? '');
      const rawTitle = this.safeDecode((result as { title?: string }).title ?? '');
      const url = extractUrl(rawText) || extractUrl(rawTitle);
      if (!url || url === this.consumedUrl) return;

      this.consumedUrl = url;
      this.saveError.set(false);
      this.pendingUrl.set(url);
      this.pendingName.set(extractCaption(rawText) || rawTitle.trim());

      if (!this.pendingName()) this.resolveTitle(url);
    } catch {
      // "No processing needed" — the activity was not launched from a share.
    }
  }

  /** URLs can carry a bare `%` from a caption, which makes decodeURIComponent throw. */
  private safeDecode(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private async resolveTitle(url: string) {
    const title = await fetchVideoTitle(url);
    if (title && this.pendingUrl() === url && !this.pendingName()) {
      this.pendingName.set(title);
    }
  }

  async confirmShare(name: string, routineId: string): Promise<boolean> {
    const url = this.pendingUrl();
    if (!url || !routineId || this.saving()) return false;

    this.saving.set(true);
    this.saveError.set(false);
    try {
      const finalName = name.trim() || this.pendingName().trim() || this.pendingPlatformName();
      await this.store.addExercise(routineId, { name: finalName, videoUrl: url });
      this.pendingUrl.set(null);
      this.pendingName.set('');
      return true;
    } catch {
      this.saveError.set(true);
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  clear() {
    this.pendingUrl.set(null);
    this.pendingName.set('');
    this.saveError.set(false);
  }
}
