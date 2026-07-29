import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';
import { AuthService } from '../../../core/auth.service';
import { Routine } from '../models/Routine';
import { RoutineSummary } from '../models/RoutineSummary';
import { RoutineItem } from '../models/RoutineItem';
import { Section } from '../models/Section';
import { Exercise } from '../models/Exercise';

type DbExercise = {
  id: string; name: string; video_url: string;
  notes: string | null; section_id: string | null;
  order: number; routine_id: string;
};

type DbSection = { id: string; name: string; order: number };

@Injectable({ providedIn: 'root' })
export class RoutinesApiService {
  private db = inject(SupabaseService).client;
  private auth = inject(AuthService);

  private get userId(): string {
    return this.auth.user()!.id;
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async getRoutines(): Promise<RoutineSummary[]> {
    const [{ data: routines, error: rErr }, { data: exercises, error: eErr }] = await Promise.all([
      this.db.from('routines').select('id, name').order('created_at'),
      this.db.from('exercises').select('routine_id')
    ]);
    if (rErr) throw rErr;
    if (eErr) throw eErr;

    const countMap = new Map<string, number>();
    for (const e of exercises!) {
      countMap.set(e.routine_id, (countMap.get(e.routine_id) ?? 0) + 1);
    }

    return routines!.map(r => ({ id: r.id, name: r.name, exerciseCount: countMap.get(r.id) ?? 0 }));
  }

  async createRoutine(name: string): Promise<RoutineSummary> {
    const { data, error } = await this.db
      .from('routines')
      .insert({ id: crypto.randomUUID(), name, user_id: this.userId })
      .select('id, name').single();
    if (error) throw error;
    return { ...data, exerciseCount: 0 };
  }

  async renameRoutine(id: string, name: string): Promise<void> {
    const { error } = await this.db.from('routines').update({ name }).eq('id', id);
    if (error) throw error;
  }

  async deleteRoutine(id: string): Promise<void> {
    const { error } = await this.db.from('routines').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Detail ────────────────────────────────────────────────────────────────

  async getRoutine(id: string): Promise<Routine> {
    const [{ data: r, error: rErr }, { data: sections, error: sErr }, { data: exercises, error: eErr }] =
      await Promise.all([
        this.db.from('routines').select('id, name').eq('id', id).single(),
        this.db.from('sections').select('*').eq('routine_id', id).order('order'),
        this.db.from('exercises').select('*').eq('routine_id', id).order('order')
      ]);
    if (rErr) throw rErr;
    if (sErr) throw sErr;
    if (eErr) throw eErr;
    return this.buildRoutine(r!, sections as DbSection[], exercises as DbExercise[]);
  }

  private buildRoutine(
    r: { id: string; name: string },
    sections: DbSection[],
    exercises: DbExercise[]
  ): Routine {
    const bySection = new Map<string, Exercise[]>();
    const rootItems: { order: number; item: RoutineItem }[] = [];

    for (const e of exercises) {
      const ex: Exercise = { id: e.id, type: 'exercise', name: e.name, videoUrl: e.video_url, notes: e.notes ?? undefined };
      if (e.section_id) {
        const list = bySection.get(e.section_id) ?? [];
        list.push(ex);
        bySection.set(e.section_id, list);
      } else {
        rootItems.push({ order: e.order, item: ex });
      }
    }

    for (const s of sections) {
      rootItems.push({
        order: s.order,
        item: { id: s.id, type: 'section', name: s.name, exercises: bySection.get(s.id) ?? [] } satisfies Section
      });
    }

    rootItems.sort((a, b) => a.order - b.order);
    return { id: r.id, name: r.name, items: rootItems.map(x => x.item) };
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  async addSection(routineId: string, id: string, name: string, order: number): Promise<void> {
    const { error } = await this.db.from('sections').insert({ id, routine_id: routineId, name, order });
    if (error) throw error;
  }

  async updateSection(id: string, name: string): Promise<void> {
    const { error } = await this.db.from('sections').update({ name }).eq('id', id);
    if (error) throw error;
  }

  async deleteSection(id: string): Promise<void> {
    const { error } = await this.db.from('sections').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Exercises ─────────────────────────────────────────────────────────────

  async addExercise(
    id: string, routineId: string, sectionId: string | null,
    data: { name: string; videoUrl: string; notes?: string }, order: number
  ): Promise<void> {
    const { error } = await this.db.from('exercises').insert({
      id, routine_id: routineId, section_id: sectionId,
      name: data.name, video_url: data.videoUrl, notes: data.notes ?? null, order
    });
    if (error) throw error;
  }

  async updateExercise(id: string, data: { name: string; videoUrl: string; notes?: string }): Promise<void> {
    const { error } = await this.db.from('exercises')
      .update({ name: data.name, video_url: data.videoUrl, notes: data.notes ?? null })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteExercise(id: string): Promise<void> {
    const { error } = await this.db.from('exercises').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Reorder (batch) ───────────────────────────────────────────────────────

  async syncOrders(routine: Routine): Promise<void> {
    const upd = async (table: 'sections' | 'exercises', id: string, data: object): Promise<void> => {
      const { error } = await this.db.from(table).update(data).eq('id', id);
      if (error) throw error;
    };

    const ops: Promise<void>[] = [];
    routine.items.forEach((item, idx) => {
      if (item.type === 'section') {
        ops.push(upd('sections', item.id, { order: idx }));
        item.exercises.forEach((ex, exIdx) => {
          ops.push(upd('exercises', ex.id, { section_id: item.id, order: exIdx }));
        });
      } else {
        ops.push(upd('exercises', item.id, { section_id: null, order: idx }));
      }
    });

    await Promise.all(ops);
  }
}
