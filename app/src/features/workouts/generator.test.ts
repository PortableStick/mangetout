import { describe, expect, it } from '@jest/globals';

import { generateWorkout } from './generator';
import type { Equipment } from './types';

const eq = (id: string, muscleGroups: Equipment['muscleGroups']): Equipment => ({
  id,
  gym: 'g1',
  name: id,
  category: 'machine',
  muscleGroups,
  metricSet: 'strength',
});

const gym: Equipment[] = [
  eq('chestPress', ['chest']),
  eq('pecDeck', ['chest']),
  eq('latPulldown', ['back', 'biceps']),
  eq('legPress', ['legs', 'glutes']),
  eq('treadmill', ['cardio']),
];

describe('generateWorkout', () => {
  it('ne propose que du matériel de la salle', () => {
    const ids = new Set(gym.map((e) => e.id));
    for (const e of generateWorkout(gym, { count: 5 })) {
      expect(ids.has(e.id)).toBe(true);
    }
  });

  it('respecte le nombre demandé', () => {
    expect(generateWorkout(gym, { count: 3 })).toHaveLength(3);
  });

  it('ne retient que les équipements couvrant les groupes ciblés', () => {
    const res = generateWorkout(gym, { targets: ['chest'], count: 5 });
    expect(res.every((e) => e.muscleGroups.includes('chest'))).toBe(true);
    expect(res.map((e) => e.id).sort()).toEqual(['chestPress', 'pecDeck']);
  });

  it('priorise la couverture de groupes distincts', () => {
    // Cible dos + jambes : doit d'abord prendre un équipement de chaque groupe.
    const res = generateWorkout(gym, { targets: ['back', 'legs'], count: 2 });
    const groups = new Set(res.flatMap((e) => e.muscleGroups));
    expect(groups.has('back')).toBe(true);
    expect(groups.has('legs')).toBe(true);
  });

  it('salle vide → aucune proposition', () => {
    expect(generateWorkout([], { count: 5 })).toEqual([]);
  });
});
