import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RoutinesStore } from '../stores/routines.store';
import { CardRoutinePreviewComponent } from '../components/card-routine-preview/card-routine-preview';
import { LucidePlus } from '@lucide/angular';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-routines-list',
  imports: [CardRoutinePreviewComponent, LucidePlus, TranslatePipe],
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
            <input
              class="w-full bg-canvas border border-edge rounded-xl px-4 py-2.5 text-base text-ink outline-none focus:border-brand transition"
              [placeholder]="'routines.placeholder' | t"
              #newName
              (keyup.enter)="add(newName.value); newName.value=''"
              (keyup.escape)="adding.set(false)"
            />
            <div class="flex gap-2 mt-3">
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
            @for (routine of store.routines(); track routine.id) {
              <app-card-routine-preview
                [title]="routine.name"
                [exercisesCount]="routine.exerciseCount"
                (open)="open(routine.id)"
                (delete)="store.deleteRoutine(routine.id)"
              />
            }
          </div>
        }
      </div>

      <!-- FAB -->
      @if (!adding()) {
        <button
          class="fixed bottom-24 right-[calc(50%-215px+20px)] w-14 h-14 bg-brand rounded-2xl shadow-xl shadow-brand/35 flex items-center justify-center text-white z-40"
          (click)="adding.set(true)"
        >
          <svg lucidePlus [size]="26" [strokeWidth]="2"></svg>
        </button>
      }

    </div>
  `
})
export class RoutinesListComponent {
  store = inject(RoutinesStore);
  router = inject(Router);

  adding = signal(false);

  async add(name: string) {
    if (!name.trim()) return;
    await this.store.addRoutine(name.trim());
    this.adding.set(false);
  }

  open(id: string) {
    this.router.navigate(['/routines', id]);
  }
}
