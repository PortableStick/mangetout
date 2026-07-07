import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';

import { addWeightEntry, listWeightEntries } from './repository';

export function useWeightEntries() {
  return useQuery({ queryKey: ['weight-entries'], queryFn: async () => listWeightEntries() });
}

export function useAddWeightEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { date: string; weight_kg: number; measurements?: Record<string, number> }) =>
      addWeightEntry({ ...input, userId: user?.id ?? '' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['weight-entries'] });
    },
  });
}
