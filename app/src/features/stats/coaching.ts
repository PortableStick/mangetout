/**
 * Heuristiques de coaching — module PUR, sans React.
 *
 * Sources (rappel, pas de citation exhaustive ici) :
 * - ACSM (American College of Sports Medicine) : volume d'entraînement hebdomadaire.
 * - ISSN (International Society of Sports Nutrition) : apport protéique.
 * - NIH : ordres de grandeur caloriques pour prise/perte de poids.
 * - RP heuristic : repère de volume maximal récupérable (Renaissance Periodization), informatif.
 *
 * IMPORTANT : ce module ne fait AUCUNE prédiction individuelle (pas de date d'objectif,
 * pas de gain projeté, pas de résultat garanti). Les fonctions renvoient des constats
 * factuels sur des données passées/actuelles uniquement.
 */

export type RecoLevel = 'good' | 'low' | 'high' | 'info';
export type RecoSource = 'acsm' | 'issn' | 'nih' | 'rp_heuristic' | 'user_override';

export interface Reco {
  id: string;
  level: RecoLevel;
  message: string;
  source: RecoSource;
}

export type GoalMode = 'gain' | 'cut' | 'maintain';

const ACSM_MIN_SETS_PER_WEEK = 10;
const RP_HIGH_VOLUME_THRESHOLD = 20;

// --- Volume ---------------------------------------------------------------

/** Compte les séries/semaine par groupe musculaire, pour les workouts au statut 'done' uniquement. */
export function weeklySetsByMuscle(
  workouts: { id: string; status: string }[],
  exercises: { workout: string; equipment?: string; setCount: number }[],
  equipmentMuscles: Record<string, string[]>
): Record<string, number> {
  const doneWorkoutIds = new Set(workouts.filter((w) => w.status === 'done').map((w) => w.id));
  const result: Record<string, number> = {};

  for (const exercise of exercises) {
    if (!doneWorkoutIds.has(exercise.workout)) continue;
    if (!exercise.equipment) continue;
    const muscles = equipmentMuscles[exercise.equipment];
    if (!muscles) continue;
    for (const muscle of muscles) {
      result[muscle] = (result[muscle] ?? 0) + exercise.setCount;
    }
  }

  return result;
}

/** Recos de volume par muscle, seuils ACSM (>=10/sem) et repère RP (>20/sem). */
export function volumeRecos(setsByMuscle: Record<string, number>): Reco[] {
  return Object.entries(setsByMuscle).map(([muscle, sets]) => {
    if (sets < ACSM_MIN_SETS_PER_WEEK) {
      return {
        id: muscle,
        level: 'low',
        message: `${muscle} : ${sets} séries/sem, sous le volume cible ACSM (≥10 séries/sem)`,
        source: 'acsm',
      };
    }
    if (sets > RP_HIGH_VOLUME_THRESHOLD) {
      return {
        id: muscle,
        level: 'info',
        message: `${muscle} : ${sets} séries/sem, proche/au-delà d'un volume élevé (heuristique RP MRV)`,
        source: 'rp_heuristic',
      };
    }
    return {
      id: muscle,
      level: 'good',
      message: `${muscle} : ${sets} séries/sem, dans la fourchette cible ACSM (10-20 séries/sem)`,
      source: 'acsm',
    };
  });
}

// --- Protéines (ISSN) -------------------------------------------------------

/** Fourchette de protéines (g/j) recommandée par l'ISSN selon le mode. */
export function proteinTarget(bodyweightKg: number, mode: GoalMode): { min: number; max: number } {
  const [minFactor, maxFactor] = mode === 'cut' ? [2.3, 3.1] : [1.4, 2.0];
  return {
    min: Math.round(minFactor * bodyweightKg),
    max: Math.round(maxFactor * bodyweightKg),
  };
}

export function proteinReco(intake_g: number, bodyweightKg: number, mode: GoalMode): Reco {
  const { min, max } = proteinTarget(bodyweightKg, mode);

  if (intake_g < min) {
    return {
      id: 'protein',
      level: 'low',
      message: `Apport protéique de ${Math.round(intake_g)}g, sous la fourchette ISSN (${min}-${max}g/j)`,
      source: 'issn',
    };
  }
  if (intake_g > max) {
    return {
      id: 'protein',
      level: 'info',
      message: `Apport protéique de ${Math.round(intake_g)}g, au-delà de la fourchette utile, sans risque connu`,
      source: 'issn',
    };
  }
  return {
    id: 'protein',
    level: 'good',
    message: `Apport protéique de ${Math.round(intake_g)}g, dans la fourchette ISSN (${min}-${max}g/j)`,
    source: 'issn',
  };
}

