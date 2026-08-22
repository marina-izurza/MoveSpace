import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ThemeService } from '../../../core/theme.service';
import { LanguageService } from '../../../core/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LucideSun, LucideMoon, LucideEye, LucideEyeOff } from '@lucide/angular';

const MIN_PASSWORD = 6;

@Component({
  selector: 'app-login',
  imports: [LucideSun, LucideMoon, LucideEye, LucideEyeOff, TranslatePipe],
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
        <p class="text-ink-muted text-sm mt-1">{{ 'auth.tagline' | t }}</p>
      </div>

      <!-- Card -->
      <div class="w-full bg-surface rounded-3xl p-6 shadow-sm border border-edge">

        <!-- Mode toggle (hidden in forgot mode) -->
        @if (mode() !== 'forgot') {
          <div class="flex bg-canvas rounded-xl p-1 mb-5">
            <button
              class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
              [class.bg-surface]="mode() === 'login'"
              [class.text-ink]="mode() === 'login'"
              [class.shadow-sm]="mode() === 'login'"
              [class.text-ink-muted]="mode() !== 'login'"
              (click)="setMode('login')"
            >{{ 'auth.signIn' | t }}</button>
            <button
              class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
              [class.bg-surface]="mode() === 'register'"
              [class.text-ink]="mode() === 'register'"
              [class.shadow-sm]="mode() === 'register'"
              [class.text-ink-muted]="mode() !== 'register'"
              (click)="setMode('register')"
            >{{ 'auth.createAccount' | t }}</button>
          </div>
        }

        <!-- Forgot password view -->
        @if (mode() === 'forgot') {
          @if (sent()) {
            <div class="text-center py-4 space-y-3">
              <div class="text-4xl">📬</div>
              <p class="font-semibold text-ink">{{ 'auth.checkEmail' | t }}</p>
              <p class="text-sm text-ink-muted">{{ 'auth.checkEmailHint' | t }}</p>
            </div>
          } @else {
            <div class="mb-4">
              <p class="text-base font-semibold text-ink mb-1">{{ 'auth.forgotTitle' | t }}</p>
              <p class="text-sm text-ink-muted">{{ 'auth.forgotHint' | t }}</p>
            </div>
            @if (error()) {
              <p class="text-sm text-danger bg-danger-muted rounded-xl px-3 py-2.5 mb-4">{{ error() }}</p>
            }
            <div class="space-y-3">
              <div>
                <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{{ 'auth.email' | t }}</label>
                <input
                  class="w-full bg-canvas border border-edge rounded-xl px-4 py-3 text-base text-ink outline-none focus:border-brand transition"
                  type="email" placeholder="tu@email.com" #forgotEmail
                  (keyup.enter)="sendReset(forgotEmail.value)"
                />
              </div>
              <button
                class="w-full bg-brand text-white py-3.5 rounded-xl font-semibold cursor-pointer transition-all disabled:opacity-50 shadow-lg shadow-brand/25"
                [disabled]="loading()"
                (click)="sendReset(forgotEmail.value)"
              >{{ loading() ? ('auth.loading' | t) : ('auth.sendLink' | t) }}</button>
              <button class="w-full text-sm text-ink-muted py-1" (click)="setMode('login')">
                ← {{ 'auth.backToLogin' | t }}
              </button>
            </div>
          }
        } @else if (awaitingConfirmation()) {
          <div class="text-center py-4 space-y-3">
            <div class="text-4xl">📬</div>
            <p class="font-semibold text-ink">{{ 'auth.confirmTitle' | t }}</p>
            <p class="text-sm text-ink-muted">{{ 'auth.confirmHint' | t }}</p>
            <button class="w-full text-sm text-ink-muted py-1 mt-2" (click)="backToLogin()">
              ← {{ 'auth.backToLogin' | t }}
            </button>
          </div>
        } @else {
          @if (error()) {
            <p class="text-sm text-danger bg-danger-muted rounded-xl px-3 py-2.5 mb-4">{{ error() }}</p>
          }

          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                {{ (mode() === 'login' ? 'auth.emailOrUsername' : 'auth.email') | t }}
              </label>
              <input
                class="w-full bg-canvas border rounded-xl px-4 py-3 text-base text-ink outline-none transition"
                [class.border-edge]="!emailError()"
                [class.focus:border-brand]="!emailError()"
                [class.border-danger]="emailError()"
                [type]="mode() === 'login' ? 'text' : 'email'"
                [attr.inputmode]="mode() === 'login' ? 'text' : 'email'"
                autocomplete="username"
                [placeholder]="(mode() === 'login' ? 'auth.emailOrUsernamePlaceholder' : 'auth.emailPlaceholder') | t"
                [value]="email()"
                (input)="email.set($any($event.target).value)"
              />
              @if (emailError(); as err) {
                <p class="text-xs text-danger mt-1.5">{{ err }}</p>
              }
            </div>
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider">{{ 'auth.password' | t }}</label>
                @if (mode() === 'login') {
                  <button class="text-xs text-brand font-medium" (click)="setMode('forgot')">
                    {{ 'auth.forgotPassword' | t }}
                  </button>
                }
              </div>
              <div class="relative">
                <input
                  class="w-full bg-canvas border rounded-xl pl-4 pr-12 py-3 text-base text-ink outline-none transition"
                  [class.border-edge]="!passwordError()"
                  [class.focus:border-brand]="!passwordError()"
                  [class.border-danger]="passwordError()"
                  [type]="showPassword() ? 'text' : 'password'"
                  [autocomplete]="mode() === 'register' ? 'new-password' : 'current-password'"
                  placeholder="••••••••"
                  [value]="password()"
                  (input)="password.set($any($event.target).value)"
                  (keyup.enter)="submit()"
                />
                <button
                  type="button"
                  class="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink transition"
                  [attr.aria-label]="(showPassword() ? 'auth.hidePassword' : 'auth.showPassword') | t"
                  [title]="(showPassword() ? 'auth.hidePassword' : 'auth.showPassword') | t"
                  (click)="showPassword.update(v => !v)"
                >
                  @if (showPassword()) {
                    <svg lucideEyeOff [size]="17" [strokeWidth]="1.8"></svg>
                  } @else {
                    <svg lucideEye [size]="17" [strokeWidth]="1.8"></svg>
                  }
                </button>
              </div>

              @if (passwordError(); as err) {
                <p class="text-xs text-danger mt-1.5">{{ err }}</p>
              } @else if (mode() === 'register') {
                <p class="text-xs mt-1.5 flex items-center gap-1.5"
                   [class.text-ink-muted]="!passwordLongEnough()"
                   [class.text-green-500]="passwordLongEnough()">
                  <span>{{ passwordLongEnough() ? '✓' : '•' }}</span>
                  {{ 'auth.passwordHint' | t }}
                </p>
              }
            </div>

            <button
              class="w-full bg-brand text-white py-3.5 rounded-xl font-semibold cursor-pointer transition-all disabled:opacity-50 shadow-lg shadow-brand/25 mt-2"
              style="margin-top: 8px"
              [disabled]="loading()"
              (click)="submit()"
            >
              {{ loading() ? ('auth.loading' | t) : (mode() === 'login' ? ('auth.signIn' | t) : ('auth.createAccount' | t)) }}
            </button>
          </div>
        }

      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private ls = inject(LanguageService);
  readonly theme = inject(ThemeService);

  mode = signal<'login' | 'register' | 'forgot'>('login');
  loading = signal(false);
  error = signal<string | null>(null);
  sent = signal(false);
  awaitingConfirmation = signal(false);

  email = signal('');
  password = signal('');
  showPassword = signal(false);

  // Nothing is flagged until the first attempt: complaining while someone is still typing
  // their email reads as the form arguing with them.
  private attempted = signal(false);

  readonly passwordLongEnough = computed(() => this.password().length >= MIN_PASSWORD);

  readonly emailError = computed(() => {
    if (!this.attempted()) return null;
    const value = this.email().trim();
    if (!value) return this.ls.t('auth.emailRequired');
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
    // Signing up always needs a real email — usernames only exist once an account does.
    // Signing in accepts either, since a username uniquely identifies the account too.
    if (this.mode() === 'login' && /^[a-zA-Z0-9_]{3,20}$/.test(value)) return null;
    return this.ls.t(this.mode() === 'login' ? 'auth.invalidEmailOrUsername' : 'auth.invalidEmail');
  });

  readonly passwordError = computed(() => {
    if (!this.attempted()) return null;
    if (!this.password()) return this.ls.t('auth.passwordRequired');
    if (this.mode() === 'register' && !this.passwordLongEnough()) return this.ls.t('auth.passwordShort');
    return null;
  });

  async submit() {
    this.attempted.set(true);
    this.error.set(null);
    if (this.emailError() || this.passwordError()) return;

    this.loading.set(true);
    try {
      if (this.mode() === 'login') {
        await this.auth.signIn(this.email().trim(), this.password());
      } else {
        const { needsConfirmation } = await this.auth.signUp(this.email().trim(), this.password());
        if (needsConfirmation) {
          this.awaitingConfirmation.set(true);
          return;
        }
      }
      const redirect = sessionStorage.getItem('redirectAfterLogin') || '/routines';
      sessionStorage.removeItem('redirectAfterLogin');
      this.router.navigateByUrl(redirect);
    } catch (e: any) {
      this.error.set(this.friendlyError(e));
    } finally {
      this.loading.set(false);
    }
  }

  setMode(mode: 'login' | 'register' | 'forgot') {
    this.mode.set(mode);
    // Warnings belong to the attempt that produced them, not to the next form.
    this.attempted.set(false);
    this.error.set(null);
  }

  backToLogin() {
    this.awaitingConfirmation.set(false);
    this.password.set('');
    this.setMode('login');
  }

  /** Supabase speaks English and in API terms; say what the person can do about it instead. */
  private friendlyError(e: unknown): string {
    const raw = String((e as { message?: string })?.message ?? '').toLowerCase();
    if (raw.includes('already registered') || raw.includes('already been registered')) return this.ls.t('auth.emailInUse');
    if (raw.includes('invalid login credentials') || raw.includes('invalid_credentials')) return this.ls.t('auth.wrongCredentials');
    if (raw.includes('email not confirmed')) return this.ls.t('auth.emailNotConfirmed');
    if (raw.includes('password should be at least')) return this.ls.t('auth.passwordShort');
    if (raw.includes('invalid email') || raw.includes('unable to validate email')) return this.ls.t('auth.invalidEmail');
    if (raw.includes('rate limit') || raw.includes('too many') || raw.includes('for security purposes')) return this.ls.t('auth.tooManyAttempts');
    if (raw.includes('failed to fetch') || raw.includes('network')) return this.ls.t('auth.networkError');
    return this.ls.t('auth.genericError');
  }

  async sendReset(email: string) {
    if (!email.trim()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.resetPassword(email.trim());
      this.sent.set(true);
    } catch (e: any) {
      this.error.set(this.friendlyError(e));
    } finally {
      this.loading.set(false);
    }
  }
}
