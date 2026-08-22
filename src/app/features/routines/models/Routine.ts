import { RoutineItem } from './RoutineItem';

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
  isPublic?: boolean;
  shareToken?: string;
  emoji?: string;
  isInbox?: boolean;
}
