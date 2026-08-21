import { Component, inject, computed, effect, signal, untracked } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { LucideHome, LucideChartColumn, LucideHeart, LucideUser, LucideX } from '@lucide/angular';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { TranslatePipe } from './shared/pipes/translate.pipe';
import { ShareReceiverService } from './core/share-receiver.service';
import { ConfirmService } from './core/confirm.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive,
            LucideHome, LucideChartColumn, LucideHeart, LucideUser, LucideX, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  auth = inject(AuthService);
  readonly shareReceiver = inject(ShareReceiverService);
  readonly confirm = inject(ConfirmService);
  private router = inject(Router);
  private _theme = inject(ThemeService);

  private url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  showNav = computed(() => {
    const url = this.url();
    return !!this.auth.user() && !url.startsWith('/login') && !url.startsWith('/share') && !url.startsWith('/r/');
  });

  shareExerciseName = signal('');
  shareRoutineId = signal('');

  // auth.user() emits a fresh User object on every token refresh; collapsing it to a boolean
  // keeps the share check on the actual login edge instead of re-running it every hour.
  private loggedIn = computed(() => !!this.auth.user());

  constructor() {
    effect(() => {
      if (this.loggedIn()) {
        this.shareReceiver.checkIncomingShare();
      }
    });

    // Prefill only while the field is untouched: the video title arrives asynchronously and
    // must not overwrite what the user is typing. Same for the routine, whose list may still
    // be loading when the sheet opens.
    effect(() => {
      const suggested = this.shareReceiver.pendingName();
      if (suggested && !untracked(this.shareExerciseName)) this.shareExerciseName.set(suggested);
    });

    effect(() => {
      const defaultId = this.shareReceiver.pendingUrl() ? this.shareReceiver.defaultRoutineId() : '';
      if (defaultId && !untracked(this.shareRoutineId)) this.shareRoutineId.set(defaultId);
    });
  }

  dismissShare() {
    this.shareReceiver.clear();
    this.resetShareForm();
  }

  async confirmShare() {
    const routineId = this.shareRoutineId() || this.shareReceiver.defaultRoutineId();
    if (!routineId) return;
    const saved = await this.shareReceiver.confirmShare(this.shareExerciseName(), routineId);
    if (saved) this.resetShareForm();
  }

  private resetShareForm() {
    this.shareExerciseName.set('');
    this.shareRoutineId.set('');
  }
}
