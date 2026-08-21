import { Component, computed, inject, signal, effect, OnDestroy, AfterViewInit, ViewChildren, QueryList } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoutinesStore } from '../stores/routines.store';
import { SessionsStore } from '../../sessions/stores/sessions.store';
import { formatDuration } from '../../sessions/models/WorkoutSession';
import { LucidePencil, LucideTrash, LucideCheck, LucideX, LucideGripVertical, LucideChevronDown, LucidePlay, LucideSquare, LucideRotateCcw, LucideFolderInput, LucideArrowRightLeft, LucideCopy, LucideLink, LucideShare2 } from '@lucide/angular';
import { PlatformIconComponent } from '../components/platform-icon/platform-icon';
import { EmojiPickerComponent } from '../../../shared/components/emoji-picker/emoji-picker';
import { detectPlatform, fetchVideoInfo, fetchVideoTitle, getPlatformName, getThumbnailUrl, toExerciseName, VideoInfo } from '../utils/platform';
import { CdkDragDrop, CdkDropList, CdkDropListGroup, CdkDrag, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Section } from '../models/Section';
import { Exercise } from '../models/Exercise';
import { ConfirmService } from '../../../core/confirm.service';
import { appOrigin } from '../../../core/app-origin';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-routines-detail',
  imports: [LucidePencil, LucideTrash, LucideCheck, LucideX, LucideGripVertical, LucideChevronDown,
            LucidePlay, LucideSquare, LucideRotateCcw, LucideFolderInput, LucideArrowRightLeft, LucideCopy,
            LucideLink, LucideShare2,
            PlatformIconComponent, EmojiPickerComponent, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragHandle,
            NgTemplateOutlet, TranslatePipe],
  template: `
    @if (routineLoading()) {
      <div class="flex justify-center py-20">
        <div class="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin"></div>
      </div>
    } @else if (routine(); as routine) {

      <!-- Header -->
      <div class="px-5 pt-8 pb-4">
        <div class="flex items-center justify-between mb-4">
          <button class="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink cursor-pointer transition" (click)="back()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            {{ 'detail.back' | t }}
          </button>
          <button
            class="w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer"
            [class.text-brand]="isPublic()"
            [class.bg-brand-light]="isPublic()"
            [class.text-ink-muted]="!isPublic()"
            [class.hover:text-brand]="!isPublic()"
            [class.hover:bg-brand-light]="!isPublic()"
            (click)="showShareSheet.set(true)"
            title="Compartir"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <!-- Emoji button -->
          <button
            type="button"
            class="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center shrink-0 transition-colors hover:bg-brand/20"
            [class.ring-2]="showEmojiPicker()"
            [class.ring-brand]="showEmojiPicker()"
            (click)="showEmojiPicker.update(v => !v)"
          >
            @if (routineEmoji()) {
              <span class="text-2xl leading-none">{{ routineEmoji() }}</span>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-brand" width="22" height="22">
                <path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11"/>
                <circle cx="3.5" cy="6.5" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="17.5" r="1"/>
              </svg>
            }
          </button>

          <div class="flex-1 min-w-0">
            @if (editingRoutineName()) {
              <div class="flex items-center gap-2">
                <input
                  class="text-2xl font-bold text-ink border-b-2 border-brand outline-none bg-transparent min-w-0 flex-1"
                  #renameInput [value]="routine.name"
                  (keyup.enter)="saveRoutineName(renameInput.value)"
                  (keyup.escape)="editingRoutineName.set(false)"
                />
                <button class="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white shrink-0 shadow-sm shadow-brand/30 transition hover:bg-brand-dark" (click)="saveRoutineName(renameInput.value)">
                  <svg lucideCheck [size]="16" [strokeWidth]="2.5"></svg>
                </button>
                <button class="w-9 h-9 rounded-xl bg-canvas flex items-center justify-center text-ink-muted shrink-0 transition hover:bg-edge" (click)="editingRoutineName.set(false)">
                  <svg lucideX [size]="16" [strokeWidth]="2.5"></svg>
                </button>
              </div>
            } @else {
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-ink truncate">{{ routine.name }}</h1>
                <button class="text-ink-muted hover:text-brand cursor-pointer transition shrink-0" (click)="editingRoutineName.set(true)">
                  <svg lucidePencil [size]="16" [strokeWidth]="2"></svg>
                </button>
              </div>
            }
            <p class="text-sm text-ink-muted mt-0.5">{{ exerciseCount() }} {{ 'detail.exercises' | t }}</p>
          </div>
        </div>

        @if (showEmojiPicker()) {
          <div class="mt-3 p-2 bg-canvas rounded-2xl border border-edge">
            <app-emoji-picker [selected]="routineEmoji()" (pick)="onPickEmoji($event)" />
          </div>
        }
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
      <div class="px-5 pb-40" cdkDropListGroup>
      <div class="space-y-2" cdkDropList [cdkDropListData]="'root'" (cdkDropListDropped)="onDrop($event)">

        @for (item of routine.items; track item.id) {

          <!-- ROOT EXERCISE -->
          @if (item.type === 'exercise') {
            @if (editingItemId() === item.id) {
              <div class="bg-surface border border-brand/30 rounded-2xl p-4 space-y-2 shadow-sm" cdkDrag [cdkDragData]="item">
                <div class="flex gap-2">
                  <input class="flex-1 bg-canvas border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition" #editName [value]="item.name" />
                  <button class="w-9 h-10 flex items-center justify-center rounded-xl bg-canvas border border-edge text-ink-muted hover:text-brand hover:border-brand transition shrink-0" title="Recuperar título original"
                    (click)="refetchInfo(editUrl.value, editName)">
                    <svg lucideRotateCcw [size]="14" [strokeWidth]="2"></svg>
                  </button>
                </div>
                <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition" #editUrl [value]="item.videoUrl" />
                <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.notesPlaceholder' | t" #editNotes [value]="item.notes ?? ''" />
                <div class="flex gap-2 items-center">
                  <button class="bg-brand text-white px-4 py-2 rounded-xl cursor-pointer text-sm font-semibold"
                    (click)="saveExercise(item.id, editName.value, editUrl.value, editNotes.value)">{{ 'detail.save' | t }}</button>
                  <button class="text-ink-muted px-4 py-2 rounded-xl cursor-pointer text-sm bg-canvas"
                    (click)="editingItemId.set(null)">{{ 'detail.cancel' | t }}</button>
                  <button class="ml-auto flex items-center justify-center w-9 h-9 rounded-xl text-danger hover:bg-danger-muted transition cursor-pointer"
                    (click)="deleteExercise(item.id)">
                    <svg lucideTrash [size]="15" [strokeWidth]="2"></svg>
                  </button>
                </div>
              </div>
            } @else {
              <div class="bg-surface border border-edge rounded-2xl px-4 py-3 shadow-sm" cdkDrag [cdkDragData]="item">
                <ng-container *ngTemplateOutlet="exerciseRow; context: { $implicit: item, cache: mediaCache() }"></ng-container>
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
                      <div class="flex gap-2">
                        <input class="flex-1 bg-canvas border border-edge rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-brand transition" #sEditName [value]="exercise.name" />
                        <button class="w-9 h-10 flex items-center justify-center rounded-xl bg-canvas border border-edge text-ink-muted hover:text-brand hover:border-brand transition shrink-0" title="Recuperar título original"
                          (click)="refetchInfo(sEditUrl.value, sEditName)">
                          <svg lucideRotateCcw [size]="14" [strokeWidth]="2"></svg>
                        </button>
                      </div>
                      <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-brand transition" #sEditUrl [value]="exercise.videoUrl" />
                      <input class="w-full bg-canvas border border-edge rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-brand transition" [placeholder]="'detail.notesPlaceholder' | t" #sEditNotes [value]="exercise.notes ?? ''" />
                      <div class="flex gap-2 items-center">
                        <button class="bg-brand text-white px-3 py-1.5 rounded-lg cursor-pointer text-sm font-semibold"
                          (click)="saveExercise(exercise.id, sEditName.value, sEditUrl.value, sEditNotes.value)">{{ 'detail.save' | t }}</button>
                        <button class="text-ink-muted px-3 py-1.5 rounded-lg cursor-pointer text-sm bg-canvas"
                          (click)="editingItemId.set(null)">{{ 'detail.cancel' | t }}</button>
                        <button class="ml-auto flex items-center justify-center w-9 h-9 rounded-xl text-danger hover:bg-danger-muted transition cursor-pointer"
                          (click)="deleteExercise(exercise.id)">
                          <svg lucideTrash [size]="15" [strokeWidth]="2"></svg>
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="bg-canvas border border-edge rounded-xl px-3 py-2.5" cdkDrag [cdkDragData]="exercise">
                      <ng-container *ngTemplateOutlet="exerciseRow; context: { $implicit: exercise, cache: mediaCache() }"></ng-container>
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

      <!-- Session FAB -->
      <div class="fixed left-0 right-0 flex justify-center px-5 z-40 pointer-events-none"
           style="bottom: calc(6rem + env(safe-area-inset-bottom))">
        @if (isActiveSession()) {
          <div class="pointer-events-auto flex items-center gap-3 bg-surface border border-brand/20 rounded-2xl px-4 py-3 shadow-xl shadow-brand/15">
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] font-bold text-brand uppercase tracking-widest">{{ 'session.inProgress' | t }}</span>
              <span class="text-xl font-bold text-ink tabular-nums">{{ formatElapsed(elapsedSeconds()) }}</span>
            </div>
            <button
              class="flex items-center gap-2 bg-brand text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm shadow-brand/30 transition hover:bg-brand-dark shrink-0"
              (click)="finishSession()"
            >
              <svg lucideSquare [size]="15" [strokeWidth]="2" class="fill-white"></svg>
              {{ 'session.finish' | t }}
            </button>
          </div>
        } @else if (!sessions.activeSession()) {
          <button
            class="pointer-events-auto flex items-center gap-2.5 bg-brand text-white px-7 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-brand/30 transition hover:bg-brand-dark"
            (click)="startSession()"
          >
            <svg lucidePlay [size]="18" [strokeWidth]="2" class="fill-white"></svg>
            {{ 'session.start' | t }}
          </button>
        }
      </div>

    }

    <!-- Share sheet -->
    @if (showShareSheet()) {
      <div class="fixed inset-0 z-200 flex flex-col justify-end bg-black/40 backdrop-blur-sm" (click)="showShareSheet.set(false)">
        <div class="bg-surface rounded-t-3xl border-t border-edge shadow-2xl px-5 pt-6 pb-14" (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-ink">Compartir rutina</h2>
            <button class="w-8 h-8 flex items-center justify-center rounded-xl bg-canvas text-ink-muted" (click)="showShareSheet.set(false)">
              <svg lucideX [size]="16" [strokeWidth]="2.5"></svg>
            </button>
          </div>

          <!-- Toggle -->
          <div class="flex items-center justify-between bg-canvas rounded-2xl px-4 py-3.5 mb-4 border border-edge">
            <div>
              <p class="text-sm font-semibold text-ink">{{ isPublic() ? 'Rutina pública' : 'Rutina privada' }}</p>
              <p class="text-xs text-ink-muted mt-0.5">{{ isPublic() ? 'Cualquiera con el enlace puede verla' : 'Solo tú puedes verla' }}</p>
            </div>
            <button
              class="w-12 h-6 rounded-full transition-all duration-200 flex items-center shrink-0 ml-4"
              [class.bg-brand]="isPublic()"
              [class.bg-edge]="!isPublic()"
              [disabled]="shareLoading()"
              (click)="togglePublic()"
            >
              <span
                class="w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 block"
                [class.translate-x-6]="isPublic()"
                [class.translate-x-0.5]="!isPublic()"
              ></span>
            </button>
          </div>

          @if (isPublic() && shareUrl()) {
            <div class="space-y-3">
              <div class="flex items-center gap-2 bg-canvas rounded-2xl px-4 py-3 border border-edge">
                <span class="text-xs text-ink-muted flex-1 truncate select-all">{{ shareUrl() }}</span>
              </div>
              <div class="flex gap-2">
                <button
                  class="flex-1 flex items-center justify-center gap-2 bg-brand text-white py-3.5 rounded-2xl font-semibold text-sm shadow-sm shadow-brand/20 transition"
                  (click)="copyShareUrl()"
                >
                  @if (shareCopied()) {
                    <svg lucideCheck [size]="16" [strokeWidth]="2.5"></svg>
                  } @else {
                    <svg lucideLink [size]="16" [strokeWidth]="2"></svg>
                  }
                  <span>{{ (shareCopied() ? 'share.copied' : 'share.copyLink') | t }}</span>
                </button>
                @if (canNativeShare) {
                  <button
                    class="flex items-center justify-center px-4 py-3.5 rounded-2xl bg-canvas border border-edge text-ink font-semibold text-sm"
                    [title]="'share.shareVia' | t"
                    [attr.aria-label]="'share.shareVia' | t"
                    (click)="nativeShare()"
                  >
                    <svg lucideShare2 [size]="16" [strokeWidth]="2"></svg>
                  </button>
                }
              </div>
            </div>
          }

        </div>
      </div>
    }

    <!-- Move / duplicate to another routine -->
    @if (movingExercise(); as moving) {
      <div class="fixed inset-0 z-200 flex flex-col justify-end bg-black/40 backdrop-blur-sm" (click)="closeMoveSheet()">
        <div class="bg-surface rounded-t-3xl border-t border-edge shadow-2xl px-5 pt-6 pb-14 max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">

          <div class="flex items-start justify-between gap-3 mb-5">
            <div class="min-w-0">
              <h2 class="text-lg font-bold text-ink">{{ 'detail.moveTitle' | t }}</h2>
              <p class="text-xs text-ink-muted truncate mt-0.5">{{ moving.name }}</p>
            </div>
            <button class="w-8 h-8 flex items-center justify-center rounded-xl bg-canvas text-ink-muted shrink-0" (click)="closeMoveSheet()">
              <svg lucideX [size]="16" [strokeWidth]="2.5"></svg>
            </button>
          </div>

          <!-- Move vs duplicate -->
          <div class="flex bg-canvas rounded-xl p-1 mb-4 border border-edge">
            <button
              class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition"
              [class.bg-brand]="moveMode() === 'move'"
              [class.text-white]="moveMode() === 'move'"
              [class.text-ink-muted]="moveMode() !== 'move'"
              (click)="moveMode.set('move')"
            >
              <svg lucideArrowRightLeft [size]="14" [strokeWidth]="2"></svg>
              {{ 'detail.moveAction' | t }}
            </button>
            <button
              class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition"
              [class.bg-brand]="moveMode() === 'copy'"
              [class.text-white]="moveMode() === 'copy'"
              [class.text-ink-muted]="moveMode() !== 'copy'"
              (click)="moveMode.set('copy')"
            >
              <svg lucideCopy [size]="14" [strokeWidth]="2"></svg>
              {{ 'detail.copyAction' | t }}
            </button>
          </div>

          <p class="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2">{{ 'detail.moveTarget' | t }}</p>

          @if (otherRoutines().length === 0) {
            <p class="text-sm text-ink-muted py-4 text-center">{{ 'detail.moveNoTargets' | t }}</p>
          } @else {
            <div class="flex-1 overflow-y-auto -mx-1 px-1">
              <div class="space-y-2">
                @for (target of otherRoutines(); track target.id) {
                  <button
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-canvas border border-edge text-left transition disabled:opacity-50"
                    [disabled]="moveLoading()"
                    (click)="confirmMove(target.id)"
                  >
                    <span class="text-lg leading-none shrink-0">{{ target.isInbox ? '⚡' : (target.emoji || '📋') }}</span>
                    <span class="flex-1 text-sm font-medium text-ink truncate">{{ target.name }}</span>
                    <span class="text-xs text-ink-muted shrink-0">{{ target.exerciseCount }}</span>
                  </button>
                }
              </div>
            </div>
          }

          @if (moveError()) {
            <p class="text-xs text-danger mt-3 text-center">{{ 'detail.moveError' | t }}</p>
          }

        </div>
      </div>
    }

    <!-- Shared exercise row template -->
    <ng-template #exerciseRow let-exercise let-cache="cache">
      <div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" (click)="toggleExpanded(exercise.id)">
            <button cdkDragHandle class="text-edge hover:text-ink-muted cursor-grab active:cursor-grabbing touch-none shrink-0 transition" (click)="$event.stopPropagation()">
              <svg lucideGripVertical [size]="16" [strokeWidth]="2"></svg>
            </button>
            @if (thumbFor(exercise.videoUrl, cache); as thumb) {
              <img [src]="thumb" class="w-16 h-9 rounded-lg object-cover shrink-0 bg-edge" loading="lazy" />
            } @else {
              <app-platform-icon [url]="exercise.videoUrl" mode="thumbnail" />
            }
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 min-w-0">
                <h3 class="font-semibold text-ink truncate text-sm">{{ exercise.name }}</h3>
                <svg lucideChevronDown [size]="12" [strokeWidth]="2.5" class="shrink-0 text-ink-muted/50 transition-transform duration-200" [class.rotate-180]="expandedExerciseId() === exercise.id"></svg>
              </div>
              <a class="text-xs text-brand hover:text-brand-dark transition" [href]="exercise.videoUrl" target="_blank" rel="noopener noreferrer" (click)="$event.stopPropagation()">
                {{ 'detail.viewOn' | t }} {{ platformLabel(exercise.videoUrl) }}
              </a>
              @if (exercise.notes) {
                <p class="text-xs text-ink-muted mt-0.5">{{ exercise.notes }}</p>
              }
            </div>
          </div>
          <div class="flex items-center shrink-0">
            <button class="flex items-center justify-center w-8 h-8 rounded-xl text-ink-muted hover:text-brand hover:bg-brand-light transition cursor-pointer"
              (click)="openMoveSheet(exercise, $event)" [title]="'detail.moveTitle' | t">
              <svg lucideFolderInput [size]="14" [strokeWidth]="2"></svg>
            </button>
            <button class="flex items-center justify-center w-8 h-8 rounded-xl text-ink-muted hover:text-brand hover:bg-brand-light transition cursor-pointer"
              (click)="editingItemId.set(exercise.id); $event.stopPropagation()" title="Edit">
              <svg lucidePencil [size]="14" [strokeWidth]="2"></svg>
            </button>
          </div>
        </div>
        @if (expandedExerciseId() === exercise.id) {
          <div class="mt-2 pt-2 border-t border-edge/50 space-y-2">
            @if (authorFor(exercise.videoUrl, cache); as va) {
              <p class="text-xs text-ink-muted font-medium">@{{ va }}</p>
            }
            @if (titleFor(exercise.videoUrl, cache); as vt) {
              <p class="text-xs text-ink-muted whitespace-pre-line leading-relaxed">{{ vt }}</p>
            }
            @if (descFor(exercise.videoUrl, cache); as vd) {
              <p class="text-xs text-ink-muted whitespace-pre-line leading-relaxed">{{ vd }}</p>
            }
            @if (!authorFor(exercise.videoUrl, cache) && !titleFor(exercise.videoUrl, cache) && !descFor(exercise.videoUrl, cache)) {
              <p class="text-xs text-ink-muted/50 italic">Sin información disponible</p>
            }
          </div>
        }
      </div>
    </ng-template>
  `
})
export class RoutinesDetailComponent implements OnDestroy, AfterViewInit {
  private store = inject(RoutinesStore);
  private confirmService = inject(ConfirmService);
  readonly sessions = inject(SessionsStore);
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

