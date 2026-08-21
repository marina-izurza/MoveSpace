import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ThemeService } from '../../../core/theme.service';
import { LanguageService, Locale } from '../../../core/language.service';
import { AccentService, Accent } from '../../../core/accent.service';
import { RoutinesStore } from '../../routines/stores/routines.store';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { appOrigin } from '../../../core/app-origin';
import { ConfirmService } from '../../../core/confirm.service';
import {
  LucideSun, LucideMoon, LucideLogOut, LucideBell, LucideShield,
  LucideChevronRight, LucideChevronDown, LucideLanguages, LucidePencil,
  LucideMail, LucideKeyRound, LucideSettings2, LucideX, LucideLink, LucideCheck
} from '@lucide/angular';

@Component({
  selector: 'app-profile',
  imports: [
    LucideSun, LucideMoon, LucideLogOut, LucideBell, LucideShield,
    LucideChevronRight, LucideChevronDown, LucideLanguages, LucidePencil,
    LucideMail, LucideKeyRound, LucideSettings2, LucideX, LucideLink, LucideCheck, TranslatePipe
  ],
  template: `
    <div class="flex flex-col min-h-full">

      <!-- Gradient header -->
      <div class="bg-linear-to-br from-brand to-[#4338CA] px-5 pt-14 pb-12 flex flex-col items-center text-center relative">

        <!-- Settings button -->
        <button
          class="absolute top-5 right-5 w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm"
          (click)="showSettings.set(true)"
        >
          <svg lucideSettings2 [size]="17" [strokeWidth]="1.8"></svg>
        </button>

        <div class="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center mb-4 shadow-xl">
          <span class="text-3xl font-bold text-white select-none">{{ initial() }}</span>
        </div>
        <p class="text-base font-semibold text-white">{{ email() }}</p>
        <p class="text-white/50 text-xs mt-1">{{ 'profile.member' | t }}</p>
      </div>

      <!-- Stats card -->
      <div class="px-5 -mt-6 z-10 relative">
        <div class="bg-surface rounded-2xl border border-edge shadow-md p-4 flex">
          <div class="flex-1 text-center">
            <p class="text-2xl font-bold text-ink">{{ store.routines().length }}</p>
            <p class="text-xs text-ink-muted mt-0.5">{{ 'profile.routines' | t }}</p>
          </div>
          <div class="w-px bg-edge"></div>
          <div class="flex-1 text-center">
            <p class="text-2xl font-bold text-ink">{{ totalExercises() }}</p>
            <p class="text-xs text-ink-muted mt-0.5">{{ 'profile.exercises' | t }}</p>
          </div>
          <div class="w-px bg-edge"></div>
          <div class="flex-1 text-center">
            <p class="text-2xl font-bold text-ink">—</p>
            <p class="text-xs text-ink-muted mt-0.5">{{ 'profile.thisWeek' | t }}</p>
          </div>
        </div>
      </div>

      <!-- Rutinas compartidas -->
      <div class="px-5 mt-5 pb-28">
        <p class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">{{ 'profile.sharedRoutines' | t }}</p>

        @if (publicRoutines().length === 0) {
          <div class="bg-surface rounded-2xl border border-edge p-6 flex flex-col items-center text-center gap-2">
            <span class="text-3xl">🔒</span>
            <p class="text-sm font-medium text-ink">{{ 'profile.noShared' | t }}</p>
            <p class="text-xs text-ink-muted">{{ 'profile.noSharedHint' | t }}</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (r of publicRoutines(); track r.id) {
              <div class="bg-surface rounded-2xl border border-edge shadow-sm px-4 py-3.5 flex items-center gap-3">
                @if (r.emoji) {
                  <div class="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-xl shrink-0">{{ r.emoji }}</div>
                } @else {
                  <div class="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-brand w-5 h-5">
                      <path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11"/><circle cx="3.5" cy="6.5" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="17.5" r="1"/>
                    </svg>
                  </div>
                }
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-ink truncate">{{ r.name }}</p>
                  <p class="text-xs text-ink-muted">{{ r.exerciseCount }} {{ 'detail.exercises' | t }}</p>
                </div>
                <button
                  class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                  [class.bg-brand]="copiedId() === r.id"
                  [class.bg-brand-light]="copiedId() !== r.id"
                  (click)="copyShareLink(r)"
                >
                  @if (copiedId() === r.id) {
                    <svg lucideCheck [size]="15" [strokeWidth]="2.5"></svg>
                  } @else {
                    <svg lucideLink [size]="15" [strokeWidth]="2"></svg>
                  }
                </button>
              </div>
            }
          </div>
        }
      </div>

    </div>

    <!-- ───── Settings bottom sheet ───── -->
    @if (showSettings()) {
      <!-- Backdrop -->
      <div class="fixed inset-0 z-60 bg-black/50 backdrop-blur-[2px]" (click)="closeSettings()"></div>

      <!-- Sheet -->
      <div class="fixed bottom-0 left-0 right-0 z-70 bg-canvas rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col">

        <!-- Handle + header -->
        <div class="flex items-center px-5 pt-4 pb-3 shrink-0">
          <div class="flex-1">
            <p class="text-base font-bold text-ink">{{ 'profile.settings' | t }}</p>
          </div>
          <button class="w-8 h-8 rounded-xl bg-surface border border-edge flex items-center justify-center text-ink-muted" (click)="closeSettings()">
            <svg lucideX [size]="15" [strokeWidth]="2"></svg>
          </button>
        </div>
        <div class="h-px bg-edge mx-5 shrink-0"></div>

        <!-- Scrollable content -->
        <div class="flex-1 min-h-0 overflow-y-auto px-5 pt-4 space-y-3" style="padding-bottom: calc(2.5rem + env(safe-area-inset-bottom))">

          <!-- ── CUENTA ── -->
          <div class="bg-surface rounded-2xl border border-edge shadow-sm overflow-hidden">
            <p class="px-4 pt-3.5 pb-1 text-[10px] font-bold text-ink-muted uppercase tracking-widest">{{ 'profile.account' | t }}</p>

            <!-- Email -->
            @if (editingAccount() === 'email') {
              <div class="px-4 pt-2 pb-4 space-y-3">
                @if (accountMsg(); as msg) {
                  <p class="text-sm rounded-xl px-3 py-2.5"
                     [class.text-brand]="msg.ok" [class.bg-brand-light]="msg.ok"
                     [class.text-danger]="!msg.ok" [class.bg-danger-muted]="!msg.ok">
                    {{ msg.text }}
                  </p>
                }
                @if (!accountMsg()?.ok) {
                  <div>
                    <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{{ 'profile.newEmail' | t }}</label>
                    <input #newEmail type="email"
                      class="w-full bg-canvas border border-edge rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-brand transition"
                      [placeholder]="email()"
                      (keyup.enter)="changeEmail(newEmail.value)"
                    />
                  </div>
                  <div class="flex gap-2">
                    <button class="flex-1 bg-brand text-white text-sm py-2.5 rounded-xl font-semibold disabled:opacity-50"
                      [disabled]="accountLoading()" (click)="changeEmail(newEmail.value)">
                      {{ accountLoading() ? ('auth.loading' | t) : ('profile.save' | t) }}
                    </button>
                    <button class="px-4 py-2.5 text-sm text-ink-muted rounded-xl bg-canvas font-medium" (click)="closeAccount()">
                      {{ 'routines.cancel' | t }}
                    </button>
                  </div>
                } @else {
                  <button class="w-full text-sm text-ink-muted py-1 font-medium" (click)="closeAccount()">{{ 'routines.cancel' | t }}</button>
                }
              </div>
            } @else {
              <button class="w-full px-4 py-3.5 flex items-center justify-between" (click)="openAccount('email')">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                    <svg lucideMail [size]="17" class="text-brand" [strokeWidth]="1.8"></svg>
                  </div>
                  <div class="text-left min-w-0">
                    <p class="text-sm font-medium text-ink">{{ 'profile.changeEmail' | t }}</p>
                    <p class="text-xs text-ink-muted truncate max-w-52">{{ email() }}</p>
                  </div>
                </div>
                <svg lucideChevronRight [size]="16" class="text-ink-muted shrink-0" [strokeWidth]="2"></svg>
              </button>
            }

            <div class="border-t border-edge mx-4"></div>

            <!-- Password -->
            @if (editingAccount() === 'password') {
              <div class="px-4 pt-2 pb-4 space-y-3">
                @if (accountMsg(); as msg) {
                  <p class="text-sm rounded-xl px-3 py-2.5"
                     [class.text-brand]="msg.ok" [class.bg-brand-light]="msg.ok"
                     [class.text-danger]="!msg.ok" [class.bg-danger-muted]="!msg.ok">
                    {{ msg.text }}
                  </p>
                }
                @if (!accountMsg()?.ok) {
                  <div>
                    <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{{ 'auth.newPassword' | t }}</label>
                    <input #pw1 type="password" placeholder="••••••••"
                      class="w-full bg-canvas border border-edge rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-brand transition"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{{ 'auth.confirmPassword' | t }}</label>
                    <input #pw2 type="password" placeholder="••••••••"
                      class="w-full bg-canvas border border-edge rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-brand transition"
                      (keyup.enter)="changePassword(pw1.value, pw2.value)"
                    />
                  </div>
                  <div class="flex gap-2">
                    <button class="flex-1 bg-brand text-white text-sm py-2.5 rounded-xl font-semibold disabled:opacity-50"
                      [disabled]="accountLoading()" (click)="changePassword(pw1.value, pw2.value)">
                      {{ accountLoading() ? ('auth.loading' | t) : ('auth.savePassword' | t) }}
                    </button>
                    <button class="px-4 py-2.5 text-sm text-ink-muted rounded-xl bg-canvas font-medium" (click)="closeAccount()">
                      {{ 'routines.cancel' | t }}
                    </button>
                  </div>
                } @else {
                  <button class="w-full text-sm text-ink-muted py-1 font-medium" (click)="closeAccount()">{{ 'routines.cancel' | t }}</button>
                }
              </div>
            } @else {
              <button class="w-full px-4 py-3.5 flex items-center justify-between" (click)="openAccount('password')">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                    <svg lucideKeyRound [size]="17" class="text-brand" [strokeWidth]="1.8"></svg>
                  </div>
                  <div class="text-left">
                    <p class="text-sm font-medium text-ink">{{ 'profile.changePassword' | t }}</p>
                    <p class="text-xs text-ink-muted">••••••••</p>
                  </div>
                </div>
                <svg lucideChevronRight [size]="16" class="text-ink-muted shrink-0" [strokeWidth]="2"></svg>
              </button>
            }
          </div>

          <!-- ── APARIENCIA ── -->
          <div class="bg-surface rounded-2xl border border-edge shadow-sm overflow-hidden">
            <p class="px-4 pt-3.5 pb-1 text-[10px] font-bold text-ink-muted uppercase tracking-widest">{{ 'profile.appearance' | t }}</p>

            <div class="px-4 py-3.5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center">
                  @if (theme.dark()) {
                    <svg lucideMoon [size]="17" class="text-brand" [strokeWidth]="1.8"></svg>
                  } @else {
                    <svg lucideSun [size]="17" class="text-brand" [strokeWidth]="1.8"></svg>
                  }
                </div>
                <div>
                  <p class="text-sm font-medium text-ink">{{ 'profile.darkMode' | t }}</p>
                  <p class="text-xs text-ink-muted">{{ theme.dark() ? ('profile.on' | t) : ('profile.off' | t) }}</p>
                </div>
              </div>
              <button
                class="w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none shrink-0"
                [class.bg-brand]="theme.dark()" [class.bg-edge]="!theme.dark()"
                (click)="toggleTheme()"
              >
                <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300"
                  [style.left]="theme.dark() ? '26px' : '2px'"></span>
              </button>
            </div>

            <div class="border-t border-edge mx-4"></div>

            <div class="px-4 py-3.5 flex items-center gap-4">
              <p class="flex-1 text-sm font-medium text-ink">{{ 'profile.accentColor' | t }}</p>
              <div class="flex gap-2.5">
                @for (a of accentSvc.palette; track a.id) {
                  <button
                    class="w-7 h-7 rounded-full transition-all duration-150 shrink-0"
                    [style.background]="a.color"
                    [style.box-shadow]="accentSvc.accent() === a.id ? '0 0 0 2px var(--color-surface), 0 0 0 4px ' + a.color : 'none'"
                    (click)="setAccent(a.id)"
                  ></button>
                }
              </div>
            </div>
          </div>

          <!-- ── IDIOMA ── -->
          <div class="bg-surface rounded-2xl border border-edge shadow-sm overflow-hidden">
            <p class="px-4 pt-3.5 pb-1 text-[10px] font-bold text-ink-muted uppercase tracking-widest">{{ 'profile.language' | t }}</p>
            <button class="w-full px-4 py-3.5 flex items-center justify-between"
              (click)="showLangPicker.set(!showLangPicker())">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center">
                  <svg lucideLanguages [size]="17" class="text-brand" [strokeWidth]="1.8"></svg>
                </div>
                <div class="text-left">
                  <p class="text-sm font-medium text-ink">{{ currentLang().label }}</p>
                  <p class="text-xs text-ink-muted">{{ ls.locale().toUpperCase() }}</p>
                </div>
              </div>
              <svg [class.rotate-180]="showLangPicker()" class="transition-transform duration-200 text-ink-muted"
                lucideChevronDown [size]="16" [strokeWidth]="2"></svg>
            </button>
            @if (showLangPicker()) {
              <div class="border-t border-edge">
                @for (lang of ls.available; track lang.code) {
                  <button class="w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-canvas"
                    [class.bg-brand-light]="ls.locale() === lang.code"
                    (click)="setLang(lang.code)">
                    <span class="w-7 h-5 rounded flex items-center justify-center bg-surface border border-edge text-[10px] font-bold text-ink-muted shrink-0">{{ lang.code.toUpperCase() }}</span>
                    <span class="flex-1 text-sm font-medium text-ink">{{ lang.label }}</span>
                    @if (ls.locale() === lang.code) {
                      <span class="w-2 h-2 rounded-full bg-brand shrink-0"></span>
                    }
                  </button>
                }
              </div>
            }
          </div>

          <!-- ── GUARDADO RÁPIDO ── -->
          @if (store.inboxRoutine(); as inbox) {
            <div class="bg-surface rounded-2xl border border-edge shadow-sm overflow-hidden">
              <p class="px-4 pt-3.5 pb-1 text-[10px] font-bold text-ink-muted uppercase tracking-widest">{{ 'profile.quickSave' | t }}</p>
              @if (editingInbox()) {
                <div class="px-4 py-3">
                  <input class="w-full bg-canvas border border-brand rounded-xl px-3 py-2.5 text-sm text-ink outline-none"
                    [value]="inboxDraft()"
                    (input)="inboxDraft.set($any($event.target).value)"
                    (keyup.enter)="saveInboxName()"
                    (keyup.escape)="editingInbox.set(false)"
                  />
                  <div class="flex gap-2 mt-2">
                    <button class="flex-1 bg-brand text-white text-xs py-2 rounded-xl font-semibold" (click)="saveInboxName()">{{ 'profile.save' | t }}</button>
                    <button class="px-3 py-2 text-xs text-ink-muted rounded-xl bg-canvas" (click)="editingInbox.set(false)">{{ 'routines.cancel' | t }}</button>
                  </div>
                </div>
              } @else {
                <button class="w-full px-4 py-3.5 flex items-center justify-between" (click)="startEditInbox(inbox.name)">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center">
                      <span class="text-lg leading-none">⚡</span>
                    </div>
                    <div class="text-left">
                      <p class="text-sm font-medium text-ink">{{ inbox.name }}</p>
                      <p class="text-xs text-ink-muted">{{ 'profile.quickSaveHint' | t }}</p>
                    </div>
                  </div>
                  <svg lucidePencil [size]="15" class="text-ink-muted" [strokeWidth]="2"></svg>
                </button>
              }
            </div>
          }

          <!-- ── OTRAS ── -->
          <div class="bg-surface rounded-2xl border border-edge shadow-sm overflow-hidden">
            <p class="px-4 pt-3.5 pb-1 text-[10px] font-bold text-ink-muted uppercase tracking-widest">{{ 'profile.other' | t }}</p>
            <div class="px-4 py-3.5 flex items-center justify-between opacity-50">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center">
                  <svg lucideBell [size]="17" class="text-brand" [strokeWidth]="1.8"></svg>
                </div>
                <span class="text-sm font-medium text-ink">{{ 'profile.notifications' | t }}</span>
              </div>
              <span class="text-xs bg-brand-light text-brand px-2.5 py-1 rounded-full font-semibold">{{ 'profile.soon' | t }}</span>
            </div>
            <div class="border-t border-edge mx-4"></div>

            <!-- Privacy -->
            <button class="w-full px-4 py-3.5 flex items-center justify-between" (click)="showPrivacy.update(v => !v)">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center">
                  <svg lucideShield [size]="17" class="text-brand" [strokeWidth]="1.8"></svg>
                </div>
                <span class="text-sm font-medium text-ink">{{ 'profile.privacy' | t }}</span>
              </div>
              <svg lucideChevronDown [size]="16" class="text-ink-muted transition-transform" [class.rotate-180]="showPrivacy()" [strokeWidth]="2"></svg>
            </button>

            @if (showPrivacy()) {
              <div class="px-4 pb-4 space-y-3">
                <p class="text-xs text-ink-muted leading-relaxed">{{ 'profile.privacyIntro' | t }}</p>

                <!-- Public routines -->
                <div class="bg-canvas rounded-xl border border-edge px-3.5 py-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-ink">{{ 'profile.publicRoutines' | t }}</p>
                      <p class="text-xs text-ink-muted mt-0.5">
                        {{ publicRoutines().length }} {{ 'profile.ofTotal' | t }} {{ store.routines().length }}
                      </p>
                    </div>
                    <button
                      class="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-40"
                      [class.bg-danger-muted]="publicRoutines().length > 0"
                      [class.text-danger]="publicRoutines().length > 0"
                      [class.bg-surface]="publicRoutines().length === 0"
                      [class.text-ink-muted]="publicRoutines().length === 0"
                      [disabled]="publicRoutines().length === 0 || privacyBusy()"
                      (click)="makeAllPrivate()"
                    >{{ privacyBusy() ? ('auth.loading' | t) : ('profile.makeAllPrivate' | t) }}</button>
                  </div>
                  <p class="text-xs text-ink-muted mt-2 leading-relaxed">{{ 'profile.makeAllPrivateHint' | t }}</p>
                </div>

                <!-- Sessions -->
                <div class="bg-canvas rounded-xl border border-edge px-3.5 py-3">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-medium text-ink min-w-0">{{ 'profile.signOutEverywhere' | t }}</p>
                    <button
                      class="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-danger-muted text-danger transition disabled:opacity-40"
                      [disabled]="privacyBusy()"
                      (click)="signOutEverywhere()"
                    >{{ 'profile.signOutEverywhereAction' | t }}</button>
                  </div>
                  <p class="text-xs text-ink-muted mt-2 leading-relaxed">{{ 'profile.signOutEverywhereHint' | t }}</p>
                </div>

                @if (privacyMsg(); as msg) {
                  <p class="text-xs rounded-lg px-3 py-2"
                     [class.text-brand]="msg.ok" [class.bg-brand-light]="msg.ok"
                     [class.text-danger]="!msg.ok" [class.bg-danger-muted]="!msg.ok">{{ msg.text }}</p>
                }
              </div>
            }
          </div>

          <!-- Sign out -->
          <button
            class="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-danger/25 text-danger font-semibold text-sm hover:bg-danger-muted transition"
            (click)="signOut()"
          >
            <svg lucideLogOut [size]="17" [strokeWidth]="1.8"></svg>
            {{ 'profile.signOut' | t }}
          </button>

        </div>
      </div>
    }
  `
})
export class ProfileComponent {
  readonly theme = inject(ThemeService);
  readonly ls = inject(LanguageService);
  readonly store = inject(RoutinesStore);
  readonly accentSvc = inject(AccentService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private confirm = inject(ConfirmService);

  showSettings = signal(false);
  showLangPicker = signal(false);
  editingInbox = signal(false);
  inboxDraft = signal('');
  editingAccount = signal<null | 'email' | 'password'>(null);
  accountLoading = signal(false);
  accountMsg = signal<{ ok: boolean; text: string } | null>(null);

  email = computed(() => this.auth.user()?.email ?? '');
  initial = computed(() => this.email().charAt(0).toUpperCase() || '?');
  totalExercises = computed(() => this.store.routines().reduce((s, r) => s + r.exerciseCount, 0));
  currentLang = computed(() => this.ls.available.find(l => l.code === this.ls.locale())!);
  publicRoutines = computed(() => this.store.routines().filter(r => r.isPublic && !r.isInbox));
  copiedId = signal<string | null>(null);

  showPrivacy = signal(false);
  privacyBusy = signal(false);
  privacyMsg = signal<{ ok: boolean; text: string } | null>(null);

  closeSettings() {
    this.showSettings.set(false);
    this.closeAccount();
    this.editingInbox.set(false);
    this.showLangPicker.set(false);
  }

  openAccount(section: 'email' | 'password') {
    this.accountMsg.set(null);
    this.editingAccount.set(section);
  }

  closeAccount() {
    this.editingAccount.set(null);
    this.accountMsg.set(null);
  }

  async changeEmail(newEmail: string) {
    if (!newEmail.trim() || newEmail === this.email()) return;
    this.accountLoading.set(true);
    this.accountMsg.set(null);
    try {
      await this.auth.updateEmail(newEmail.trim());
      this.accountMsg.set({ ok: true, text: this.ls.t('profile.emailSent') });
    } catch (e: any) {
      this.accountMsg.set({ ok: false, text: e.message ?? 'Error' });
    } finally {
      this.accountLoading.set(false);
    }
  }

  async changePassword(pw1: string, pw2: string) {
    if (pw1.length < 6) {
      this.accountMsg.set({ ok: false, text: this.ls.t('auth.passwordShort') });
      return;
    }
    if (pw1 !== pw2) {
      this.accountMsg.set({ ok: false, text: this.ls.t('auth.passwordMismatch') });
      return;
    }
    this.accountLoading.set(true);
    this.accountMsg.set(null);
    try {
      await this.auth.updatePassword(pw1);
      this.accountMsg.set({ ok: true, text: this.ls.t('auth.passwordUpdated') });
    } catch (e: any) {
      this.accountMsg.set({ ok: false, text: e.message ?? 'Error' });
    } finally {
      this.accountLoading.set(false);
    }
  }

  startEditInbox(name: string) {
    this.inboxDraft.set(name);
    this.editingInbox.set(true);
  }

  async saveInboxName() {
    const inbox = this.store.inboxRoutine();
    const name = this.inboxDraft().trim();
    if (!inbox || !name) return;
    await this.store.renameRoutine(inbox.id, name);
    this.editingInbox.set(false);
  }

  setLang(code: Locale) {
    this.ls.set(code);
    this.showLangPicker.set(false);
    this.auth.savePreferences({ language: code });
  }

  async copyShareLink(r: { id: string; shareToken?: string }) {
    if (!r.shareToken) return;
    const url = `${appOrigin()}/r/${r.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      this.copiedId.set(r.id);
      setTimeout(() => this.copiedId.set(null), 2000);
    } catch {
      if (navigator.share) {
        try { await navigator.share({ url }); } catch {}
      }
    }
  }

  toggleTheme() {
    this.theme.toggle();
    this.auth.savePreferences({ theme: this.theme.dark() ? 'dark' : 'light' });
  }

  setAccent(id: Accent) {
    this.accentSvc.set(id);
    this.auth.savePreferences({ accent: id });
  }

  async makeAllPrivate() {
    if (this.privacyBusy()) return;
    const count = this.publicRoutines().length;
    const ok = await this.confirm.confirm(
      this.ls.t('profile.makeAllPrivateConfirm'),
      this.ls.t('profile.makeAllPrivate')
    );
    if (!ok) return;

    this.privacyBusy.set(true);
    this.privacyMsg.set(null);
    try {
      await this.store.makeAllPrivate();
      this.privacyMsg.set({ ok: true, text: `${this.ls.t('profile.madePrivate')} (${count})` });
    } catch {
      this.privacyMsg.set({ ok: false, text: this.ls.t('auth.genericError') });
    } finally {
      this.privacyBusy.set(false);
    }
  }

  async signOutEverywhere() {
    if (this.privacyBusy()) return;
    const ok = await this.confirm.confirm(
      this.ls.t('profile.signOutEverywhereConfirm'),
      this.ls.t('profile.signOutEverywhereAction')
    );
    if (!ok) return;

    this.privacyBusy.set(true);
    try {
      await this.auth.signOutEverywhere();
      this.router.navigate(['/login']);
    } catch {
      this.privacyMsg.set({ ok: false, text: this.ls.t('auth.genericError') });
    } finally {
      this.privacyBusy.set(false);
    }
  }

  async signOut() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
