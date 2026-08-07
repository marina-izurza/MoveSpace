import { Component, inject, signal, resource } from '@angular/core';
import { Router } from '@angular/router';
import { RoutinesApiService } from '../../routines/services/routines-api.service';
import { PublicRoutine } from '../../routines/models/RoutineSummary';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-saved',
  imports: [TranslatePipe],
  template: `
    <div class="flex flex-col min-h-full pb-8">

      <div class="px-5 pt-10 pb-5">
        <p class="text-ink-muted text-sm">{{ 'saved.subtitle' | t }}</p>
        <h1 class="text-2xl font-bold text-ink mt-0.5">{{ 'saved.title' | t }}</h1>
      </div>

      @if (_liked.isLoading()) {
        <div class="flex justify-center py-16">
          <div class="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin"></div>
        </div>

      } @else if (liked().length === 0) {
        <div class="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div class="w-20 h-20 bg-brand-light rounded-3xl flex items-center justify-center mb-5 shadow-sm">
            <span class="text-4xl">❤️</span>
          </div>
          <h2 class="text-lg font-bold text-ink">{{ 'saved.empty' | t }}</h2>
          <p class="text-sm text-ink-muted mt-2 leading-relaxed">{{ 'saved.emptyHint' | t }}</p>
        </div>

      } @else {
        <div class="px-5 space-y-3">
          @for (r of liked(); track r.id) {
            <div
              class="bg-surface rounded-2xl border border-edge shadow-sm px-4 py-4 flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity"
              (click)="openRoutine(r)"
            >
              <div class="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center shrink-0 text-2xl">
                {{ r.emoji ?? '💪' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-ink truncate">{{ r.name }}</p>
                <p class="text-xs text-ink-muted mt-0.5">{{ r.likeCount }} {{ r.likeCount === 1 ? 'like' : 'likes' }}</p>
              </div>
              <button
                class="w-9 h-9 flex items-center justify-center rounded-xl text-brand hover:bg-brand-light transition shrink-0"
                (click)="unlike(r, $event)"
              >
                <span class="text-lg">❤️</span>
              </button>
            </div>
          }
        </div>
      }

    </div>
  `
})
export class SavedComponent {
  private api = inject(RoutinesApiService);
  private router = inject(Router);

  _liked = resource({ loader: () => this.api.getLikedRoutines() });
  liked = () => this._liked.value() ?? [];

  openRoutine(r: PublicRoutine) {
    this.router.navigate(['/r', r.shareToken]);
  }

  async unlike(r: PublicRoutine, e: Event) {
    e.stopPropagation();
    await this.api.unlikeRoutine(r.id);
    this._liked.set(this.liked().filter(x => x.id !== r.id));
  }
}