  readonly isActiveSession = computed(() => this.sessions.activeSession()?.routineId === this.id());

  elapsedSeconds = signal(0);
  private _timerRef: ReturnType<typeof setInterval> | null = null;

  readonly formatElapsed = formatDuration;

  constructor() {
    effect(() => this.store.loadRoutine(this.id()));

    effect(() => {
      const active = this.sessions.activeSession();
      if (active?.routineId === this.id()) {
        const start = new Date(active.startedAt).getTime();
        this.elapsedSeconds.set(Math.floor((Date.now() - start) / 1000));
        if (this._timerRef) clearInterval(this._timerRef);
        this._timerRef = setInterval(() => {
          this.elapsedSeconds.set(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      } else {
        if (this._timerRef) { clearInterval(this._timerRef); this._timerRef = null; }
        this.elapsedSeconds.set(0);
      }
    });

    effect(() => {
      const routine = this.routine();
      if (!routine) return;
      for (const item of routine.items) {
        if (item.type === 'exercise') this._triggerFetch(item.videoUrl);
        else for (const ex of (item as Section).exercises) this._triggerFetch(ex.videoUrl);
      }
    });
  }

  @ViewChildren(CdkDropList) private _dropLists!: QueryList<CdkDropList>;

  ngAfterViewInit() {
    this._connectLists();
    this._dropLists.changes.subscribe(() => this._connectLists());
  }

  private _connectLists() {
    const all = this._dropLists.toArray();
    all.forEach(list => { list.connectedTo = all.filter(l => l !== list); });
  }

  ngOnDestroy() {
    if (this._timerRef) clearInterval(this._timerRef);
  }

  async startSession() {
    const r = this.routine();
    if (!r) return;
    await this.sessions.startSession(this.id(), r.name, this.routineEmoji() || undefined);
  }

  async finishSession() {
    await this.sessions.completeSession();
  }

  readonly mediaCache = signal<Record<string, VideoInfo>>({});
  private readonly fetchingUrls = new Set<string>();

  editingRoutineName = signal(false);
  editingItemId = signal<string | null>(null);
  addingSection = signal(false);
  addingToSection = signal<string | null>(null);
  expandedExerciseId = signal<string | null>(null);
  showEmojiPicker = signal(false);

  showShareSheet = signal(false);
  shareLoading = signal(false);
  shareCopied = signal(false);

  movingExercise = signal<Exercise | null>(null);
  moveMode = signal<'move' | 'copy'>('move');
  moveLoading = signal(false);
  moveError = signal(false);

  readonly otherRoutines = computed(() => this.store.routines().filter(r => r.id !== this.id()));

  readonly isPublic = computed(() => this.store.routine()?.isPublic ?? false);
  readonly shareToken = computed(() => this.store.routine()?.shareToken ?? null);
  readonly shareUrl = computed(() => {
    const t = this.shareToken();
    if (!t) return null;
    return `${appOrigin()}/r/${t}`;
  });
  readonly canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  readonly routineEmoji = computed(() =>
    this.store.routines().find(r => r.id === this.id())?.emoji ?? ''
  );

  onPickEmoji(emoji: string) {
    this.store.updateRoutineEmoji(this.id(), emoji);
    this.showEmojiPicker.set(false);
  }

  addRootExercise(name: string, videoUrl: string, notes: string) {
    if (!videoUrl.trim()) return;
    const finalName = name.trim() || getPlatformName(detectPlatform(videoUrl));
    this.store.addExercise(this.id(), { name: finalName, videoUrl, notes: notes.trim() || undefined });
  }

  async deleteExercise(exerciseId: string) {
    const ok = await this.confirmService.confirm('¿Eliminar este ejercicio?');
    if (ok) {
      this.store.deleteExercise(this.id(), exerciseId);
      this.editingItemId.set(null);
    }
  }

  saveExercise(id: string, name: string, videoUrl: string, notes: string) {
    if (!videoUrl.trim()) return;
    const finalName = name.trim() || getPlatformName(detectPlatform(videoUrl));
    this.store.updateExercise(this.id(), id, { name: finalName, videoUrl, notes: notes.trim() || undefined });
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

  async deleteSection(sectionId: string) {
    const ok = await this.confirmService.confirm('¿Eliminar esta sección y todos sus ejercicios?');
    if (ok) this.store.deleteSection(this.id(), sectionId);
  }

  addSectionExercise(sectionId: string, name: string, videoUrl: string, notes: string) {
    if (!videoUrl.trim()) return;
    const finalName = name.trim() || getPlatformName(detectPlatform(videoUrl));
    this.store.addExercise(this.id(), { name: finalName, videoUrl, notes: notes.trim() || undefined }, sectionId);
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

  private _triggerFetch(url: string) {
    if (!url || this.fetchingUrls.has(url)) return;
    this.fetchingUrls.add(url);
    fetchVideoInfo(url).then(info => {
      this.mediaCache.update(c => ({ ...c, [url]: info }));
    });
  }

  thumbFor(url: string, cache: Record<string, VideoInfo>): string | null {
    return cache[url]?.thumb ?? getThumbnailUrl(url) ?? null;
  }

  titleFor(url: string, cache: Record<string, VideoInfo>): string | null {
    return cache[url]?.title ?? null;
  }

  descFor(url: string, cache: Record<string, VideoInfo>): string | null {
    const info = cache[url];
    const desc = info?.desc?.trim();
    if (!desc) return null;

    // Instagram hands back the caption as the title as well — printing both just repeats it.
    const title = info?.title?.trim();
    if (title && (title.includes(desc) || desc.includes(title))) return null;
    return desc;
  }

  authorFor(url: string, cache: Record<string, VideoInfo>): string | null {
    return cache[url]?.author ?? null;
  }

  toggleExpanded(id: string) {
    this.expandedExerciseId.update(curr => curr === id ? null : id);
  }

  openMoveSheet(exercise: Exercise, event: Event) {
    event.stopPropagation();
    this.moveError.set(false);
    this.moveMode.set('move');
    this.movingExercise.set(exercise);
  }

  closeMoveSheet() {
    if (this.moveLoading()) return;
    this.movingExercise.set(null);
    this.moveError.set(false);
  }

  async confirmMove(targetRoutineId: string) {
    const exercise = this.movingExercise();
    if (!exercise || this.moveLoading()) return;

    this.moveLoading.set(true);
    this.moveError.set(false);
    try {
      if (this.moveMode() === 'move') {
        await this.store.moveExerciseToRoutine(this.id(), exercise.id, targetRoutineId);
      } else {
        await this.store.copyExerciseToRoutine(exercise, targetRoutineId);
      }
      this.movingExercise.set(null);
    } catch {
      this.moveError.set(true);
    } finally {
      this.moveLoading.set(false);
    }
  }

  async autoFillTitle(url: string, nameInput: HTMLInputElement) {
    if (!url.trim() || nameInput.value.trim()) return;
    const title = await fetchVideoTitle(url);
    if (title && !nameInput.value.trim()) nameInput.value = title;
  }

  async togglePublic() {
    this.shareLoading.set(true);
    try {
      await this.store.setPublic(this.id(), !this.isPublic());
    } finally {
      this.shareLoading.set(false);
    }
  }

  async copyShareUrl() {
    const url = this.shareUrl();
    if (!url) return;
    // Rejects outside a secure context or when denied; fall back to the share sheet.
    try {
      await navigator.clipboard.writeText(url);
      this.shareCopied.set(true);
      setTimeout(() => this.shareCopied.set(false), 2000);
    } catch {
      await this.nativeShare();
    }
  }

  async nativeShare() {
    const url = this.shareUrl();
    if (!url) return;
    try { await navigator.share({ title: this.store.routine()?.name, url }); } catch {}
  }

  async refetchInfo(url: string, nameInput: HTMLInputElement) {
    if (!url.trim()) return;
    const info = await fetchVideoInfo(url);
    this.mediaCache.update(c => ({ ...c, [url]: info }));
    const name = toExerciseName(info.title);
    if (name) nameInput.value = name;
  }

  back() {
    this.router.navigate(['/routines']);
  }
}
