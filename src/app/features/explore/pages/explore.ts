import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionsStore } from '../../sessions/stores/sessions.store';
import { sessionDurationSeconds, formatDuration } from '../../sessions/models/WorkoutSession';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LanguageService } from '../../../core/language.service';

@Component({
  selector: 'app-explore',
  imports: [TranslatePipe],
  template: `
    <div class="flex flex-col min-h-full pb-8">

      <!-- Header -->
      <div class="px-5 pt-10 pb-5">
        <p class="text-ink-muted text-sm">{{ 'history.subtitle' | t }}</p>
        <h1 class="text-2xl font-bold text-ink mt-0.5">{{ 'history.title' | t }}</h1>
      </div>

      @if (store.loading()) {
        <div class="flex justify-center py-16">
          <div class="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin"></div>
        </div>
      } @else if (store.sessions().length === 0) {

        <!-- Empty state -->
        <div class="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div class="w-20 h-20 bg-brand-light rounded-3xl flex items-center justify-center mb-5 shadow-sm">
            <span class="text-4xl">📊</span>
          </div>
          <h2 class="text-lg font-bold text-ink">{{ 'history.noSessions' | t }}</h2>
          <p class="text-sm text-ink-muted mt-2 leading-relaxed">{{ 'history.noSessionsHint' | t }}</p>
          <button
            class="mt-6 bg-brand text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-sm shadow-brand/20"
            (click)="goToRoutines()"
          >{{ 'history.goToRoutines' | t }}</button>
        </div>

      } @else {

        <!-- Stats row -->
        <div class="px-5 mb-5">
          <div class="bg-surface rounded-2xl border border-edge shadow-sm p-4 flex">
            <div class="flex-1 text-center">
              <p class="text-2xl font-bold text-ink">{{ store.streak() }}</p>
              <p class="text-xs text-ink-muted mt-0.5">🔥 {{ 'history.streak' | t }}</p>
            </div>
            <div class="w-px bg-edge"></div>
            <div class="flex-1 text-center">
              <p class="text-2xl font-bold text-ink">{{ store.weekSessions().length }}</p>
              <p class="text-xs text-ink-muted mt-0.5">📅 {{ 'history.thisWeek' | t }}</p>
            </div>
            <div class="w-px bg-edge"></div>
            <div class="flex-1 text-center">
              <p class="text-2xl font-bold text-ink">{{ store.sessions().length }}</p>
              <p class="text-xs text-ink-muted mt-0.5">💪 {{ 'history.total' | t }}</p>
            </div>
          </div>
        </div>

        <!-- Week grid -->
        <div class="px-5 mb-5">
          <p class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">{{ 'history.thisWeekDays' | t }}</p>
          <div class="flex gap-1.5">
            @for (day of store.weekDays(); track day.date.getTime()) {
              <div class="flex-1 flex flex-col items-center gap-1.5">
                <span class="text-[10px] font-semibold text-ink-muted">{{ dayLabel(day.date) }}</span>
                <div
                  class="w-full aspect-square rounded-xl transition-colors"
                  [class.bg-brand]="day.active"
                  [class.shadow-sm]="day.active"
                  [class.bg-edge]="!day.active && !isToday(day.date)"
                  [class.border-2]="isToday(day.date) && !day.active"
                  [class.border-brand]="isToday(day.date) && !day.active"
                  [class.bg-canvas]="isToday(day.date) && !day.active"
                ></div>
              </div>
            }
          </div>
        </div>

        <!-- Top routines -->
        @if (store.topRoutines().length > 0) {
          <div class="px-5 mb-5">
            <p class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">{{ 'history.topRoutines' | t }}</p>
            <div class="bg-surface rounded-2xl border border-edge shadow-sm overflow-hidden">
              @for (r of store.topRoutines(); track r.name; let i = $index) {
                <div class="flex items-center gap-3 px-4 py-3" [class.border-t]="i > 0" [class.border-edge]="i > 0">
                  <span class="text-xs font-bold text-ink-muted w-4 text-center">{{ i + 1 }}</span>
                  <div class="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0 text-xl">
                    @if (r.emoji) { {{ r.emoji }} } @else { 💪 }
                  </div>
                  <span class="flex-1 text-sm font-medium text-ink truncate">{{ r.name }}</span>
                  <span class="text-xs text-ink-muted shrink-0">{{ r.count }}×</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Recent sessions -->
        <div class="px-5">
          <p class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">{{ 'history.recent' | t }}</p>
          <div class="space-y-2">
            @for (session of store.sessions(); track session.id) {
              <div class="bg-surface rounded-2xl border border-edge shadow-sm px-4 py-3 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0 text-xl">
                  @if (session.routineEmoji) { {{ session.routineEmoji }} } @else { 💪 }
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-ink truncate">{{ session.routineName }}</p>
                  <p class="text-xs text-ink-muted">{{ relativeDate(session.startedAt) }}</p>
                </div>
                @if (durationOf(session); as dur) {
                  <span class="text-xs font-semibold text-ink-muted bg-canvas border border-edge px-2.5 py-1 rounded-full shrink-0">{{ dur }}</span>
                }
              </div>
            }
          </div>
        </div>

      }

    </div>
  `
})
export class ExploreComponent {
  readonly store = inject(SessionsStore);
  private ls = inject(LanguageService);
  private router = inject(Router);

  goToRoutines() {
    this.router.navigate(['/routines']);
  }

  dayLabel(date: Date): string {
    return date.toLocaleDateString(this.ls.locale(), { weekday: 'narrow' });
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  relativeDate(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return this.ls.t('history.today');
    if (d.toDateString() === yesterday.toDateString()) return this.ls.t('history.yesterday');
    return d.toLocaleDateString(this.ls.locale(), { day: 'numeric', month: 'short' });
  }

  durationOf(session: Parameters<typeof sessionDurationSeconds>[0]): string | null {
    const s = sessionDurationSeconds(session);
    return s !== null ? formatDuration(s) : null;
  }
}
