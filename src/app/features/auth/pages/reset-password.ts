import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { SupabaseService } from '../../../core/supabase.service';
import { ThemeService } from '../../../core/theme.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LucideSun, LucideMoon } from '@lucide/angular';

@Component({
  selector: 'app-reset-password',
  imports: [TranslatePipe, LucideSun, LucideMoon],
  template: `
    <div class="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 relative">

      <!-- Theme toggle -->
      <button
        class="absolute top-5 right-5 w-9 h-9 rounded-xl bg-surface border border-edge flex items-center justify-center text-ink-muted hover:text-ink shadow-sm transition"
        (click)="theme.toggle()"
      >
        @if (theme.dark()) {
          <svg lucideSun [size]="17" [strokeWidth]="1.8"></svg>
        } @else {
          <svg lucideMoon [size]="17" [strokeWidth]="1.8"></svg>
        }
      </button>

      <!-- Logo -->
      <div class="mb-10 text-center">
        <div class="w-18 h-18 rounded-[20px] flex items-center justify-center mx-auto mb-4"
          [style.background]="theme.dark() ? '#100F1E' : '#EDE9FE'"
          [style.box-shadow]="theme.dark() ? '0 8px 28px rgba(123,108,246,0.40)' : '0 8px 28px rgba(123,108,246,0.20)'">
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
      </div>

      <!-- Card -->
      <div class="w-full bg-surface rounded-3xl p-6 shadow-sm border border-edge">

        @if (done()) {
          <div class="text-center py-4 space-y-3">
            <div class="text-4xl">✅</div>
            <p class="font-semibold text-ink">{{ 'auth.passwordUpdated' | t }}</p>
          </div>

        } @else if (!ready()) {
          <div class="flex justify-center py-8">
            <div class="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin"></div>
          </div>

        } @else {
          <p class="text-base font-semibold text-ink mb-1">{{ 'auth.newPassword' | t }}</p>

          @if (error()) {
            <p class="text-sm text-danger bg-danger-muted rounded-xl px-3 py-2.5 mb-4 mt-3">{{ error() }}</p>
          }

          <div class="space-y-3 mt-4">
            <div>
              <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{{ 'auth.newPassword' | t }}</label>
              <input
                class="w-full bg-canvas border border-edge rounded-xl px-4 py-3 text-base text-ink outline-none focus:border-brand transition"
                type="password" placeholder="••••••••" #pw1
              />
            </div>
            <div>
              <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{{ 'auth.confirmPassword' | t }}</label>
              <input
                class="w-full bg-canvas border border-edge rounded-xl px-4 py-3 text-base text-ink outline-none focus:border-brand transition"
                type="password" placeholder="••••••••" #pw2
                (keyup.enter)="save(pw1.value, pw2.value)"
              />
            </div>
            <button
              class="w-full bg-brand text-white py-3.5 rounded-xl font-semibold cursor-pointer transition-all disabled:opacity-50 shadow-lg shadow-brand/25 mt-2"
              style="margin-top: 8px"
              [disabled]="loading()"
              (click)="save(pw1.value, pw2.value)"
            >{{ loading() ? ('auth.loading' | t) : ('auth.savePassword' | t) }}</button>
          </div>
        }

      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private auth = inject(AuthService);
  private supabase = inject(SupabaseService).client;
  private router = inject(Router);
  readonly theme = inject(ThemeService);

  ready = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  done = signal(false);

  ngOnInit() {
    this.supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        this.ready.set(true);
      }
    });
    // Already have a session (e.g. page refreshed)
    this.supabase.auth.getSession().then(({ data }) => {
      if (data.session) this.ready.set(true);
    });
  }

  async save(password: string, confirm: string) {
    this.error.set(null);
    if (password.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      this.error.set('Las contraseñas no coinciden');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.updatePassword(password);
      this.done.set(true);
      setTimeout(() => this.router.navigate(['/login']), 2500);
    } catch (e: any) {
      this.error.set(e.message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }
}
