/**
 * Logique pure du déroulé d'une séance guidée (player) : construit la liste
 * ordonnée des steps exercice/repos, et permet de naviguer au step suivant.
 * Aucune dépendance React — testable en isolation.
 */

export interface PlayerStep {
  kind: 'exercise' | 'rest';
  exerciseIndex?: number; // défini si kind==='exercise'
  setIndex?: number; // index de la série dans l'exercice (kind==='exercise')
  seconds?: number; // durée du repos (kind==='rest')
  label?: string; // libellé lisible optionnel (nom exo / "Repos")
}

export interface PlayerExercise {
  name: string;
  setCount: number;
}

const DEFAULT_REST_SECONDS = 90;

export function buildPlayerPlan(
  exercises: PlayerExercise[],
  opts?: { restSeconds?: number }
): PlayerStep[] {
  const restSeconds = opts?.restSeconds ?? DEFAULT_REST_SECONDS;
  const plan: PlayerStep[] = [];

  exercises.forEach((exercise, exerciseIndex) => {
    for (let setIndex = 0; setIndex < exercise.setCount; setIndex++) {
      const lastStep = plan[plan.length - 1];
      if (lastStep?.kind === 'exercise') {
        plan.push({ kind: 'rest', seconds: restSeconds, label: 'Repos' });
      }
      plan.push({
        kind: 'exercise',
        exerciseIndex,
        setIndex,
        label: exercise.name,
      });
    }
  });

  return plan;
}

export function nextStep(plan: PlayerStep[], current: number): number | null {
  const next = current + 1;
  return next < plan.length ? next : null;
}
