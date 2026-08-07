export interface WorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  routineEmoji?: string;
  startedAt: string;
  completedAt: string | null;
}

export function sessionDurationSeconds(s: WorkoutSession): number | null {
  if (!s.completedAt) return null;
  return Math.round((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 1000);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min${s > 0 ? ` ${s} s` : ''}` : `${s} s`;
}
