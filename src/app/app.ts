import { Component, inject, computed, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { LucideHome, LucideCompass, LucideBookmark, LucideUser, LucideX } from '@lucide/angular';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { TranslatePipe } from './shared/pipes/translate.pipe';
import { ShareReceiverService } from './core/share-receiver.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive,
            LucideHome, LucideCompass, LucideBookmark, LucideUser, LucideX, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  auth = inject(AuthService);
  readonly shareReceiver = inject(ShareReceiverService);
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

  shareExerciseName = '';
  shareRoutineId = '';

  constructor() {
    effect(() => {
      if (this.auth.user()) {
        this.shareReceiver.checkIncomingShare();
      }
    });
    effect(() => {
      const url = this.shareReceiver.pendingUrl();
      if (url) {
        this.shareExerciseName = this.shareReceiver.pendingPlatformName();
        this.shareRoutineId = this.shareReceiver.defaultRoutineId();
      }
    });
  }

  dismissShare() { this.shareReceiver.clear(); }

  async confirmShare(name: string) {
    const routineId = this.shareRoutineId || this.shareReceiver.defaultRoutineId();
    await this.shareReceiver.confirmShare(name, routineId);
  }
}