// --- Calories (NIH) ---------------------------------------------------------

const CALORIE_TOLERANCE_KCAL = 100;

export function calorieReco(
  intake_kcal: number,
  goal_kcal: number | undefined,
  mode: GoalMode
): Reco {
  if (goal_kcal === undefined) {
    const messageByMode: Record<GoalMode, string> = {
      cut: "Repère NIH : un déficit d'environ 500 kcal/j favorise une perte de gras progressive",
      gain: 'Repère NIH : un surplus de 250 à 500 kcal/j favorise une prise de masse progressive',
      maintain: "Repère NIH : viser un apport proche de vos dépenses pour maintenir le poids",
    };
    return {
      id: 'calories',
      level: 'info',
      message: messageByMode[mode],
      source: 'nih',
    };
  }

  const delta = intake_kcal - goal_kcal;

  if (delta < -CALORIE_TOLERANCE_KCAL) {
    return {
      id: 'calories',
      level: 'low',
      message: `Apport de ${Math.round(intake_kcal)} kcal, sous l'objectif de ${Math.round(goal_kcal)} kcal`,
      source: 'nih',
    };
  }
  if (delta > CALORIE_TOLERANCE_KCAL) {
    // En mode gain, un surplus au-dessus de l'objectif est le résultat attendu (pas un excès à
    // corriger) : ne pas le signaler en 'high' (rendu rouge/danger côté UI).
    if (mode === 'gain') {
      return {
        id: 'calories',
        level: 'good',
        message: `Apport de ${Math.round(intake_kcal)} kcal, au-dessus de l'objectif de ${Math.round(goal_kcal)} kcal — cohérent avec une prise de masse`,
        source: 'nih',
      };
    }
    return {
      id: 'calories',
      level: 'high',
      message: `Apport de ${Math.round(intake_kcal)} kcal, au-dessus de l'objectif de ${Math.round(goal_kcal)} kcal`,
      source: 'nih',
    };
  }
  return {
    id: 'calories',
    level: 'good',
    message: `Apport de ${Math.round(intake_kcal)} kcal, proche de l'objectif de ${Math.round(goal_kcal)} kcal`,
    source: 'nih',
  };
}

// --- Poids -------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Moyenne mobile 7 jours + tendance (kg/semaine) à partir des points disponibles.
 * Ne renvoie JAMAIS de date/objectif projeté : uniquement des constats sur le passé.
 */
export function weightTrend(
  entries: { date: string; weight_kg: number }[]
): { avg7: number | null; deltaPerWeek: number | null } {
  if (entries.length === 0) {
    return { avg7: null, deltaPerWeek: null };
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const lastEntry = sorted[sorted.length - 1] as { date: string; weight_kg: number };
  const lastTime = new Date(`${lastEntry.date}T00:00:00.000Z`).getTime();

  const last7 = sorted.filter((e) => {
    const t = new Date(`${e.date}T00:00:00.000Z`).getTime();
    return lastTime - t < 7 * MS_PER_DAY;
  });
  const avg7 =
    last7.length > 0
      ? Math.round((last7.reduce((sum, e) => sum + e.weight_kg, 0) / last7.length) * 10) / 10
      : null;

  if (sorted.length < 2) {
    return { avg7, deltaPerWeek: null };
  }

  const first = sorted[0] as { date: string; weight_kg: number };
  const last = lastEntry;
  const firstTime = new Date(`${first.date}T00:00:00.000Z`).getTime();
  const daysSpan = (lastTime - firstTime) / MS_PER_DAY;

  if (daysSpan <= 0) {
    return { avg7, deltaPerWeek: null };
  }

  const totalDelta = last.weight_kg - first.weight_kg;
  const deltaPerWeek = Math.round((totalDelta / daysSpan) * 7 * 100) / 100;

  return { avg7, deltaPerWeek };
}
