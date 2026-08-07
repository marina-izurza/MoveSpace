export interface RoutineSummary {
  id: string;
  name: string;
  exerciseCount: number;
  isInbox: boolean;
  emoji?: string;
  isPublic?: boolean;
  shareToken?: string;
}

export interface PublicRoutine {
  id: string;
  name: string;
  emoji?: string;
  shareToken: string;
  likeCount: number;
  isPublic: boolean;
  items?: import('./RoutineItem').RoutineItem[];
}
