import { Component, input, output } from '@angular/core';
import { LucideTrash, LucideChevronRight, LucideDumbbell } from '@lucide/angular';

@Component({
  selector: 'app-card-routine-preview',
  imports: [LucideTrash, LucideChevronRight, LucideDumbbell],
  template: `
    <div
      class="bg-surface rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-edge cursor-pointer active:scale-[0.98] transition-transform"
      (click)="open.emit()"
    >
      <!-- Icon -->
      <div class="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center shrink-0">
        <svg lucideDumbbell [size]="20" class="text-brand" [strokeWidth]="1.8"></svg>
      </div>

      <!-- Text -->
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-ink truncate">{{ title() }}</h3>
        <p class="text-sm text-ink-muted mt-0.5">{{ exercisesCount() }} videos</p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 shrink-0">
        <button
          class="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-danger hover:bg-danger-muted transition"
          (click)="onDelete($event)"
          title="Eliminar"
        >
          <svg lucideTrash [size]="15" [strokeWidth]="1.8"></svg>
        </button>
        <svg lucideChevronRight [size]="18" class="text-ink-muted" [strokeWidth]="1.8"></svg>
      </div>
    </div>
  `
})
export class CardRoutinePreviewComponent {
  title = input<string>('');
  exercisesCount = input<number>(0);
  open = output<void>();
  delete = output<void>();

  onDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit();
  }
}
