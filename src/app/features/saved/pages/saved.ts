import { Component } from '@angular/core';
import { LucideBookmark } from '@lucide/angular';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-saved',
  imports: [LucideBookmark, TranslatePipe],
  template: `
    <div class="flex flex-col min-h-full">

      <div class="px-5 pt-10 pb-4">
        <h1 class="text-2xl font-bold text-ink">{{ 'saved.title' | t }}</h1>
        <p class="text-sm text-ink-muted mt-0.5">{{ 'saved.subtitle' | t }}</p>
      </div>

      <div class="flex-1 flex flex-col items-center justify-center px-8 text-center pb-20">
        <div class="w-20 h-20 bg-brand-light rounded-3xl flex items-center justify-center mb-5 shadow-sm">
          <svg lucideBookmark [size]="30" class="text-brand" [strokeWidth]="1.5"></svg>
        </div>
        <h2 class="text-lg font-bold text-ink">{{ 'saved.empty' | t }}</h2>
        <p class="text-sm text-ink-muted mt-2 leading-relaxed">{{ 'saved.emptyHint' | t }}</p>
        <span class="mt-5 inline-flex items-center gap-1.5 text-xs bg-brand-light text-brand px-4 py-2 rounded-full font-semibold">
          {{ 'saved.comingSoon' | t }}
        </span>
      </div>

    </div>
  `
})
export class SavedComponent {}
