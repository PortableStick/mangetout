/**
 * Volume d'entraînement — logique PURE partagée entre le dashboard (`useWeeklyVolumeKg`,
 * `app/(tabs)/index.tsx`) et le coaching (`useCoaching.ts`), pour éviter que le filtre
 * « séances `done` des 7 derniers jours » ne diverge entre les deux (bug historique : le
 * dashboard ignorait `added_weight_kg`/`assist_weight_kg`).
 */
import type { MetricSetKey } from './metrics';
import { listAllExercises, listAllSets, listWorkouts } from './repository';
import type { ExerciseSet, Workout } from './types';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Clé de poids pertinente pour un `metricSet` donné (même résolution que `exerciseSummary`
 * du dashboard — centralisée ici pour ne pas diverger). */
export function weightKeyFor(metricSet: MetricSetKey): 'weight_kg' | 'added_weight_kg' | 'assist_weight_kg' {
  if (metricSet === 'bodyweight') return 'added_weight_kg';
  if (metricSet === 'assisted') return 'assist_weight_kg';
  return 'weight_kg';
}

/** Séances `done` dont `at` tombe dans la fenêtre `[sinceMs, now]`. */
export function doneWorkoutsSince(sinceMs: number, now: number = Date.now()): Workout[] {
  return listWorkouts().filter((w) => {
    if (w.status !== 'done') return false;
    const t = new Date(w.at).getTime();
    return Number.isFinite(t) && t <= now && t >= sinceMs;
  });
}

/**
 * Volume hebdo (Σ reps × charge) des séries des séances `done` des 7 derniers jours.
 *
 * Résolution de la clé de poids par `metricSet` (cf. `weightKeyFor`) :
 * - `strength`   → `reps × weight_kg`.
 * - `bodyweight` → `reps × added_weight_kg` SI un lest est renseigné ; sinon la série est
 *   **ignorée** (ni comptée à 0, ni exclue du calcul global — juste absente de la somme) : le
 *   poids de corps de l'utilisateur n'est pas connu ici, donc la « charge » réelle est indéterminée,
 *   pas nulle. La compter à 0 fausserait un volume mesuré à la baisse en le confondant avec une
 *   vraie série à charge nulle.
 * - `assisted`   → toujours **ignorée** : l'assistance RÉDUIT la charge effective (poids de corps
 *   moins assistance). Sans connaître le poids de corps, additionner `assist_weight_kg` tel quel
 *   compterait l'assistance comme un ajout de charge, ce qui est FAUX. Défensif : mieux vaut sous-
 *   compter (ignorer) que sur-compter (ajouter une charge inversée).
 *
 * Efficacité : ne re-scanne pas `exercises`/`sets` par séance (évite le N+1 de
 * `listExercises`/`listSets` appelés en boucle). Charge chaque table UNE seule fois via
 * `listAllExercises`/`listAllSets`, puis regroupe en mémoire par `workout`/`exercise`.
 *
 * @returns `null` si aucune séance dans la fenêtre, ou si aucune série exploitable
 * (aucune `strength`/`bodyweight` avec charge renseignée).
 */
export function weeklyVolumeKg(now: number = Date.now()): number | null {
  const workouts = doneWorkoutsSince(now - 7 * MS_PER_DAY, now);
  if (workouts.length === 0) return null;

  const workoutIds = new Set(workouts.map((w) => w.id));

  const exerciseIdsInWindow = new Set<string>();
  for (const exercise of listAllExercises()) {
    if (workoutIds.has(exercise.workout)) exerciseIdsInWindow.add(exercise.id);
  }

  const setsByExercise = new Map<string, ExerciseSet[]>();
  for (const set of listAllSets()) {
    if (!exerciseIdsInWindow.has(set.exercise)) continue;
    const list = setsByExercise.get(set.exercise);
    if (list) list.push(set);
    else setsByExercise.set(set.exercise, [set]);
  }

  let total = 0;
  let hasData = false;

  for (const sets of setsByExercise.values()) {
    for (const set of sets) {
      if (set.metricSet === 'assisted') continue; // cf. doc ci-dessus
      if (set.metricSet === 'bodyweight' && set.fields.added_weight_kg === undefined) continue;

      const reps = Number(set.fields.reps);
      const weight = Number(set.fields[weightKeyFor(set.metricSet)]);
      if (!Number.isFinite(reps) || !Number.isFinite(weight)) continue;

      total += reps * weight;
      hasData = true;
    }
  }

  return hasData ? total : null;
}
