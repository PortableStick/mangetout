import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getHealthProvider } from './provider';
import { emptyDay, type DailyHealth } from './types';

/**
 * Hook neutre exposant les données santé du jour. Le reste de l'app ne dépend
 * QUE de cette interface — l'ajout d'Apple HealthKit sera transparent ici.
 */
export function useHealthData(date: string) {
  const provider = getHealthProvider();
  const qc = useQueryClient();

  const query = useQuery<DailyHealth>({
    queryKey: ['health', date],
    queryFn: async () => {
      if (!(await provider.isAvailable())) return emptyDay(date);
      return provider.getDailySummary(date);
    },
  });

  const permission = useMutation({
    mutationFn: () => provider.requestPermissions(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['health', date] });
    },
  });

  return {
    providerName: provider.name,
    summary: query.data ?? emptyDay(date),
    isLoading: query.isLoading,
    requestPermission: () => permission.mutate(),
    requesting: permission.isPending,
  };
}
