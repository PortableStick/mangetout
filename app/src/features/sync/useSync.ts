import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { getSyncManager } from '@/sync/manager';

/** Synchronisation manuelle (bouton Réglages). */
export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getSyncManager().syncAll(),
    onSuccess: () => {
      void qc.invalidateQueries(); // les données locales ont pu changer
    },
  });
}

/**
 * Synchronisation automatique : au montage (connecté) et à chaque retour au
 * premier plan. Le homelab est la source autoritaire ; hors-ligne = no-op gracieux.
 */
export function useAutoSync() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;
    const run = () => {
      void getSyncManager()
        .syncAll()
        .then(() => qc.invalidateQueries())
        .catch(() => undefined);
    };
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [isAuthenticated, qc]);
}
