import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';
import { WorkoutSession } from '../models/WorkoutSession';

@Injectable({ providedIn: 'root' })
export class SessionsApiService {
  private db = inject(SupabaseService).client;

  private map(r: any): WorkoutSession {
    return {
      id: r.id,
      routineId: r.routine_id,
      routineName: r.routine_name,
      routineEmoji: r.routine_emoji ?? undefined,
      startedAt: r.started_at,
      completedAt: r.completed_at ?? null,
    };
  }

  async startSession(routineId: string, routineName: string, routineEmoji?: string): Promise<WorkoutSession> {
    const { data: { user } } = await this.db.auth.getUser();
    const { data, error } = await this.db
      .from('workout_sessions')
      .insert({ user_id: user!.id, routine_id: routineId, routine_name: routineName, routine_emoji: routineEmoji ?? null })
      .select()
      .single();
    if (error) throw error;
    return this.map(data);
  }

  async completeSession(sessionId: string): Promise<WorkoutSession> {
    const { data, error } = await this.db
      .from('workout_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();
    if (error) throw error;
    return this.map(data);
  }

  async getRecentSessions(limit = 50): Promise<WorkoutSession[]> {
    const { data, error } = await this.db
      .from('workout_sessions')
      .select('*')
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(r => this.map(r));
  }
}
