import { Injectable, inject, signal, computed, resource } from '@angular/core';
import { SessionsApiService } from '../services/sessions-api.service';
import { AuthService } from '../../../core/auth.service';
import { WorkoutSession } from '../models/WorkoutSession';

@Injectable({ providedIn: 'root' })
export class SessionsStore {
  private api = inject(SessionsApiService);
  private auth = inject(AuthService);

  activeSession = signal<WorkoutSession | null>(null);

  private _sessionsResource = resource({
    params: () => this.auth.user()?.id,
    loader: () => this.api.getRecentSessions()
  });

  readonly sessions = computed(() => this._sessionsResource.value() ?? []);
  readonly loading = this._sessionsResource.isLoading;

  async startSession(routineId: string, routineName: string, routineEmoji?: string): Promise<void> {
    const session = await this.api.startSession(routineId, routineName, routineEmoji);
    this.activeSession.set(session);
  }

  async completeSession(): Promise<void> {
    const active = this.activeSession();
    if (!active) return;
    const completed = await this.api.completeSession(active.id);
    this.activeSession.set(null);
    this._sessionsResource.set([completed, ...this.sessions()]);
  }

  cancelSession(): void {
    this.activeSession.set(null);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  readonly streak = computed(() => {
    const sessions = this.sessions();
    if (!sessions.length) return 0;

    const today = startOfDay(new Date());
    const days = new Set(sessions.map(s => startOfDay(new Date(s.startedAt)).getTime()));

    let streak = 0;
    let cursor = today.getTime();

    if (!days.has(cursor)) {
      cursor -= 86400000; // check yesterday
      if (!days.has(cursor)) return 0;
    }

    while (days.has(cursor)) {
      streak++;
      cursor -= 86400000;
    }
    return streak;
  });

  readonly weekSessions = computed(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return this.sessions().filter(s => new Date(s.startedAt) >= monday);
  });

  readonly weekDays = computed(() => {
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sessionDays = new Set(
      this.sessions()
        .filter(s => new Date(s.startedAt) >= monday)
        .map(s => startOfDay(new Date(s.startedAt)).getTime())
    );

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { date: d, active: sessionDays.has(d.getTime()) };
    });
  });

  readonly topRoutines = computed(() => {
    const counts = new Map<string, { name: string; emoji?: string; count: number }>();
    for (const s of this.sessions()) {
      const key = s.routineId;
      const existing = counts.get(key);
      if (existing) existing.count++;
      else counts.set(key, { name: s.routineName, emoji: s.routineEmoji, count: 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  });
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
