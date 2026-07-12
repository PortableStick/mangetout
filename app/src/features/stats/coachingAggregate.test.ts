import { describe, expect, it } from '@jest/globals';

import { buildCoachingRecos } from './coachingAggregate';

describe('buildCoachingRecos', () => {
  it('sans pesée : reco protéine info neutre (pas de crash), calorie présente', () => {
    const recos = buildCoachingRecos({
      intake_kcal: 1800,
      intake_protein_g: 90,
      goal_kcal: undefined,
      bodyweightKg: undefined,
      mode: 'maintain',
    });

    const protein = recos.find((r) => r.id === 'protein');
    expect(protein?.level).toBe('info');
    expect(protein?.source).toBe('issn');

    const calories = recos.find((r) => r.id === 'calories');
    expect(calories?.level).toBe('info');
    expect(calories?.source).toBe('nih');
  });

  it('avec pesée : délègue à proteinReco/calorieReco (ISSN/NIH)', () => {
    const recos = buildCoachingRecos({
      intake_kcal: 2500,
      intake_protein_g: 200,
      goal_kcal: 2000,
      bodyweightKg: 80,
      mode: 'gain',
    });

    const protein = recos.find((r) => r.id === 'protein');
    expect(protein?.level).toBe('info'); // proteinTarget(80,'gain') = [112,160] ; 200 > 160
    const calories = recos.find((r) => r.id === 'calories');
    expect(calories?.level).toBe('high'); // 2500 vs 2000 -> au-dessus
    expect(calories?.source).toBe('nih');
  });

  it('sans volume (pas encore chargé) : aucune reco de volume, pas de crash', () => {
    const recos = buildCoachingRecos({
      intake_kcal: 2000,
      intake_protein_g: 100,
      bodyweightKg: 70,
      mode: 'maintain',
    });

    expect(recos.every((r) => r.source !== 'acsm' && r.source !== 'rp_heuristic')).toBe(true);
  });

  it('avec volume : recos ACSM/RP avec muscles traduits en FR', () => {
    const recos = buildCoachingRecos({
      intake_kcal: 2000,
      intake_protein_g: 100,
      bodyweightKg: 70,
      mode: 'maintain',
      volume: {
        workouts: [{ id: 'w1', status: 'done' }],
        exercises: [{ workout: 'w1', equipment: 'barbell', setCount: 4 }],
        equipmentMuscles: { barbell: ['legs'] },
      },
    });

    const legReco = recos.find((r) => r.id === 'Jambes');
    expect(legReco).toBeDefined();
    expect(legReco?.message).toContain('Jambes');
    expect(legReco?.source).toBe('acsm');
  });

  it('avec volume vide (pas de séance) : pas de reco de volume, pas de crash', () => {
    const recos = buildCoachingRecos({
      intake_kcal: 2000,
      intake_protein_g: 100,
      bodyweightKg: 70,
      mode: 'maintain',
      volume: { workouts: [], exercises: [], equipmentMuscles: {} },
    });

    expect(recos.every((r) => r.source !== 'acsm' && r.source !== 'rp_heuristic')).toBe(true);
  });
});
