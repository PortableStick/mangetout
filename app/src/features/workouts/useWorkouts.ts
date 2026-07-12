import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';

import type { MetricSetKey } from './metrics';
import {
  addEquipment,
  addGym,
  createWorkout,
  deleteExercise,
  deleteGym,
  deleteSet,
  deleteWorkout,
  duplicateWorkout,
  listEquipment,
  listExercises,
  listGyms,
  listSets,
  listWorkouts,
  removeEquipment,
  seedDefaultGyms,
  updateEquipment,
  updateExercise,
  updateGym,
  updateSet,
  updateWorkout,
  type WorkoutDraft,
} from './repository';
import {
  MUSCLE_LABELS,
  type Equipment,
  type Exercise,
  type ExerciseSet,
  type GymType,
  type MuscleGroup,
  type Workout,
  type WorkoutSource,
  type WorkoutStatus,
} from './types';

/** Filtre des libellés IA vers des groupes musculaires valides. */
export function toMuscleGroups(raw: string[]): MuscleGroup[] {
  const valid = new Set(Object.keys(MUSCLE_LABELS));
  return raw.filter((m): m is MuscleGroup => valid.has(m));
}

export function useGyms() {
  return useQuery({ queryKey: ['gyms'], queryFn: async () => listGyms() });
}

export function useEquipment(gymId: string | undefined) {
  return useQuery({
    queryKey: ['equipment', gymId],
    queryFn: async () => (gymId ? listEquipment(gymId) : []),
    enabled: !!gymId,
  });
}

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => listWorkouts().map((w) => ({ ...w, exerciseCount: listExercises(w.id).length })),
  });
}

export function useSeedGyms() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => seedDefaultGyms(user?.id ?? ''),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['gyms'] });
      void qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useAddEquipment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: {
      gymId: string;
      name: string;
      category: Equipment['category'];
      muscleGroups: MuscleGroup[];
      metricSet: MetricSetKey;
    }) => addEquipment({ ...input, userId: user?.id ?? '' }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['equipment', vars.gymId] });
    },
  });
}

export function useAddGym() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { name: string; gymType: GymType }) =>
      addGym({ ...input, userId: user?.id ?? '' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
}

export function useUpdateGym() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { id: string; name: string; gymType: GymType }) =>
      updateGym({ ...input, userId: user?.id ?? '' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
}

export function useDeleteGym() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { id: string }) => deleteGym({ ...input, userId: user?.id ?? '' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['gyms'] });
      void qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: {
      id: string;
      gymId: string;
      name: string;
      category: Equipment['category'];
      muscleGroups: MuscleGroup[];
      metricSet: MetricSetKey;
    }) => updateEquipment({ ...input, userId: user?.id ?? '' }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['equipment', vars.gymId] });
    },
  });
}

export function useRemoveEquipment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { id: string; gymId: string }) =>
      removeEquipment({ id: input.id, userId: user?.id ?? '' }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['equipment', vars.gymId] });
    },
  });
}

export function useCreateWorkout() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (draft: Omit<WorkoutDraft, 'userId'>) =>
      createWorkout({ ...draft, userId: user?.id ?? '' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

/** Détail d'une séance : la séance + ses exercices, chacun avec ses séries. */
export function useWorkoutDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['workout', id],
    queryFn: async (): Promise<{
      workout: Workout | undefined;
      exercises: (Exercise & { sets: ExerciseSet[] })[];
    }> => {
      const workout = listWorkouts().find((w) => w.id === id);
      const exercises = listExercises(id ?? '').map((exercise) => ({
        ...exercise,
        sets: listSets(exercise.id),
      }));
      return { workout, exercises };
    },
    enabled: !!id,
  });
}

export function useUpdateWorkout() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: {
      id: string;
      at?: string;
      gym?: string;
      notes?: string;
      status?: WorkoutStatus;
      source?: WorkoutSource;
    }) => updateWorkout({ ...input, userId: user?.id ?? '' }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['workouts'] });
      void qc.invalidateQueries({ queryKey: ['workout', vars.id] });
    },
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { id: string }) => deleteWorkout({ id: input.id, userId: user?.id ?? '' }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['workouts'] });
      void qc.invalidateQueries({ queryKey: ['workout', vars.id] });
    },
  });
}

export function useDuplicateWorkout() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { id: string; at: string; status: WorkoutStatus }) =>
      duplicateWorkout({ ...input, userId: user?.id ?? '' }),
    onSuccess: (_newId, vars) => {
      void qc.invalidateQueries({ queryKey: ['workouts'] });
      void qc.invalidateQueries({ queryKey: ['workout', vars.id] });
    },
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: {
      id: string;
      workout: string;
      name?: string;
      equipment?: string;
      position?: number;
      source?: WorkoutSource;
    }) => updateExercise({ ...input, userId: user?.id ?? '' }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['workouts'] });
      void qc.invalidateQueries({ queryKey: ['workout', vars.workout] });
    },
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { id: string; workoutId: string }) =>
      deleteExercise({ id: input.id, userId: user?.id ?? '' }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['workouts'] });
      void qc.invalidateQueries({ queryKey: ['workout', vars.workoutId] });
    },
  });
}

export function useUpdateSet() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: {
      id: string;
      exercise: string;
      fields: Record<string, number | string>;
      position?: number;
      workoutId: string;
    }) =>
      updateSet({
        id: input.id,
        exercise: input.exercise,
        fields: input.fields,
        position: input.position,
        userId: user?.id ?? '',
      }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['workouts'] });
      void qc.invalidateQueries({ queryKey: ['workout', vars.workoutId] });
    },
  });
}

export function useDeleteSet() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { id: string; workoutId: string }) =>
      deleteSet({ id: input.id, userId: user?.id ?? '' }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['workouts'] });
      void qc.invalidateQueries({ queryKey: ['workout', vars.workoutId] });
    },
  });
}
