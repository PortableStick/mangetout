import type { Equipment, MuscleGroup } from './types';

export interface GenerateOptions {
  /** Groupes musculaires visés (vide = tout le corps). */
  targets?: MuscleGroup[];
  /** Nombre d'exercices souhaité. */
  count?: number;
}

/**
 * Génère une sélection d'exercices À PARTIR DU MATÉRIEL DE LA SALLE UNIQUEMENT
 * (contrainte dure : rien n'est proposé qui ne soit dans `equipment`).
 * Déterministe (aucun hasard) : greedy maximisant la couverture des groupes ciblés.
 */
export function generateWorkout(equipment: Equipment[], options: GenerateOptions = {}): Equipment[] {
  const count = Math.max(1, options.count ?? 6);
  const targets = options.targets && options.targets.length > 0 ? options.targets : null;

  const candidates = equipment.filter((e) =>
    targets ? e.muscleGroups.some((m) => targets.includes(m)) : true
  );

  const pool = [...candidates];
  const selected: Equipment[] = [];
  const covered = new Set<MuscleGroup>();

  while (selected.length < count && pool.length > 0) {
    let bestIdx = 0;
    let bestGain = -1;
    for (let i = 0; i < pool.length; i++) {
      const relevant = pool[i]!.muscleGroups.filter((m) => (targets ? targets.includes(m) : true));
      const gain = relevant.filter((m) => !covered.has(m)).length;
      if (gain > bestGain) {
        bestGain = gain;
        bestIdx = i;
      }
    }
    const [picked] = pool.splice(bestIdx, 1);
    if (!picked) break;
    selected.push(picked);
    for (const m of picked.muscleGroups) {
      if (!targets || targets.includes(m)) covered.add(m);
    }
  }
  return selected;
}
