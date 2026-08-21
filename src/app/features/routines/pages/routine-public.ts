import { Component, inject, signal, computed, effect, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { RoutinesApiService } from '../services/routines-api.service';
import { PublicRoutine } from '../models/RoutineSummary';
import { Section } from '../models/Section';
import { Exercise } from '../models/Exercise';
import { getThumbnailUrl, fetchVideoInfo, VideoInfo } from '../utils/platform';
import { appOrigin } from '../../../core/app-origin';
import { LucideLink, LucideCheck } from '@lucide/angular';

@Component({
  selector: 'app-routine-public',
  imports: [LucideLink, LucideCheck],
  template: `
    <div class="min-h-screen bg-canvas flex flex-col">

      @if (loading()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin"></div>
        </div>

      } @else if (loadFailed()) {
        <div class="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <span class="text-5xl">📡</span>
          <h1 class="text-xl font-bold text-ink">No se pudo cargar</h1>
          <p class="text-sm text-ink-muted">Comprueba tu conexión e inténtalo de nuevo.</p>
          <button
            class="mt-2 bg-brand text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-sm shadow-brand/20"
            (click)="retry()"
          >Reintentar</button>
        </div>

      } @else if (!routine()) {
        <div class="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <span class="text-5xl">🔍</span>
          <h1 class="text-xl font-bold text-ink">Rutina no encontrada</h1>
          <p class="text-sm text-ink-muted">Este enlace puede haber expirado o la rutina ya no está disponible.</p>
        </div>

      } @else {
        <!-- Header -->
        <div class="px-5 pt-12 pb-6 flex items-start gap-4">
          @if (routine()!.emoji) {
            <div class="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center text-4xl shrink-0 shadow-sm">
              {{ routine()!.emoji }}
            </div>
          }
          <div class="flex-1 min-w-0 pt-1">
            <p class="text-xs font-semibold text-brand uppercase tracking-widest mb-1">Rutina compartida</p>
            <h1 class="text-2xl font-bold text-ink leading-tight">{{ routine()!.name }}</h1>
            <div class="flex items-center gap-3 mt-2">
              <span class="text-sm text-ink-muted">{{ exerciseCount() }} ejercicios</span>
              <span class="text-ink-muted">·</span>
              <span class="text-sm text-ink-muted">{{ routine()!.likeCount }} likes</span>
            </div>
          </div>
        </div>

        <!-- Like + Copy link buttons -->
        <div class="px-5 mb-6 flex gap-3">
          <button
            class="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all"
            [class.bg-brand]="liked()"
            [class.text-white]="liked()"
            [class.shadow-sm]="liked()"
            [class.shadow-brand\/20]="liked()"
            [class.bg-surface]="!liked()"
            [class.text-ink]="!liked()"
            [class.border]="!liked()"
            [class.border-edge]="!liked()"
            [disabled]="likeLoading()"
            (click)="toggleLike()"
          >
            <span class="text-lg">{{ liked() ? '❤️' : '🤍' }}</span>
            <span>{{ liked() ? 'Te gusta' : 'Me gusta' }}</span>
          </button>

          <button
            class="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-surface border border-edge font-semibold text-sm text-ink"
            (click)="copyLink()"
          >
            @if (copied()) {
              <svg lucideCheck [size]="16" [strokeWidth]="2.5"></svg>
            } @else {
              <svg lucideLink [size]="16" [strokeWidth]="2"></svg>
            }
            <span>{{ copied() ? 'Copiado' : 'Copiar' }}</span>
          </button>
        </div>

        <!-- Exercise list -->
        <div class="px-5 pb-12 space-y-3">
          @for (item of routine()!.items ?? []; track item.id) {
            @if (item.type === 'section') {
              <div class="pt-2">
                <p class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2 px-1">{{ item.name }}</p>
                <div class="bg-surface rounded-2xl border border-edge shadow-sm overflow-hidden">
                  @for (ex of asSection(item).exercises; track ex.id; let i = $index) {
                    <a [href]="ex.videoUrl" target="_blank" rel="noopener noreferrer"
                       class="px-4 py-3 flex items-center gap-3 active:opacity-70 transition-opacity" [class.border-t]="i > 0" [class.border-edge]="i > 0">
                      @if (thumbnail(ex.videoUrl); as thumb) {
                        <img [src]="thumb" class="w-16 h-9 rounded-lg object-cover shrink-0 bg-edge" loading="lazy" />
                      } @else {
                        <div class="w-8 h-8 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                          <span class="text-brand font-bold text-xs">{{ i + 1 }}</span>
                        </div>
                      }
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-ink truncate">{{ ex.name }}</p>
                        @if (ex.notes) {
                          <p class="text-xs text-ink-muted truncate">{{ ex.notes }}</p>
                        }
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" class="text-ink-muted shrink-0">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  }
                </div>
              </div>
            } @else {
              <a [href]="asExercise(item).videoUrl" target="_blank" rel="noopener noreferrer"
                 class="bg-surface rounded-2xl border border-edge shadow-sm px-4 py-3 flex items-center gap-3 active:opacity-70 transition-opacity">
                @if (thumbnail(asExercise(item).videoUrl); as thumb) {
                  <img [src]="thumb" class="w-16 h-9 rounded-lg object-cover shrink-0 bg-edge" loading="lazy" />
                } @else {
                  <div class="w-8 h-8 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                    <span class="text-brand text-lg">▶</span>
                  </div>
                }
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink truncate">{{ asExercise(item).name }}</p>
                  @if (asExercise(item).notes) {
                    <p class="text-xs text-ink-muted truncate">{{ asExercise(item).notes }}</p>
                  }
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" class="text-ink-muted shrink-0">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            }
          }
        </div>

        <!-- CTA footer -->
        <div class="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-linear-to-t from-canvas to-transparent">
          <button
            class="w-full max-w-107.5 mx-auto flex items-center justify-center gap-2 bg-brand text-white py-4 rounded-2xl font-semibold text-sm shadow-lg shadow-brand/25"
            (click)="openInApp()"
          >
            <span>💪</span>
            <span>Abrir MoveSpace</span>
          </button>
        </div>
      }

    </div>
  `
})
export class RoutinePublicComponent {
  readonly token = input.required<string>();

  private api = inject(RoutinesApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  routine = signal<PublicRoutine | null | undefined>(undefined);
  loadFailed = signal(false);
  loading = computed(() => this.routine() === undefined && !this.loadFailed());
  liked = signal(false);
  likeLoading = signal(false);
  copied = signal(false);
  readonly exerciseCount = computed(() => {
    const r = this.routine();
    if (!r?.items) return 0;
    return r.items.reduce((acc, item) => {
      if (item.type === 'section') return acc + (item as any).exercises.length;
      return acc + 1;
    }, 0);
  });

  constructor() {
    effect(() => {
      const t = this.token();
      if (t) this.load(t);
    });
  }

  private async load(token: string) {
    this.routine.set(undefined);
    this.loadFailed.set(false);

    let r: PublicRoutine | null;
    try {
      r = await this.api.getPublicRoutineByToken(token);
    } catch {
      this.loadFailed.set(true);
      return;
    }
    this.routine.set(r);
    if (!r) return;

    this.prefetchThumbnails(r);

    if (this.auth.user()) {
      const liked = await this.api.getMyLikedIds();
      this.liked.set(liked.has(r.id));
    }
  }

  retry() {
    this.load(this.token());
  }

  async toggleLike() {
    const r = this.routine();
    if (!r) return;

    if (!this.auth.user()) {
      sessionStorage.setItem('redirectAfterLogin', `/r/${this.token()}`);
      this.router.navigate(['/login']);
      return;
    }

    this.likeLoading.set(true);
    try {
      if (this.liked()) {
        await this.api.unlikeRoutine(r.id);
        this.liked.set(false);
        this.routine.set({ ...r, likeCount: Math.max(0, r.likeCount - 1) });
      } else {
        await this.api.likeRoutine(r.id);
        this.liked.set(true);
        this.routine.set({ ...r, likeCount: r.likeCount + 1 });
      }
    } catch {
      // Leave the button as it was; the counter only moves once the write lands.
    } finally {
      this.likeLoading.set(false);
    }
  }

  async copyLink() {
    const url = `${appOrigin()}/r/${this.token()}`;
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      if (navigator.share) {
        try { await navigator.share({ url }); } catch {}
      }
    }
  }

  openInApp() {
    this.router.navigate(['/routines']);
  }

  private readonly mediaCache = signal<Record<string, VideoInfo>>({});

  /** Pure lookup: the template calls this on every change detection pass. */
  thumbnail(url: string): string | null {
    if (!url) return null;
    return this.mediaCache()[url]?.thumb || getThumbnailUrl(url);
  }

  /** Resolve every thumbnail once, when the routine lands, instead of from the template. */
  private prefetchThumbnails(routine: PublicRoutine) {
    const urls = new Set<string>();
    for (const item of routine.items ?? []) {
      if (item.type === 'section') {
        for (const ex of this.asSection(item).exercises) urls.add(ex.videoUrl);
      } else {
        urls.add(this.asExercise(item).videoUrl);
      }
    }

    for (const url of urls) {
      if (!url) continue;
      fetchVideoInfo(url).then(info => this.mediaCache.update(c => ({ ...c, [url]: info })));
    }
  }

  asSection(item: any) { return item as Section & { exercises: Exercise[] }; }
  asExercise(item: any) { return item as Exercise; }
}
