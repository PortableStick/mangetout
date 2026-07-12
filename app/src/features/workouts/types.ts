/** Séances, salles et équipements. */

import type { MetricKey, MetricSetKey } from './metrics';

export type GymType = 'chain' | 'home';

export type MuscleGroup =
  | 'legs'
  | 'glutes'
  | 'calves'
  | 'back'
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'abs'
  | 'fullbody'
  | 'cardio';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  legs: 'Jambes',
  glutes: 'Fessiers',
  calves: 'Mollets',
  back: 'Dos',
  chest: 'Pectoraux',
  shoulders: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  abs: 'Abdos',
  fullbody: 'Full body',
  cardio: 'Cardio',
};

export type EquipmentCategory = 'machine' | 'free_weight' | 'cardio' | 'functional';

export interface Gym {
  id: string;
  name: string;
  gymType: GymType;
}

export interface Equipment {
  id: string;
  gym: string; // gym id
  name: string;
  category: EquipmentCategory;
  muscleGroups: MuscleGroup[];
  /** Preset de champs de saisie de séries (défaut rétro-compat : 'strength'). */
  metricSet: MetricSetKey;
}

export type WorkoutStatus = 'planned' | 'in_progress' | 'done';
export type WorkoutSource = 'generated' | 'manual' | 'vision';

export interface Workout {
  id: string;
  at: string; // ISO datetime (source de vérité)
  date: string; // YYYY-MM-DD dérivé de `at` (conservé pour compat/affichage)
  gym: string; // gym id
  notes?: string;
  status: WorkoutStatus;
  source: WorkoutSource;
}

export interface Exercise {
  id: string;
  workout: string; // workout id
  equipment?: string; // equipment id
  name: string;
  position: number;
  source?: WorkoutSource; // provenance fine (optionnel)
}

export interface ExerciseSet {
  id: string;
  exercise: string; // exercise id
  /** Preset de champs (défaut rétro-compat : 'strength'). */
  metricSet: MetricSetKey;
  /** Valeurs saisies, une par `MetricField` du preset. */
  fields: Partial<Record<MetricKey, number | string>>;
  position: number;
}
