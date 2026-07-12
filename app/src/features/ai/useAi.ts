import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Macros } from '@/features/food/types';
import { getSyncManager } from '@/sync/manager';

import { aiPost } from './client';

export interface ParsedFoodItem {
  name: string;
  quantity_g: number;
  macros: Macros;
}

/** Log alimentaire en langage naturel → items structurés (macros estimées). */
export function useParseFood() {
  return useMutation({
    mutationFn: (text: string) => aiPost<{ items: ParsedFoodItem[] }>('parse-food', { text }),
  });
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export type CoachResult =
  | { type: 'message'; text: string }
  | { type: 'proposal'; tool: string; args: unknown; summary: string }
  | { type: 'error'; error: string };

/** Un tour de coach : envoie l'historique, reçoit message OU proposition d'action. */
export function useCoach() {
  return useMutation({
    mutationFn: (messages: ChatTurn[]) => aiPost<CoachResult>('coach', { messages }),
  });
}

/** Applique une action coach CONFIRMÉE (owner-scoped côté serveur). */
export function useApplyAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tool: string; args: unknown }) =>
      aiPost<{ ok: boolean; id?: string; error?: string }>('coach/apply', input),
    onSuccess: async () => {
      // Rapatrie les changements serveur (PocketBase autoritaire) dans le cache local avant d'invalider.
      await getSyncManager().syncAll().catch(() => undefined);
      void qc.invalidateQueries();
    },
  });
}
