import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';

import {
  createWorkout,
  listEquipment,
  listExercises,
  listGyms,
  listWorkouts,
  seedDefaultGyms,
  type WorkoutDraft,
} from './repository';

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
