import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';

import { addFoodEntry, deleteFoodEntry, listEntriesByDate, type AddEntryInput } from './repository';
import type { FoodEntry } from './types';

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
