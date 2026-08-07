import { Component, input, output, signal } from '@angular/core';
import { LucideTrash, LucideChevronRight, LucideDumbbell } from '@lucide/angular';
import { EmojiPickerComponent } from '../../../../shared/components/emoji-picker/emoji-picker';

@Component({
  selector: 'app-card-routine-preview',
  imports: [LucideTrash, LucideChevronRight, LucideDumbbell, EmojiPickerComponent],
  template: `
    <div class="bg-surface rounded-2xl border border-edge shadow-sm overflow-hidden">
      <div
        class="p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
        (click)="open.emit()"
      >
        <!-- Icon / Emoji -->
        <button
          type="button"
          class="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center shrink-0 transition-colors hover:bg-brand/20"
          (click)="togglePicker($event)"
          [title]="emoji() ? 'Cambiar emoji' : 'Añadir emoji'"
        >
          @if (emoji()) {
            <span class="text-2xl leading-none">{{ emoji() }}</span>
          } @else {
            <svg lucideDumbbell [size]="20" class="text-brand" [strokeWidth]="1.8"></svg>
          }
        </button>

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

      @if (showPicker()) {
        <div class="border-t border-edge px-3 pb-3 pt-2">
          <app-emoji-picker [selected]="emoji()" (pick)="onPickEmoji($event)" />
        </div>
      }
    </div>
  `
})
export class CardRoutinePreviewComponent {
  title = input<string>('');
  exercisesCount = input<number>(0);
  emoji = input<string>('');
  open = output<void>();
  delete = output<void>();
  emojiChange = output<string>();

  showPicker = signal(false);

  togglePicker(event: Event) {
    event.stopPropagation();
    this.showPicker.update(v => !v);
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit();
  }

  onPickEmoji(emoji: string) {
    this.emojiChange.emit(emoji);
    this.showPicker.set(false);
  }
}
