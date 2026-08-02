import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ThemeService } from '../../../core/theme.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LucideSun, LucideMoon } from '@lucide/angular';

@Component({
  selector: 'app-login',
  imports: [LucideSun, LucideMoon, TranslatePipe],
  template: `
    <div class="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 relative">

      <!-- Theme toggle -->
      <button
        class="absolute top-5 right-5 w-9 h-9 rounded-xl bg-surface border border-edge flex items-center justify-center text-ink-muted hover:text-ink shadow-sm transition"
        (click)="theme.toggle()"
        [attr.aria-label]="theme.dark() ? ('auth.lightMode' | t) : ('auth.darkMode' | t)"
      >
        @if (theme.dark()) {
          <svg lucideSun [size]="17" [strokeWidth]="1.8"></svg>
        } @else {
          <svg lucideMoon [size]="17" [strokeWidth]="1.8"></svg>
        }
      </button>

      <!-- Logo area -->
      <div class="mb-10 text-center">
        <div class="w-18 h-18 rounded-[20px] flex items-center justify-center mx-auto mb-4" style="background:#100F1E;box-shadow:0 8px 28px rgba(123,108,246,0.40)">
          <svg viewBox="0 0 100 120" width="50" height="60" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="kb-s" cx="33%" cy="28%" r="72%">
                <stop offset="0%" stop-color="#CAC3FF"/>
                <stop offset="38%" stop-color="#8E80FB"/>
                <stop offset="72%" stop-color="#5B4DD4"/>
                <stop offset="100%" stop-color="#352AA0"/>
              </radialGradient>
              <radialGradient id="kb-h" cx="30%" cy="22%" r="78%">
                <stop offset="0%" stop-color="#BCB6FF"/>
                <stop offset="100%" stop-color="#5042C2"/>
              </radialGradient>
            </defs>
            <rect x="30" y="5" width="40" height="14" rx="7" fill="url(#kb-h)"/>
            <circle cx="50" cy="74" r="42" fill="url(#kb-s)"/>
            <polygon points="36,61 36,87 70,74" fill="white" stroke="white" stroke-width="8" stroke-linejoin="round" paint-order="stroke fill" opacity="0.95"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-ink">MoveSpace</h1>
        <p class="text-ink-muted text-sm mt-1">{{ 'auth.tagline' | t }}</p>
      </div>

      <!-- Card -->
      <div class="w-full bg-surface rounded-3xl p-6 shadow-sm border border-edge">

        <!-- Mode toggle -->
        <div class="flex bg-canvas rounded-xl p-1 mb-5">
          <button
            class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
            [class.bg-surface]="mode() === 'login'"
            [class.text-ink]="mode() === 'login'"
            [class.shadow-sm]="mode() === 'login'"
            [class.text-ink-muted]="mode() !== 'login'"
            (click)="mode.set('login')"
          >{{ 'auth.signIn' | t }}</button>
          <button
            class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
            [class.bg-surface]="mode() === 'register'"
            [class.text-ink]="mode() === 'register'"
            [class.shadow-sm]="mode() === 'register'"
            [class.text-ink-muted]="mode() !== 'register'"
            (click)="mode.set('register')"
          >{{ 'auth.createAccount' | t }}</button>
        </div>

        @if (error()) {
          <p class="text-sm text-danger bg-danger-muted rounded-xl px-3 py-2.5 mb-4">{{ error() }}</p>
        }

        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{{ 'auth.email' | t }}</label>
            <input
              class="w-full bg-canvas border border-edge rounded-xl px-4 py-3 text-base text-ink outline-none focus:border-brand transition"
              type="email" placeholder="tu@email.com" #email
            />
          </div>
          <div>
            <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{{ 'auth.password' | t }}</label>
            <input
              class="w-full bg-canvas border border-edge rounded-xl px-4 py-3 text-base text-ink outline-none focus:border-brand transition"
              type="password" placeholder="••••••••" #password
              (keyup.enter)="submit(email.value, password.value)"
            />
          </div>

          <button
            class="w-full bg-brand text-white py-3.5 rounded-xl font-semibold cursor-pointer transition-all disabled:opacity-50 shadow-lg shadow-brand/25 mt-2"
            style="margin-top: 8px"
            [disabled]="loading()"
            (click)="submit(email.value, password.value)"
          >
            {{ loading() ? ('auth.loading' | t) : (mode() === 'login' ? ('auth.signIn' | t) : ('auth.createAccount' | t)) }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly theme = inject(ThemeService);

  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal<string | null>(null);

  async submit(email: string, password: string) {
    if (!email.trim() || !password.trim()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'login') {
        await this.auth.signIn(email, password);
      } else {
        await this.auth.signUp(email, password);
      }
      const redirect = sessionStorage.getItem('redirectAfterLogin') || '/routines';
      sessionStorage.removeItem('redirectAfterLogin');
      this.router.navigateByUrl(redirect);
    } catch (e: any) {
      this.error.set(e.message ?? 'Error desconocido');
    } finally {
      this.loading.set(false);
    }
  }
}
