import { QueryClient } from '@tanstack/react-query';

/**
 * Client TanStack Query — orchestration cache + sync.
 * Offline-first : on garde les données en cache longtemps, la couche sync
 * (Milestone 2) réconcilie avec le homelab autoritaire.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
