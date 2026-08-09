import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RoutinesStore } from '../stores/routines.store';
import { CardRoutinePreviewComponent } from '../components/card-routine-preview/card-routine-preview';
import { EmojiPickerComponent } from '../../../shared/components/emoji-picker/emoji-picker';
import { LucidePlus } from '@lucide/angular';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-routines-list',
  imports: [CardRoutinePreviewComponent, EmojiPickerComponent, LucidePlus, TranslatePipe],
  template: `
    <div class="flex flex-col min-h-full">

      <!-- Header -->
      <div class="px-5 pt-10 pb-2">
        <p class="text-ink-muted text-sm">{{ 'routines.welcome' | t }}</p>
        <h1 class="text-2xl font-bold text-ink mt-0.5">{{ 'routines.title' | t }}</h1>
      </div>

      <!-- Add routine form (expandable) -->
      <div class="px-5 pt-4">
        @if (adding()) {
          <div class="bg-surface rounded-2xl p-4 border border-brand/30 shadow-sm mb-4">
            <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">{{ 'routines.newRoutine' | t }}</p>

            <!-- Emoji + name row -->
            <div class="flex items-center gap-2 mb-3">
              <button
                type="button"
                class="w-11 h-11 rounded-xl bg-brand-light flex items-center justify-center text-2xl shrink-0 transition-colors"
                [class.ring-2]="showNewEmojiPicker()"
                [class.ring-brand]="showNewEmojiPicker()"
                (click)="showNewEmojiPicker.update(v => !v)"
              >
                @if (newEmoji()) {
                  {{ newEmoji() }}
                } @else {
                  <span class="text-base text-brand font-bold">＋</span>
                }
              </button>
              <input
                class="flex-1 bg-canvas border border-edge rounded-xl px-4 py-2.5 text-base text-ink outline-none focus:border-brand transition"
                [placeholder]="'routines.placeholder' | t"
                #newName
                (keyup.enter)="add(newName.value); newName.value=''"
                (keyup.escape)="adding.set(false)"
              />
            </div>

            <!-- Emoji picker (collapsible) -->
            @if (showNewEmojiPicker()) {
              <div class="mb-3 p-2 bg-canvas rounded-xl border border-edge">
                <app-emoji-picker [selected]="newEmoji()" (pick)="onPickNewEmoji($event)" />
              </div>
            }

            <div class="flex gap-2">
              <button
                class="flex-1 bg-brand text-white py-2.5 rounded-xl font-semibold text-sm shadow-sm shadow-brand/20"
                (click)="add(newName.value); newName.value=''"
              >{{ 'routines.create' | t }}</button>
              <button
                class="px-4 py-2.5 rounded-xl text-ink-muted text-sm font-medium bg-canvas"
                (click)="adding.set(false)"
              >{{ 'routines.cancel' | t }}</button>
            </div>
          </div>
        }
      </div>

      <!-- Content -->
      <div class="flex-1 px-5">
        @if (store.listLoading()) {
          <div class="flex justify-center py-16">
            <div class="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin"></div>
          </div>
        } @else if (store.routines().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-brand" width="28" height="28">
                <path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11"/>
                <circle cx="3.5" cy="6.5" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="17.5" r="1"/>
              </svg>
            </div>
            <p class="font-semibold text-ink">{{ 'routines.empty' | t }}</p>
            <p class="text-sm text-ink-muted mt-1">{{ 'routines.emptyHint' | t }}</p>
          </div>
        } @else {
          <div class="space-y-3 pb-4">
            @if (store.inboxRoutine(); as inbox) {
              <button
                class="w-full flex items-center gap-3 px-4 py-3.5 bg-brand-light border border-brand/30 rounded-2xl text-left shadow-sm"
                (click)="open(inbox.id)"
              >
                <div class="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shrink-0 shadow-sm">
                  <span class="text-xl leading-none">⚡</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-ink truncate">{{ inbox.name }}</p>
                  <p class="text-xs text-ink-muted">{{ inbox.exerciseCount }} {{ 'share.videos' | t }}</p>
                </div>
                <span class="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full uppercase tracking-wide">{{ 'routines.inboxBadge' | t }}</span>
              </button>
            }
            @for (routine of regularRoutines(); track routine.id) {
              <app-card-routine-preview
                [title]="routine.name"
                [exercisesCount]="routine.exerciseCount"
                [emoji]="routine.emoji ?? ''"
                (open)="open(routine.id)"
                (delete)="store.deleteRoutine(routine.id)"
                (emojiChange)="store.updateRoutineEmoji(routine.id, $event)"
              />
            }
          </div>
        }
      </div>

      <!-- FAB -->
      @if (!adding()) {
        <div class="fixed left-1/2 -translate-x-1/2 w-full max-w-107.5 flex justify-end px-5 pointer-events-none z-40"
             style="bottom: calc(6rem + env(safe-area-inset-bottom))">
          <button
            class="pointer-events-auto w-14 h-14 bg-brand rounded-2xl shadow-xl shadow-brand/35 flex items-center justify-center text-white"
            (click)="adding.set(true)"
          >
            <svg lucidePlus [size]="26" [strokeWidth]="2"></svg>
          </button>
        </div>
      }

    </div>
  `
})
export class RoutinesListComponent {
  store = inject(RoutinesStore);
  router = inject(Router);
  private ls = inject(LanguageService);

  adding = signal(false);
  newEmoji = signal('');
  showNewEmojiPicker = signal(false);

  readonly regularRoutines = computed(() => this.store.routines().filter(r => !r.isInbox));

  constructor() {
    effect(() => {
      if (!this.store.listLoading()) {
        this.store.ensureInboxRoutine(this.ls.t('routines.inboxDefault'));
      }
    }, { allowSignalWrites: true });
  }

  onPickNewEmoji(emoji: string) {
    this.newEmoji.set(emoji);
    this.showNewEmojiPicker.set(false);
  }

  async add(name: string) {
    if (!name.trim()) return;
    await this.store.addRoutine(name.trim(), this.newEmoji() || undefined);
    this.newEmoji.set('');
    this.showNewEmojiPicker.set(false);
    this.adding.set(false);
  }

  open(id: string) {
    this.router.navigate(['/routines', id]);
  }
}
