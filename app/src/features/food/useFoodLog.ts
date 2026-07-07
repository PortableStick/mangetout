import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';

import {
  addFoodEntry,
  addMealToJournal,
  deleteFoodEntry,
  listEntriesByDate,
  listFoods,
  listMeals,
  saveMeal,
  type AddEntryInput,
} from './repository';
import type { MealComponent } from './recipes';
import type { FoodEntry, MealType } from './types';

/** Date du jour au format YYYY-MM-DD (local). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useFoodEntries(date: string) {
  return useQuery({
    queryKey: ['food-entries', date],
    queryFn: async () => listEntriesByDate(date),
  });
}

export function useAddFoodEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<AddEntryInput, 'userId'>) =>
      addFoodEntry({ ...input, userId: user?.id ?? '' }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['food-entries', vars.date] });
    },
  });
}

export function useDeleteFoodEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (entry: FoodEntry) => deleteFoodEntry(entry, user?.id ?? ''),
    onSuccess: (_res, entry) => {
      void qc.invalidateQueries({ queryKey: ['food-entries', entry.date] });
    },
  });
}

export function useFoods() {
  return useQuery({ queryKey: ['foods'], queryFn: async () => listFoods() });
}

export function useMeals() {
  return useQuery({ queryKey: ['meals'], queryFn: async () => listMeals() });
}

export function useSaveMeal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { name: string; portions: number; components: MealComponent[] }) =>
      saveMeal({ ...input, userId: user?.id ?? '' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['meals'] });
      void qc.invalidateQueries({ queryKey: ['foods'] });
    },
  });
}

export function useAddMealToJournal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { mealId: string; mealType: MealType; date: string }) =>
      addMealToJournal(input.mealId, input.mealType, input.date, user?.id ?? ''),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['food-entries', vars.date] });
    },
  });
}
