import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';

import { getGoals, setGoals, type Goals } from './repository';

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: async () => getGoals() });
}

export function useSetGoals() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (goals: Goals) => setGoals(goals, user?.id ?? ''),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
