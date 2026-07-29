import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoutinesStore } from '../stores/routines.store';
import { LucidePencil, LucideTrash, LucideCheck, LucideX, LucideGripVertical } from '@lucide/angular';
import { PlatformIconComponent } from '../components/platform-icon/platform-icon';
import { detectPlatform, fetchVideoTitle, getPlatformName, getThumbnailUrl } from '../utils/platform';
import { CdkDragDrop, CdkDropList, CdkDropListGroup, CdkDrag, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Section } from '../models/Section';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-routines-detail',
  imports: [LucidePencil, LucideTrash, LucideCheck, LucideX, LucideGripVertical,
            PlatformIconComponent, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragHandle,
            NgTemplateOutlet, TranslatePipe],
  template: `
    @if (routineLoading()) {
      <div class="flex justify-center py-20">
        <div class="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin"></div>
      </div>
    } @else if (routine(); as routine) {

      <!-- Header -->
      <div class="px-5 pt-8 pb-4">
        <button class="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink cursor-pointer mb-4 transition" (click)="back()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          {{ 'detail.back' | t }}
        </button>

        @if (editingRoutineName()) {
          <div class="flex items-center gap-2">
            <input
              class="text-2xl font-bold text-ink border-b-2 border-brand outline-none bg-transparent flex-1"
              #renameInput [value]="routine.name"
              (keyup.enter)="saveRoutineName(renameInput.value)"
              (keyup.escape)="editingRoutineName.set(false)"
            />
            <button class="text-green-500 cursor-pointer p-1" (click)="saveRoutineName(renameInput.value)">
              <svg lucideCheck [size]="18" [strokeWidth]="2"></svg>
            </button>
            <button class="text-ink-muted cursor-pointer p-1" (click)="editingRoutineName.set(false)">
              <svg lucideX [size]="18" [strokeWidth]="2"></svg>
            </button>
          </div>
        } @else {
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-ink">{{ routine.name }}</h1>
            <button class="text-ink-muted hover:text-brand cursor-pointer transition" (click)="editingRoutineName.set(true)">
              <svg lucidePencil [size]="16" [strokeWidth]="2"></svg>
            </button>
          </div>
        }
        <p class="text-sm text-ink-muted mt-1">{{ exerciseCount() }} {{ 'detail.exercises' | t }}</p>
      </div>

      <!-- Add root exercise -->
      <div class="mx-5 mb-4 bg-surface border border-edge rounded-2xl p-4 shadow-sm">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">{{ 'detail.addExercise' | t }}</p>
        <div class="space-y-2">
          <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.namePlaceholder' | t" #name />
          <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.urlPlaceholder' | t" #url (blur)="autoFillTitle(url.value, name)" />
          <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.notesPlaceholder' | t" #notes />
          <button
            class="bg-brand text-white px-4 py-2 rounded-xl cursor-pointer text-sm font-semibold shadow-sm shadow-brand/20 hover:bg-brand-dark transition"
            (click)="addRootExercise(name.value, url.value, notes.value); name.value=''; url.value=''; notes.value=''"
          >{{ 'detail.add' | t }}</button>
        </div>
      </div>

      <!-- Add section -->
      <div class="px-5 mb-4">
        @if (addingSection()) {
          <div class="flex items-center gap-2">
            <input
              class="flex-1 bg-surface border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition"
              [placeholder]="'detail.sectionPlaceholder' | t"
              #sectionInput
              (keyup.enter)="addSection(sectionInput.value)"
              (keyup.escape)="addingSection.set(false)"
            />
            <button class="text-green-500 cursor-pointer p-1.5" (click)="addSection(sectionInput.value)">
              <svg lucideCheck [size]="18" [strokeWidth]="2"></svg>
            </button>
            <button class="text-ink-muted cursor-pointer p-1.5" (click)="addingSection.set(false)">
              <svg lucideX [size]="18" [strokeWidth]="2"></svg>
            </button>
          </div>
        } @else {
          <button class="text-sm text-brand font-medium cursor-pointer" (click)="addingSection.set(true)">
            {{ 'detail.addSection' | t }}
          </button>
        }
      </div>

      <!-- Root drop list -->
      <div class="px-5 pb-4" cdkDropListGroup>
      <div class="space-y-2" cdkDropList [cdkDropListData]="'root'" (cdkDropListDropped)="onDrop($event)">

        @for (item of routine.items; track item.id) {

          <!-- ROOT EXERCISE -->
          @if (item.type === 'exercise') {
            @if (editingItemId() === item.id) {
              <div class="bg-surface border border-brand/30 rounded-2xl p-4 space-y-2 shadow-sm" cdkDrag [cdkDragData]="item">
                <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition" #editName [value]="item.name" />
                <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition" #editUrl [value]="item.videoUrl" />
                <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.notesPlaceholder' | t" #editNotes [value]="item.notes ?? ''" />
                <div class="flex gap-2">
                  <button class="bg-brand text-white px-4 py-2 rounded-xl cursor-pointer text-sm font-semibold"
                    (click)="saveExercise(item.id, editName.value, editUrl.value, editNotes.value)">{{ 'detail.save' | t }}</button>
                  <button class="text-ink-muted px-4 py-2 rounded-xl cursor-pointer text-sm bg-canvas"
                    (click)="editingItemId.set(null)">{{ 'detail.cancel' | t }}</button>
                </div>
              </div>
            } @else {
              <div class="bg-surface border border-edge rounded-2xl px-4 py-3 shadow-sm" cdkDrag [cdkDragData]="item">
                <ng-container *ngTemplateOutlet="exerciseRow; context: { $implicit: item }"></ng-container>
              </div>
            }
          }

          <!-- SECTION -->
          @if (item.type === 'section') {
            <div class="bg-surface border border-edge rounded-2xl shadow-sm overflow-hidden" cdkDrag [cdkDragData]="item">

              <!-- Section header -->
              <div class="flex items-center gap-2 px-3 py-2.5 bg-brand-light border-b border-edge" cdkDragHandle>
                <span class="text-brand/40 cursor-grab">
                  <svg lucideGripVertical [size]="14" [strokeWidth]="2"></svg>
                </span>

                @if (editingItemId() === item.id) {
                  <input
                    class="flex-1 text-xs font-bold tracking-widest uppercase border-b-2 border-brand outline-none bg-transparent text-brand"
                    #sectionEditInput [value]="item.name"
                    (keyup.enter)="saveSection(item.id, sectionEditInput.value)"
                    (keyup.escape)="editingItemId.set(null)"
                  />
                  <button class="text-green-500 cursor-pointer p-1" (click)="saveSection(item.id, sectionEditInput.value)">
                    <svg lucideCheck [size]="14" [strokeWidth]="2"></svg>
                  </button>
                  <button class="text-ink-muted cursor-pointer p-1" (click)="editingItemId.set(null)">
                    <svg lucideX [size]="14" [strokeWidth]="2"></svg>
                  </button>
                } @else {
                  <span class="flex-1 text-xs font-bold tracking-widest uppercase text-brand select-none">{{ item.name }}</span>
                  <button class="text-brand/50 hover:text-brand cursor-pointer p-1 transition" (click)="editingItemId.set(item.id); $event.stopPropagation()">
                    <svg lucidePencil [size]="13" [strokeWidth]="2"></svg>
                  </button>
                  <button class="text-brand/50 hover:text-danger cursor-pointer p-1 transition" (click)="deleteSection(item.id); $event.stopPropagation()">
                    <svg lucideTrash [size]="13" [strokeWidth]="2"></svg>
                  </button>
                }
              </div>

              <!-- Section exercises drop list -->
              <div class="p-2 space-y-2" cdkDropList [cdkDropListData]="item.id" [cdkDropListEnterPredicate]="onlyExercises" (cdkDropListDropped)="onDrop($event)">

                @for (exercise of item.exercises; track exercise.id) {
                  @if (editingItemId() === exercise.id) {
                    <div class="border border-brand/30 rounded-xl p-3 space-y-2 bg-surface" cdkDrag [cdkDragData]="exercise">
                      <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-brand transition" #sEditName [value]="exercise.name" />
                      <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-brand transition" #sEditUrl [value]="exercise.videoUrl" />
                      <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.notesPlaceholder' | t" #sEditNotes [value]="exercise.notes ?? ''" />
                      <div class="flex gap-2">
                        <button class="bg-brand text-white px-3 py-1.5 rounded-lg cursor-pointer text-sm font-semibold"
                          (click)="saveExercise(exercise.id, sEditName.value, sEditUrl.value, sEditNotes.value)">{{ 'detail.save' | t }}</button>
                        <button class="text-ink-muted px-3 py-1.5 rounded-lg cursor-pointer text-sm bg-canvas"
                          (click)="editingItemId.set(null)">{{ 'detail.cancel' | t }}</button>
                      </div>
                    </div>
                  } @else {
                    <div class="bg-canvas border border-edge rounded-xl px-3 py-2.5" cdkDrag [cdkDragData]="exercise">
                      <ng-container *ngTemplateOutlet="exerciseRow; context: { $implicit: exercise }"></ng-container>
                    </div>
                  }
                } @empty {
                  <p class="text-xs text-ink-muted px-2 py-1.5">{{ 'detail.noExercisesSection' | t }}</p>
                }

                <!-- Add exercise to section -->
                @if (addingToSection() === item.id) {
                  <div class="space-y-2 pt-1">
                    <input class="w-full bg-surface border border-edge rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.namePlaceholder' | t" #sName />
                    <input class="w-full bg-surface border border-edge rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.urlPlaceholder' | t" #sUrl (blur)="autoFillTitle(sUrl.value, sName)" />
                    <input class="w-full bg-surface border border-edge rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.notesPlaceholder' | t" #sNotes />
                    <div class="flex gap-2">
                      <button class="bg-brand text-white px-3 py-1.5 rounded-lg cursor-pointer text-sm font-semibold"
                        (click)="addSectionExercise(item.id, sName.value, sUrl.value, sNotes.value); sName.value=''; sUrl.value=''; sNotes.value=''">{{ 'detail.add' | t }}</button>
                      <button class="text-ink-muted px-3 py-1.5 cursor-pointer text-sm"
                        (click)="addingToSection.set(null)">{{ 'detail.cancel' | t }}</button>
                    </div>
                  </div>
                } @else {
                  <button
                    class="text-xs text-brand font-medium cursor-pointer px-2 py-1"
                    (click)="addingToSection.set(item.id); $event.stopPropagation()"
                  >{{ 'detail.addExerciseSection' | t }}</button>
                }
              </div>

            </div>
          }

        } @empty {
          <div class="border-2 border-dashed border-edge rounded-2xl p-10 text-center">
            <p class="font-semibold text-ink">{{ 'detail.noExercises' | t }}</p>
            <p class="text-sm text-ink-muted mt-1">{{ 'detail.noExercisesHint' | t }}</p>
          </div>
        }

      </div>
      </div>

    }

    <!-- Shared exercise row template -->
    <ng-template #exerciseRow let-exercise>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <button cdkDragHandle class="text-edge hover:text-ink-muted cursor-grab active:cursor-grabbing touch-none shrink-0 transition">
            <svg lucideGripVertical [size]="16" [strokeWidth]="2"></svg>
          </button>
          @if (thumbnail(exercise.videoUrl); as thumb) {
            <img [src]="thumb" class="w-16 h-9 rounded-lg object-cover shrink-0 bg-edge" loading="lazy" />
          } @else {
            <app-platform-icon [url]="exercise.videoUrl" />
          }
          <div class="min-w-0">
            <h3 class="font-semibold text-ink truncate text-sm">{{ exercise.name }}</h3>
            <a class="text-xs text-brand hover:text-brand-dark transition" [href]="exercise.videoUrl" target="_blank" rel="noopener noreferrer">
              {{ 'detail.viewOn' | t }} {{ platformLabel(exercise.videoUrl) }}
            </a>
            @if (exercise.notes) {
              <p class="text-xs text-ink-muted mt-0.5">{{ exercise.notes }}</p>
            }
          </div>
        </div>
        <div class="flex items-center gap-0.5 shrink-0">
          <button class="flex items-center justify-center w-8 h-8 rounded-xl text-ink-muted hover:text-brand hover:bg-brand-light transition cursor-pointer"
            (click)="editingItemId.set(exercise.id)" title="Edit">
            <svg lucidePencil [size]="14" [strokeWidth]="2"></svg>
          </button>
          <button class="flex items-center justify-center w-8 h-8 rounded-xl text-ink-muted hover:text-danger hover:bg-danger-muted transition cursor-pointer"
            (click)="deleteExercise(exercise.id)" title="Delete">
            <svg lucideTrash [size]="14" [strokeWidth]="2"></svg>
          </button>
        </div>
      </div>
    </ng-template>
  `
})
export class RoutinesDetailComponent {
  private store = inject(RoutinesStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  id = computed(() => this.route.snapshot.paramMap.get('id')!);
  readonly routine = this.store.routine;
  readonly routineLoading = this.store.routineLoading;
  exerciseCount = computed(() => {
    const items = this.store.routine()?.items ?? [];
    return items.reduce((n, i) =>
      i.type === 'exercise' ? n + 1 : n + (i as Section).exercises.length, 0);
  });

  constructor() {
    effect(() => this.store.loadRoutine(this.id()));
  }

  editingRoutineName = signal(false);
  editingItemId = signal<string | null>(null);
  addingSection = signal(false);
  addingToSection = signal<string | null>(null);

  addRootExercise(name: string, videoUrl: string, notes: string) {
    if (!name.trim() || !videoUrl.trim()) return;
    this.store.addExercise(this.id(), { name, videoUrl, notes: notes.trim() || undefined });
  }

  deleteExercise(exerciseId: string) {
    this.store.deleteExercise(this.id(), exerciseId);
  }

  saveExercise(id: string, name: string, videoUrl: string, notes: string) {
    if (!name.trim() || !videoUrl.trim()) return;
    this.store.updateExercise(this.id(), id, { name, videoUrl, notes: notes.trim() || undefined });
    this.editingItemId.set(null);
  }

  readonly onlyExercises = (drag: CdkDrag): boolean => drag.data?.type === 'exercise';

  onDrop(event: CdkDragDrop<string>) {
    const routineId = this.id();
    const fromList = event.previousContainer.data;
    const toList = event.container.data;

    if (event.previousContainer === event.container) {
      if (fromList === 'root') {
        const items = [...this.routine()!.items];
        moveItemInArray(items, event.previousIndex, event.currentIndex);
        this.store.reorderItems(routineId, items);
      } else {
        const section = this.routine()!.items.find(i => i.id === fromList) as Section;
        const exercises = [...section.exercises];
        moveItemInArray(exercises, event.previousIndex, event.currentIndex);
        this.store.reorderSectionExercises(routineId, fromList, exercises);
      }
    } else {
      const exercise = event.item.data;
      const fromSectionId = fromList === 'root' ? null : fromList;
      const toSectionId = toList === 'root' ? null : toList;
      this.store.moveExercise(routineId, exercise.id, fromSectionId, toSectionId, event.currentIndex);
    }
  }

  addSection(name: string) {
    if (!name.trim()) return;
    this.store.addSection(this.id(), name.trim());
    this.addingSection.set(false);
  }

  saveSection(id: string, name: string) {
    if (!name.trim()) return;
    this.store.updateSection(this.id(), id, name.trim());
    this.editingItemId.set(null);
  }

  deleteSection(sectionId: string) {
    this.store.deleteSection(this.id(), sectionId);
  }

  addSectionExercise(sectionId: string, name: string, videoUrl: string, notes: string) {
    if (!name.trim() || !videoUrl.trim()) return;
    this.store.addExercise(this.id(), { name, videoUrl, notes: notes.trim() || undefined }, sectionId);
    this.addingToSection.set(null);
  }

  saveRoutineName(name: string) {
    if (!name.trim()) return;
    this.store.renameRoutine(this.id(), name);
    this.editingRoutineName.set(false);
  }

  platformLabel(url: string): string {
    return getPlatformName(detectPlatform(url));
  }

  thumbnail(url: string): string | null {
    return getThumbnailUrl(url);
  }

  async autoFillTitle(url: string, nameInput: HTMLInputElement) {
    if (!url.trim() || nameInput.value.trim()) return;
    const title = await fetchVideoTitle(url);
    if (title && !nameInput.value.trim()) nameInput.value = title;
  }

  back() {
    this.router.navigate(['/routines']);
  }
}
