import { Injectable, inject, signal, computed, resource } from '@angular/core';
import { RoutinesApiService } from '../services/routines-api.service';
import { RoutineSummary } from '../models/RoutineSummary';
import { Routine } from '../models/Routine';
import { RoutineItem } from '../models/RoutineItem';
import { Exercise } from '../models/Exercise';
import { Section } from '../models/Section';

@Injectable({ providedIn: 'root' })
export class RoutinesStore {
  private api = inject(RoutinesApiService);

  // ── Lista de rutinas ──────────────────────────────────────────────────────

  private _listResource = resource({
    loader: () => this.api.getRoutines()
  });

  readonly routines = computed(() => this._listResource.value() ?? []);
  readonly listLoading = this._listResource.isLoading;
  readonly inboxRoutine = computed(() => this.routines().find(r => r.isInbox) ?? null);

  async addRoutine(name: string, emoji?: string): Promise<void> {
    const created = await this.api.createRoutine(name, false, emoji);
    this._listResource.set([...this.routines(), created]);
  }

  async ensureInboxRoutine(defaultName: string): Promise<void> {
    if (this.inboxRoutine()) return;
    const inbox = await this.api.ensureInboxRoutine(defaultName);
    if (!this.routines().find(r => r.id === inbox.id)) {
      this._listResource.set([inbox, ...this.routines()]);
    }
  }

  async deleteRoutine(id: string): Promise<void> {
    this._listResource.set(this.routines().filter(r => r.id !== id));
    await this.api.deleteRoutine(id);
  }

  // ── Rutina en detalle ─────────────────────────────────────────────────────

  private _detailId = signal<string | null>(null);

  private _detailResource = resource({
    loader: () => {
      const id = this._detailId();
      return id ? this.api.getRoutine(id) : Promise.resolve(null);
    }
  });

  readonly routine = computed(() => this._detailResource.value() ?? null);
  readonly routineLoading = this._detailResource.isLoading;

  loadRoutine(id: string): void {
    if (this._detailId() === id) {
      this._detailResource.reload();
    } else {
      this._detailId.set(id);
    }
  }

  private patch(updater: (r: Routine) => Routine): void {
    const current = this._detailResource.value();
    if (current) this._detailResource.set(updater(current));
  }

  // ── Renombrar / emoji rutina ──────────────────────────────────────────────

  async renameRoutine(routineId: string, name: string): Promise<void> {
    this.patch(r => ({ ...r, name }));
    this._listResource.set(this.routines().map(r => r.id === routineId ? { ...r, name } : r));
    await this.api.renameRoutine(routineId, name);
  }

  async updateRoutineEmoji(routineId: string, emoji: string): Promise<void> {
    const emojiVal = emoji || null;
    this._listResource.set(this.routines().map(r => r.id === routineId ? { ...r, emoji: emoji || undefined } : r));
    await this.api.updateRoutineEmoji(routineId, emojiVal);
  }

  // ── Reordenar ─────────────────────────────────────────────────────────────

  async reorderItems(routineId: string, items: RoutineItem[]): Promise<void> {
    const next = { ...this._detailResource.value()!, items };
    this._detailResource.set(next);
    await this.api.syncOrders(next);
  }

  async reorderSectionExercises(routineId: string, sectionId: string, exercises: Exercise[]): Promise<void> {
    this.patch(r => ({
      ...r,
      items: r.items.map(i => i.id === sectionId && i.type === 'section' ? { ...i, exercises } : i)
    }));
    const current = this._detailResource.value();
    if (current) await this.api.syncOrders(current);
  }

  async moveExercise(routineId: string, exerciseId: string, fromSectionId: string | null, toSectionId: string | null, toIndex: number): Promise<void> {
    this.patch(r => this._applyMove(r, exerciseId, fromSectionId, toSectionId, toIndex));
    const current = this._detailResource.value();
    if (current) await this.api.syncOrders(current);
  }

