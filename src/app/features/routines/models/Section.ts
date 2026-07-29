import { Exercise } from './Exercise';

export interface Section {
  id: string;
  type: 'section';
  name: string;
  exercises: Exercise[];
}
