import { Component, input, output } from '@angular/core';

const EMOJIS = [
  '💪', '🏋️', '🤸', '🧘', '🏃', '🚴',
  '🏊', '🥊', '👊', '🏄', '🤾', '🧗',
  '🥋', '🏂', '🛹', '🤿', '🏇', '🤼',
  '🎾', '🏓', '🥏', '🏹', '🎱', '🥅',
  '🏆', '🔥', '⚡', '🌟', '🎯', '🦵',
  '🍑', '🦁', '💥', '😤', '🦅', '🫀',
  '🏈', '🏐', '🎿', '🚣', '🌊', '🏌️',
  '🧠', '🦶', '🤙', '🥵', '🌋', '🎪',
  '✨', '💫', '🌸', '🦋', '🌿', '💜',
  '🪷', '🌙', '💎', '🌈', '🦢', '🕊️',
];

@Component({
  selector: 'app-emoji-picker',
  template: `
    <div class="grid grid-cols-6 gap-1">
      @for (e of emojis; track e) {
        <button
          type="button"
          class="w-10 h-10 flex items-center justify-center text-xl rounded-xl transition-colors"
          [class.bg-brand-light]="selected() === e"
          [class.ring-2]="selected() === e"
          [class.ring-brand]="selected() === e"
          (click)="pick.emit(e)"
        >{{ e }}</button>
      }
      <button
        type="button"
        class="w-10 h-10 flex items-center justify-center text-xs text-ink-muted rounded-xl transition-colors hover:bg-canvas"
        [class.bg-brand-light]="selected() === ''"
        (click)="pick.emit('')"
        title="Sin emoji"
      >✕</button>
    </div>
  `
})
export class EmojiPickerComponent {
  selected = input<string>('');
  pick = output<string>();
  emojis = EMOJIS;
}
