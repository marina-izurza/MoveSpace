import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { LucideHome, LucideCompass, LucideBookmark, LucideUser } from '@lucide/angular';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { TranslatePipe } from './shared/pipes/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive,
            LucideHome, LucideCompass, LucideBookmark, LucideUser, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  auth = inject(AuthService);
  private router = inject(Router);
  // Injected early so data-theme is applied before first render
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
    return !!this.auth.user() && !url.startsWith('/login') && !url.startsWith('/share');
  });
}
