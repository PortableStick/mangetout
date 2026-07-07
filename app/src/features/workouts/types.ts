/** Séances, salles et équipements. */

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
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  gym: string; // gym id
  notes?: string;
}

export interface Exercise {
  id: string;
  workout: string; // workout id
  equipment?: string; // equipment id
  name: string;
  position: number;
}

export interface ExerciseSet {
  id: string;
  exercise: string; // exercise id
  reps: number;
  weight_kg: number;
  position: number;
}
