import { Component, computed, inject, signal } from '@angular/core';
import { LucideSearch } from '@lucide/angular';
import { LanguageService } from '../../../core/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-explore',
  imports: [LucideSearch, TranslatePipe],
  template: `
    <div class="flex flex-col min-h-full">

      <!-- Header -->
      <div class="px-5 pt-10 pb-4">
        <h1 class="text-2xl font-bold text-ink">{{ 'explore.title' | t }}</h1>
        <p class="text-sm text-ink-muted mt-0.5">{{ 'explore.subtitle' | t }}</p>
      </div>

      <!-- Search (visual) -->
      <div class="px-5 mb-5">
        <div class="flex items-center gap-3 bg-surface border border-edge rounded-2xl px-4 py-3 shadow-sm">
          <svg lucideSearch [size]="18" class="text-ink-muted shrink-0" [strokeWidth]="1.8"></svg>
          <span class="text-ink-muted text-[15px]">{{ 'explore.search' | t }}</span>
        </div>
      </div>

      <!-- Category chips -->
      <div class="flex gap-2 px-5 mb-6 overflow-x-auto no-scrollbar pb-0.5">
        @for (cat of categories; track cat.key) {
          <button
            class="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            [class.bg-brand]="activeCategory() === cat.key"
            [class.text-white]="activeCategory() === cat.key"
            [class.shadow-sm]="activeCategory() === cat.key"
            [class.bg-surface]="activeCategory() !== cat.key"
            [class.text-ink-muted]="activeCategory() !== cat.key"
            [class.border]="activeCategory() !== cat.key"
            [class.border-edge]="activeCategory() !== cat.key"
            (click)="activeCategory.set(cat.key)"
          >
            <span>{{ cat.emoji }}</span>
            {{ 'explore.categories.' + cat.key | t }}
          </button>
        }
      </div>

      <!-- Featured programs -->
      <div class="px-5 mb-5">
        <p class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">{{ 'explore.featured' | t }}</p>
        <div class="space-y-3">
          @for (p of programs(); track p.key) {
            <div class="relative rounded-2xl overflow-hidden cursor-not-allowed"
                 [style]="'background: linear-gradient(135deg, ' + p.from + ', ' + p.to + ')'">
              <div class="p-5 pb-6">
                <span class="text-[10px] font-bold text-white/60 uppercase tracking-widest">{{ p.tag }}</span>
                <h3 class="text-[22px] font-bold text-white mt-1 leading-tight">{{ p.title }}</h3>
                <p class="text-white/65 text-sm mt-1">{{ p.subtitle }}</p>
                <div class="flex flex-wrap items-center gap-2 mt-3.5">
                  @for (badge of p.badges; track badge) {
                    <span class="text-xs bg-white/15 text-white px-2.5 py-1 rounded-full font-medium">{{ badge }}</span>
                  }
                </div>
              </div>
              <div class="absolute top-3.5 right-3.5 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                <span class="text-[11px] font-bold text-white">{{ 'explore.comingSoon' | t }}</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Daily tip -->
      <div class="px-5 pb-8">
        <p class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">{{ 'explore.dailyTip' | t }}</p>
        <div class="bg-surface rounded-2xl border border-edge shadow-sm p-4 flex gap-3">
          <span class="text-2xl">💧</span>
          <p class="text-sm text-ink leading-relaxed">
            {{ 'explore.tipText' | t }} <span class="font-semibold text-brand">20%</span>.
          </p>
        </div>
      </div>

    </div>
  `
})
export class ExploreComponent {
  private ls = inject(LanguageService);

  activeCategory = signal('all');

  readonly categories = [
    { key: 'all',         emoji: '✨' },
    { key: 'strength',    emoji: '💪' },
    { key: 'cardio',      emoji: '🏃' },
    { key: 'hiit',        emoji: '⚡' },
    { key: 'flexibility', emoji: '🧘' },
    { key: 'core',        emoji: '🔥' },
    { key: 'legs',        emoji: '🦵' },
  ];

  readonly programs = computed(() => [
    {
      key: 'totalStrength',
      from: '#7B6CF6', to: '#4338CA',
      title:   this.ls.t('explore.programs.totalStrength.title'),
      subtitle: this.ls.t('explore.programs.totalStrength.subtitle'),
      tag:     this.ls.t('explore.programs.totalStrength.tag'),
      badges:  this.ls.ta('explore.programs.totalStrength.badges'),
    },
    {
      key: 'cardioBurn',
      from: '#F472B6', to: '#DB2777',
      title:   this.ls.t('explore.programs.cardioBurn.title'),
      subtitle: this.ls.t('explore.programs.cardioBurn.subtitle'),
      tag:     this.ls.t('explore.programs.cardioBurn.tag'),
      badges:  this.ls.ta('explore.programs.cardioBurn.badges'),
    },
    {
      key: 'fullBody',
      from: '#34D399', to: '#059669',
      title:   this.ls.t('explore.programs.fullBody.title'),
      subtitle: this.ls.t('explore.programs.fullBody.subtitle'),
      tag:     this.ls.t('explore.programs.fullBody.tag'),
      badges:  this.ls.ta('explore.programs.fullBody.badges'),
    },
  ]);
}
