import { RoutineItem } from './RoutineItem';

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
}
