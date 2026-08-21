import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';
import { AuthService } from '../../../core/auth.service';
import { Routine } from '../models/Routine';
import { RoutineSummary, PublicRoutine } from '../models/RoutineSummary';
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
      this.db.from('routines').select('id, name, is_inbox, emoji, is_public, share_token').order('created_at'),
      this.db.from('exercises').select('routine_id')
    ]);
    if (rErr) throw rErr;

    const countMap = new Map<string, number>();
    for (const e of (eErr ? [] : exercises!)) {
      countMap.set(e.routine_id, (countMap.get(e.routine_id) ?? 0) + 1);
    }

    return routines!.map(r => ({
      id: r.id, name: r.name,
      isInbox: r.is_inbox ?? false,
      emoji: r.emoji ?? undefined,
      isPublic: r.is_public ?? false,
      shareToken: r.share_token ?? undefined,
      exerciseCount: countMap.get(r.id) ?? 0
    }));
  }

  async createRoutine(name: string, isInbox = false, emoji?: string): Promise<RoutineSummary> {
    const { data, error } = await this.db
      .from('routines')
      .insert({ id: crypto.randomUUID(), name, user_id: this.userId, is_inbox: isInbox, emoji: emoji ?? null })
      .select('id, name, is_inbox, emoji').single();
    if (error) throw error;
    return { id: data.id, name: data.name, isInbox: data.is_inbox ?? false, emoji: data.emoji ?? undefined, exerciseCount: 0 };
  }

  async ensureInboxRoutine(defaultName: string): Promise<RoutineSummary> {
    const { data, error } = await this.db
      .from('routines').select('id, name, is_inbox, emoji')
      .eq('is_inbox', true).maybeSingle();
    if (error) throw error;
    if (data) return { id: data.id, name: data.name, isInbox: true, emoji: data.emoji ?? undefined, exerciseCount: 0 };
    return this.createRoutine(defaultName, true);
  }

  async renameRoutine(id: string, name: string): Promise<void> {
    const { error } = await this.db.from('routines').update({ name }).eq('id', id);
    if (error) throw error;
  }

  async updateRoutineEmoji(id: string, emoji: string | null): Promise<void> {
    const { error } = await this.db.from('routines').update({ emoji }).eq('id', id);
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
        this.db.from('routines').select('id, name, is_public, share_token, emoji').eq('id', id).single(),
        this.db.from('sections').select('*').eq('routine_id', id).order('order'),
        this.db.from('exercises').select('*').eq('routine_id', id).order('order')
      ]);
    if (rErr) throw rErr;
    if (sErr) throw sErr;
    if (eErr) throw eErr;
    return this.buildRoutine(r!, sections as DbSection[], exercises as DbExercise[]);
  }

  async getPublicRoutineByToken(token: string): Promise<PublicRoutine | null> {
    const { data: r, error: rErr } = await this.db
      .from('routines').select('id, name, emoji, share_token')
      .eq('share_token', token).eq('is_public', true).maybeSingle();
    // Only a genuine miss returns null; a failed request must not be reported as a dead link.
    if (rErr) throw rErr;
    if (!r) return null;

    const [{ data: sections }, { data: exercises }, { count: likeCount }] = await Promise.all([
      this.db.from('sections').select('*').eq('routine_id', r.id).order('order'),
      this.db.from('exercises').select('*').eq('routine_id', r.id).order('order'),
      // head+count: a popular routine should not ship one row per like just to render a number
      this.db.from('routine_likes').select('id', { count: 'exact', head: true }).eq('routine_id', r.id)
    ]);

    const base = this.buildRoutine(r, (sections ?? []) as DbSection[], (exercises ?? []) as DbExercise[]);
    return {
      id: r.id, name: r.name,
      emoji: r.emoji ?? undefined,
      shareToken: r.share_token,
      isPublic: true,
      likeCount: likeCount ?? 0,
      items: base.items,
    };
  }

  async setPublic(id: string, isPublic: boolean): Promise<string | null> {
    const patch: Record<string, unknown> = { is_public: isPublic };
    if (!isPublic) patch['share_token'] = crypto.randomUUID();

    const { data, error } = await this.db
      .from('routines').update(patch).eq('id', id)
      .select('share_token').single();
    if (error) throw error;
    return data?.share_token ?? null;
  }

  async getLikedRoutines(): Promise<PublicRoutine[]> {
    const { data: likes, error: lErr } = await this.db
      .from('routine_likes').select('routine_id').eq('user_id', this.userId);
    if (lErr) throw lErr;
    if (!likes?.length) return [];

    const ids = likes.map((l: any) => l.routine_id);
    const { data: routines, error: rErr } = await this.db
      .from('routines').select('id, name, emoji, is_public, share_token').in('id', ids).eq('is_public', true);
    if (rErr) throw rErr;

    const counts = await this.getLikeCounts(ids);

    return (routines ?? []).map((r: any) => ({
      id: r.id, name: r.name,
      emoji: r.emoji ?? undefined,
      shareToken: r.share_token,
      isPublic: true,
      likeCount: counts.get(r.id) ?? 0,
    }));
  }

  private async getLikeCounts(routineIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const results = await Promise.all(routineIds.map(id =>
      this.db.from('routine_likes').select('id', { count: 'exact', head: true }).eq('routine_id', id)
    ));
    routineIds.forEach((id, i) => counts.set(id, results[i].count ?? 0));
    return counts;
  }

  async getMyLikedIds(): Promise<Set<string>> {
    const { data, error } = await this.db
      .from('routine_likes').select('routine_id').eq('user_id', this.userId);
    if (error) return new Set();
    return new Set((data ?? []).map((l: any) => l.routine_id));
  }

  async likeRoutine(routineId: string): Promise<void> {
    const { error } = await this.db.from('routine_likes')
      .insert({ routine_id: routineId, user_id: this.userId });
    if (error && error.code !== '23505') throw error; // 23505 = unique violation (already liked)
  }

  async unlikeRoutine(routineId: string): Promise<void> {
    const { error } = await this.db.from('routine_likes').delete()
      .eq('routine_id', routineId).eq('user_id', this.userId);
    if (error) throw error;
  }

  private buildRoutine(
    r: { id: string; name: string; is_public?: boolean; share_token?: string; emoji?: string | null },
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
    return {
      id: r.id, name: r.name,
      isPublic: r.is_public ?? false,
      shareToken: r.share_token ?? undefined,
      emoji: r.emoji ?? undefined,
      items: rootItems.map(x => x.item)
    };
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

  async getNextOrder(routineId: string, sectionId: string | null): Promise<number> {
    if (sectionId) {
      const { count } = await this.db.from('exercises')
        .select('id', { count: 'exact', head: true })
        .eq('routine_id', routineId).eq('section_id', sectionId);
      return count ?? 0;
    }

    const [{ count: exercises }, { count: sections }] = await Promise.all([
      this.db.from('exercises').select('id', { count: 'exact', head: true })
        .eq('routine_id', routineId).is('section_id', null),
      this.db.from('sections').select('id', { count: 'exact', head: true })
        .eq('routine_id', routineId)
    ]);
    return (exercises ?? 0) + (sections ?? 0);
  }

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

  /** Reparents an exercise. It lands at the root of the target routine, never inside a section. */
  async moveExerciseToRoutine(id: string, toRoutineId: string, order: number): Promise<void> {
    const { error } = await this.db.from('exercises')
      .update({ routine_id: toRoutineId, section_id: null, order })
      .eq('id', id);
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
