/**
 * Agrégation PURE (sans React, sans I/O) qui câble les heuristiques de `coaching.ts` aux
 * données déjà chargées par les hooks. Séparé de `useCoaching.ts` pour rester testable sans
 * charger la chaîne de dépendances des repositories (sync/db/PocketBase) : ce module n'importe
 * que des modules purs (`./coaching`, `../workouts/types`).
 */
import {
  calorieReco,
  proteinReco,
  volumeRecos,
  weeklySetsByMuscle,
  type GoalMode,
  type Reco,
  type RecoLevel,
  type RecoSource,
} from './coaching';
import { MUSCLE_LABELS, type MuscleGroup } from '@/features/workouts/types';

/** Teinte de `Badge` par niveau de reco. */
export const RECO_LEVEL_TONE: Record<RecoLevel, 'success' | 'warning' | 'danger' | 'neutral'> = {
  good: 'success',
  low: 'warning',
  high: 'danger',
  info: 'neutral',
};

/** Libellé FR court par niveau de reco. */
export const RECO_LEVEL_LABEL: Record<RecoLevel, string> = {
  good: 'Bon',
  low: 'Faible',
  high: 'Élevé',
  info: 'Info',
};

/** Libellé FR de la source d'une reco (affiché en petit sous le message, jamais masqué). */
export const RECO_SOURCE_LABEL: Record<RecoSource, string> = {
  acsm: 'ACSM',
  issn: 'ISSN',
  nih: 'NIH',
  rp_heuristic: 'RP (heuristique)',
  user_override: 'réglage perso',
};

export interface WeeklyVolumeInput {
  workouts: { id: string; status: string }[];
  exercises: { workout: string; equipment?: string; setCount: number }[];
  equipmentMuscles: Record<string, string[]>;
}

export interface CoachingInputs {
  intake_kcal: number;
  intake_protein_g: number;
  goal_kcal?: number;
  bodyweightKg?: number;
  mode: GoalMode;
  /** Absent = pas encore chargé ; recos de volume non calculées dans ce cas (pas de crash). */
  volume?: WeeklyVolumeInput;
}

/**
 * Construit la liste de `Reco` à partir de données déjà agrégées.
 * Gère les cas « pas de données » (pas de pesée, pas de séance) sans planter, en renvoyant
 * des recos `info` neutres à la place.
 */
export function buildCoachingRecos(input: CoachingInputs): Reco[] {
  const recos: Reco[] = [];

  if (input.bodyweightKg !== undefined) {
    recos.push(proteinReco(input.intake_protein_g, input.bodyweightKg, input.mode));
  } else {
    recos.push({
      id: 'protein',
      level: 'info',
      message: 'Ajoute une pesée pour une recommandation de protéines (ISSN).',
      source: 'issn',
    });
  }

  recos.push(calorieReco(input.intake_kcal, input.goal_kcal, input.mode));

  if (input.volume) {
    const setsByMuscle = weeklySetsByMuscle(input.volume.workouts, input.volume.exercises, input.volume.equipmentMuscles);
    // Muscles traduits en FR avant de générer les messages (coaching.ts reste agnostique de la langue).
    const setsByMuscleLabel = Object.fromEntries(
      Object.entries(setsByMuscle).map(([muscle, sets]) => [MUSCLE_LABELS[muscle as MuscleGroup] ?? muscle, sets])
    );
    recos.push(...volumeRecos(setsByMuscleLabel));
  }

  return recos;
}
