/**
 * Hook d'agrégation : câble les heuristiques pures de `coaching.ts` (via `coachingAggregate.ts`)
 * aux sources de données (alimentation du jour, dernière pesée, objectifs, volume d'entraînement
 * hebdo) pour produire les `Reco[]` affichées sur le dashboard.
 *
 * Approximations documentées (acceptées, cf. brief Task 19.2) :
 * - Macros : agrégées sur le JOUR courant uniquement (pas de moyenne/somme hebdomadaire).
 * - Volume d'entraînement : fenêtre glissante des 7 derniers jours (`now - 7j` → `now`), pas une
 *   semaine calendaire (lundi→dimanche) — plus simple, suffisant pour un repère de tendance.
 * - Poids corporel : dernière pesée connue (peut être ancienne si l'utilisateur ne se pèse plus).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { sumMacros } from '@/features/food/nutrition';
import { today, useFoodEntries } from '@/features/food/useFoodLog';
import { useGoals } from '@/features/goals/useGoals';
import { useWeightEntries } from '@/features/weight/useWeight';
import { weightStats } from '@/features/weight/weight';
import { listEquipment, listExercises, listGyms, listSets } from '@/features/workouts/repository';
import { doneWorkoutsSince } from '@/features/workouts/volume';

import { buildCoachingRecos, type WeeklyVolumeInput } from './coachingAggregate';
import type { GoalMode, Reco } from './coaching';

export {
  RECO_LEVEL_LABEL,
  RECO_LEVEL_TONE,
  RECO_SOURCE_LABEL,
  buildCoachingRecos,
  type CoachingInputs,
  type WeeklyVolumeInput,
} from './coachingAggregate';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Volume hebdo d'entraînement (séances `done` des 7 derniers jours) + correspondance
 * équipement -> groupes musculaires, toutes salles confondues. Lectures locales synchrones
 * (mêmes fonctions repository que `useWorkoutDetail`), simplement enveloppées dans une query.
 */
function useWeeklyWorkoutVolume() {
  return useQuery({
    queryKey: ['coaching-weekly-volume'],
    queryFn: async (): Promise<WeeklyVolumeInput> => {
      const now = Date.now();
      const workouts = doneWorkoutsSince(now - 7 * MS_PER_DAY, now);

      const exercises = workouts.flatMap((w) =>
        listExercises(w.id).map((e) => ({
          workout: e.workout,
          equipment: e.equipment,
          setCount: listSets(e.id).length,
        }))
      );

      const equipmentMuscles: Record<string, string[]> = {};
      for (const gym of listGyms()) {
        for (const equipment of listEquipment(gym.id)) {
          equipmentMuscles[equipment.id] = equipment.muscleGroups;
        }
      }

      return {
        workouts: workouts.map((w) => ({ id: w.id, status: w.status })),
        exercises,
        equipmentMuscles,
      };
    },
  });
}

/** Agrège les sources de données du dashboard et produit les `Reco[]` de la carte « Coaching ». */
export function useCoaching(): { recos: Reco[]; mode: GoalMode } {
  const { data: goals } = useGoals();
  const { data: entries = [] } = useFoodEntries(today());
  const { data: weightEntries = [] } = useWeightEntries();
  const { data: volume } = useWeeklyWorkoutVolume();

  const mode: GoalMode = goals?.mode ?? 'maintain';
  const totals = sumMacros(entries);
  const bodyweightKg = weightStats(weightEntries).latest;

  const recos = useMemo(
    () =>
      buildCoachingRecos({
        intake_kcal: totals.kcal,
        intake_protein_g: totals.protein_g,
        goal_kcal: goals?.kcal,
        bodyweightKg,
        mode,
        volume,
      }),
    [totals.kcal, totals.protein_g, goals?.kcal, bodyweightKg, mode, volume]
  );

  return { recos, mode };
}
