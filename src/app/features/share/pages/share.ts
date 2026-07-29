import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoutinesStore } from '../../routines/stores/routines.store';
import { PlatformIconComponent } from '../../routines/components/platform-icon/platform-icon';
import { detectPlatform, getPlatformName } from '../../routines/utils/platform';
import { Section } from '../../routines/models/Section';
import { LucideArrowLeft, LucideCheck } from '@lucide/angular';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-share',
  imports: [PlatformIconComponent, LucideArrowLeft, LucideCheck, TranslatePipe],
  template: `
    <div class="flex flex-col min-h-screen bg-canvas">

      <!-- Header -->
      <div class="flex items-center gap-3 px-5 pt-12 pb-4 border-b border-edge">
        <button
          class="w-9 h-9 rounded-xl bg-surface border border-edge flex items-center justify-center text-ink-muted hover:text-ink transition shrink-0 shadow-sm"
          (click)="close()"
        >
          <svg lucideArrowLeft [size]="18" [strokeWidth]="2"></svg>
        </button>
        <div>
          <h1 class="text-base font-bold text-ink">{{ 'share.title' | t }}</h1>
          <p class="text-xs text-ink-muted">{{ platformName() }}</p>
        </div>
      </div>

      @if (!videoUrl()) {
        <!-- No URL detected -->
        <div class="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div class="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center mb-4">
            <span class="text-2xl">🔗</span>
          </div>
          <h2 class="font-bold text-ink">{{ 'share.noVideo' | t }}</h2>
          <p class="text-sm text-ink-muted mt-2">{{ 'share.noVideoHint' | t }}</p>
          <button
            class="mt-6 bg-brand text-white px-6 py-3 rounded-2xl font-semibold text-sm"
            (click)="close()"
          >{{ 'share.backToRoutines' | t }}</button>
        </div>
      } @else if (added()) {
        <!-- Success state -->
        <div class="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div class="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand/30">
            <svg lucideCheck [size]="28" class="text-white" [strokeWidth]="2.5"></svg>
          </div>
          <h2 class="font-bold text-ink text-lg">{{ 'share.exerciseAdded' | t }}</h2>
          <p class="text-sm text-ink-muted mt-2">{{ 'share.redirecting' | t }}</p>
        </div>
      } @else {

        <div class="flex-1 overflow-y-auto">

          <!-- Video preview -->
          <div class="px-5 py-4">
            <div class="bg-surface rounded-2xl border border-edge p-4 flex items-center gap-3 shadow-sm">
              <app-platform-icon [url]="videoUrl()" />
              <div class="min-w-0">
                <p class="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">{{ platformName() }}</p>
                <p class="text-sm text-ink truncate mt-0.5">{{ videoUrl() }}</p>
              </div>
            </div>
          </div>

          <!-- Exercise name -->
          <div class="px-5 mb-5">
            <label class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2 block">{{ 'share.exerciseName' | t }}</label>
            <input
              class="w-full bg-surface border border-edge rounded-2xl px-4 py-3 text-base text-ink outline-none focus:border-brand transition shadow-sm"
              [placeholder]="'share.exercisePlaceholder' | t"
              [value]="exerciseName()"
              (input)="exerciseName.set($any($event.target).value)"
            />
          </div>

          <!-- Routine selector -->
          <div class="px-5 mb-5">
            <label class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2 block">{{ 'share.routine' | t }}</label>
            @if (store.listLoading()) {
              <div class="flex justify-center py-6">
                <div class="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"></div>
              </div>
            } @else if (store.routines().length === 0) {
              <p class="text-sm text-ink-muted py-3">{{ 'share.noRoutines' | t }}</p>
            } @else {
              <div class="space-y-2">
                @for (r of store.routines(); track r.id) {
                  <button
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition text-left"
                    [class.border-brand]="selectedRoutineId() === r.id"
                    [class.bg-brand-light]="selectedRoutineId() === r.id"
                    [class.border-edge]="selectedRoutineId() !== r.id"
                    [class.bg-surface]="selectedRoutineId() !== r.id"
                    (click)="selectRoutine(r.id)"
                  >
                    <span
                      class="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition"
                      [class.border-brand]="selectedRoutineId() === r.id"
                      [class.bg-brand]="selectedRoutineId() === r.id"
                      [class.border-edge]="selectedRoutineId() !== r.id"
                    >
                      @if (selectedRoutineId() === r.id) {
                        <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                      }
                    </span>
                    <span class="flex-1 text-sm font-medium text-ink">{{ r.name }}</span>
                    <span class="text-xs text-ink-muted">{{ r.exerciseCount }} {{ 'share.videos' | t }}</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Section selector -->
          @if (selectedRoutineId() && !store.routineLoading()) {
            @if (sections().length > 0) {
              <div class="px-5 mb-5">
                <label class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2 block">
                  {{ 'share.section' | t }} <span class="normal-case font-normal">{{ 'share.optional' | t }}</span>
                </label>
                <div class="space-y-2">
                  <!-- Root (no section) option -->
                  <button
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition text-left"
                    [class.border-brand]="selectedSectionId() === null"
                    [class.bg-brand-light]="selectedSectionId() === null"
                    [class.border-edge]="selectedSectionId() !== null"
                    [class.bg-surface]="selectedSectionId() !== null"
                    (click)="selectedSectionId.set(null)"
                  >
                    <span
                      class="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition"
                      [class.border-brand]="selectedSectionId() === null"
                      [class.bg-brand]="selectedSectionId() === null"
                      [class.border-edge]="selectedSectionId() !== null"
                    >
                      @if (selectedSectionId() === null) {
                        <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                      }
                    </span>
                    <span class="text-sm font-medium text-ink">{{ 'share.noSection' | t }}</span>
                  </button>

                  @for (s of sections(); track s.id) {
                    <button
                      class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition text-left"
                      [class.border-brand]="selectedSectionId() === s.id"
                      [class.bg-brand-light]="selectedSectionId() === s.id"
                      [class.border-edge]="selectedSectionId() !== s.id"
                      [class.bg-surface]="selectedSectionId() !== s.id"
                      (click)="selectedSectionId.set(s.id)"
                    >
                      <span
                        class="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition"
                        [class.border-brand]="selectedSectionId() === s.id"
                        [class.bg-brand]="selectedSectionId() === s.id"
                        [class.border-edge]="selectedSectionId() !== s.id"
                      >
                        @if (selectedSectionId() === s.id) {
                          <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                        }
                      </span>
                      <span class="text-sm font-medium text-ink">{{ s.name }}</span>
                    </button>
                  }
                </div>
              </div>
            }
          } @else if (selectedRoutineId() && store.routineLoading()) {
            <div class="flex justify-center py-4">
              <div class="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin"></div>
            </div>
          }

        </div>

        <!-- Add button (fixed bottom) -->
        <div class="px-5 py-4 border-t border-edge bg-canvas">
          <button
            class="w-full py-4 rounded-2xl font-bold text-sm transition shadow-lg"
            [class.bg-brand]="canAdd()"
            [class.text-white]="canAdd()"
            [class.shadow-brand\/25]="canAdd()"
            [class.bg-edge]="!canAdd()"
            [class.text-ink-muted]="!canAdd()"
            [class.cursor-not-allowed]="!canAdd()"
            [disabled]="!canAdd() || loading()"
            (click)="addExercise()"
          >
            {{ loading() ? ('share.adding' | t) : ('share.addToRoutine' | t) }}
          </button>
        </div>

      }

    </div>
  `
})
export class ShareComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly store = inject(RoutinesStore);

  videoUrl = signal('');
  exerciseName = signal('');
  selectedRoutineId = signal<string | null>(null);
  selectedSectionId = signal<string | null>(null);
  loading = signal(false);
  added = signal(false);

  platformName = computed(() => getPlatformName(detectPlatform(this.videoUrl())));
  canAdd = computed(() => !!this.selectedRoutineId() && !!this.videoUrl());

  private loadedRoutine = computed(() => {
    const r = this.store.routine();
    return r?.id === this.selectedRoutineId() ? r : null;
  });

  sections = computed(() => {
    const r = this.loadedRoutine();
    return r ? (r.items.filter(i => i.type === 'section') as Section[]) : [];
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const urlParam   = params.get('url')   ?? '';
    const textParam  = params.get('text')  ?? '';
    const titleParam = params.get('title') ?? '';

    const extracted = urlParam || this.extractUrl(textParam);
    this.videoUrl.set(extracted);

    const nameHint = titleParam || this.extractCaption(textParam);
    if (nameHint) this.exerciseName.set(nameHint);

    effect(() => {
      const id = this.selectedRoutineId();
      if (id) this.store.loadRoutine(id);
    });
  }

  private extractUrl(text: string): string {
    const match = text.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : '';
  }

  private extractCaption(text: string): string {
    if (!text.trim()) return '';
    // Strip URLs and hashtags, take first ~60 chars
    const clean = text.replace(/https?:\/\/[^\s]+/g, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
    return clean.length > 60 ? clean.slice(0, 57) + '...' : clean;
  }

  selectRoutine(id: string) {
    this.selectedRoutineId.set(id);
    this.selectedSectionId.set(null);
  }

  async addExercise() {
    const routineId = this.selectedRoutineId();
    const url = this.videoUrl();
    const name = this.exerciseName().trim() || getPlatformName(detectPlatform(url));
    if (!routineId || !url) return;

    this.loading.set(true);
    await this.store.addExercise(routineId, { name, videoUrl: url }, this.selectedSectionId() ?? undefined);
    this.loading.set(false);
    this.added.set(true);

    setTimeout(() => this.router.navigate(['/routines', routineId]), 1200);
  }

  close() {
    this.router.navigate(['/routines']);
  }
}