  private _applyMove(r: Routine, exerciseId: string, fromSectionId: string | null, toSectionId: string | null, toIndex: number): Routine {
    let exercise: Exercise | undefined;
    if (fromSectionId === null) {
      exercise = r.items.find(i => i.type === 'exercise' && i.id === exerciseId) as Exercise | undefined;
    } else {
      exercise = (r.items.find(i => i.id === fromSectionId) as Section | undefined)?.exercises.find(e => e.id === exerciseId);
    }
    if (!exercise) return r;

    let items: RoutineItem[] = fromSectionId === null
      ? r.items.filter(i => i.id !== exerciseId)
      : r.items.map(i => i.id === fromSectionId && i.type === 'section'
          ? { ...i, exercises: i.exercises.filter(e => e.id !== exerciseId) } : i);

    if (toSectionId === null) {
      items.splice(toIndex, 0, exercise);
    } else {
      items = items.map(i => {
        if (i.id !== toSectionId || i.type !== 'section') return i;
        const exs = [...i.exercises];
        exs.splice(toIndex, 0, exercise!);
        return { ...i, exercises: exs };
      });
    }
    return { ...r, items };
  }

  // ── Secciones ─────────────────────────────────────────────────────────────

  async addSection(routineId: string, name: string): Promise<void> {
    const id = crypto.randomUUID();
    const order = this._detailResource.value()?.items.length ?? 0;
    const section: Section = { id, type: 'section', name, exercises: [] };
    this.patch(r => ({ ...r, items: [...r.items, section] }));
    await this.api.addSection(routineId, id, name, order);
  }

  async updateSection(routineId: string, sectionId: string, name: string): Promise<void> {
    this.patch(r => ({
      ...r,
      items: r.items.map(i => i.id === sectionId && i.type === 'section' ? { ...i, name } : i)
    }));
    await this.api.updateSection(sectionId, name);
  }

  async deleteSection(routineId: string, sectionId: string): Promise<void> {
    const section = this._detailResource.value()?.items.find(i => i.id === sectionId) as Section | undefined;
    const deletedCount = section?.exercises.length ?? 0;
    this.patch(r => ({ ...r, items: r.items.filter(i => i.id !== sectionId) }));
    this._listResource.set(this.routines().map(r =>
      r.id === routineId ? { ...r, exerciseCount: Math.max(0, r.exerciseCount - deletedCount) } : r
    ));
    await this.api.deleteSection(sectionId);
  }

  // ── Ejercicios ────────────────────────────────────────────────────────────

  async addExercise(routineId: string, data: { name: string; videoUrl: string; notes?: string }, sectionId?: string): Promise<void> {
    const id = crypto.randomUUID();
    const exercise: Exercise = { id, type: 'exercise', ...data };
    const current = this._detailResource.value();

    if (sectionId) {
      const order = (current?.items.find(i => i.id === sectionId) as Section | undefined)?.exercises.length ?? 0;
      this.patch(r => ({
        ...r,
        items: r.items.map(i => i.id === sectionId && i.type === 'section'
          ? { ...i, exercises: [...i.exercises, exercise] } : i)
      }));
      await this.api.addExercise(id, routineId, sectionId, data, order);
    } else {
      const order = current?.items.length ?? 0;
      this.patch(r => ({ ...r, items: [...r.items, exercise] }));
      await this.api.addExercise(id, routineId, null, data, order);
    }

    this._listResource.set(this.routines().map(r =>
      r.id === routineId ? { ...r, exerciseCount: r.exerciseCount + 1 } : r
    ));
  }

  async updateExercise(routineId: string, exerciseId: string, data: { name: string; videoUrl: string; notes?: string }): Promise<void> {
    this.patch(r => ({
      ...r,
      items: r.items.map(i => {
        if (i.type === 'exercise' && i.id === exerciseId) return { ...i, ...data };
        if (i.type === 'section') return { ...i, exercises: i.exercises.map(e => e.id === exerciseId ? { ...e, ...data } : e) };
        return i;
      })
    }));
    await this.api.updateExercise(exerciseId, data);
  }

  async deleteExercise(routineId: string, exerciseId: string): Promise<void> {
    this.patch(r => ({
      ...r,
      items: r.items
        .filter(i => !(i.type === 'exercise' && i.id === exerciseId))
        .map(i => i.type === 'section' ? { ...i, exercises: i.exercises.filter(e => e.id !== exerciseId) } : i)
    }));
    this._listResource.set(this.routines().map(r =>
      r.id === routineId ? { ...r, exerciseCount: Math.max(0, r.exerciseCount - 1) } : r
    ));
    await this.api.deleteExercise(exerciseId);
  }
}
