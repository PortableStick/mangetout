import { describe, expect, it } from '@jest/globals';

import {
  calorieReco,
  proteinReco,
  proteinTarget,
  type Reco,
  volumeRecos,
  weeklySetsByMuscle,
  weightTrend,
} from './coaching';

const VALID_SOURCES = ['acsm', 'issn', 'nih', 'rp_heuristic', 'user_override'];

describe('weeklySetsByMuscle', () => {
  it('additionne les séries par groupe musculaire, seulement pour les workouts "done"', () => {
    const workouts = [
      { id: 'w1', status: 'done' },
      { id: 'w2', status: 'planned' },
    ];
    const exercises = [
      { workout: 'w1', equipment: 'barbell', setCount: 4 },
      { workout: 'w1', equipment: 'dumbbell', setCount: 3 },
      { workout: 'w2', equipment: 'barbell', setCount: 10 },
    ];
    const equipmentMuscles: Record<string, string[]> = {
      barbell: ['chest', 'triceps'],
      dumbbell: ['chest'],
    };

    const result = weeklySetsByMuscle(workouts, exercises, equipmentMuscles);

    expect(result).toEqual({ chest: 7, triceps: 4 });
  });

  it('ignore les exercices sans équipement connu', () => {
    const workouts = [{ id: 'w1', status: 'done' }];
    const exercises = [{ workout: 'w1', setCount: 5 }];
    const result = weeklySetsByMuscle(workouts, exercises, {});
    expect(result).toEqual({});
  });
});

describe('volumeRecos', () => {
  it('sous le seuil ACSM (<10) -> low', () => {
    const [reco] = volumeRecos({ chest: 9 });
    expect(reco).toBeDefined();
    expect(reco?.level).toBe('low');
    expect(reco?.source).toBe('acsm');
    expect(reco?.message).toMatch(/ACSM/);
  });

  it('dans la fourchette (10-20) -> good', () => {
    const [reco] = volumeRecos({ chest: 12 });
    expect(reco?.level).toBe('good');
    expect(reco?.source).toBe('acsm');
  });

  it('à la borne basse (10) -> good', () => {
    const [reco] = volumeRecos({ chest: 10 });
    expect(reco?.level).toBe('good');
  });

  it('à la borne haute (20) -> good', () => {
    const [reco] = volumeRecos({ chest: 20 });
    expect(reco?.level).toBe('good');
  });

  it('au-delà (>20) -> info, source rp_heuristic', () => {
    const [reco] = volumeRecos({ chest: 25 });
    expect(reco?.level).toBe('info');
    expect(reco?.source).toBe('rp_heuristic');
    expect(reco?.message).toMatch(/RP/);
  });

  it('une reco par muscle', () => {
    const recos = volumeRecos({ chest: 9, back: 15, legs: 25 });
    expect(recos).toHaveLength(3);
    const byMuscle: Record<string, Reco> = Object.fromEntries(recos.map((r) => [r.id, r]));
    expect(byMuscle.chest?.level).toBe('low');
    expect(byMuscle.back?.level).toBe('good');
    expect(byMuscle.legs?.level).toBe('info');
  });
});

describe('proteinTarget', () => {
  it('gain -> [1.4*bw, 2.0*bw]', () => {
    expect(proteinTarget(80, 'gain')).toEqual({ min: 112, max: 160 });
  });

  it('maintain -> [1.4*bw, 2.0*bw]', () => {
    expect(proteinTarget(70, 'maintain')).toEqual({ min: 98, max: 140 });
  });

  it('cut -> [2.3*bw, 3.1*bw]', () => {
    expect(proteinTarget(70, 'cut')).toEqual({ min: 161, max: 217 });
  });
});

describe('proteinReco', () => {
  it('en dessous du min -> low, source issn', () => {
    const reco = proteinReco(90, 80, 'gain'); // min=112
    expect(reco.level).toBe('low');
    expect(reco.source).toBe('issn');
  });

  it('dans la fourchette -> good', () => {
    const reco = proteinReco(130, 80, 'gain'); // 112-160
    expect(reco.level).toBe('good');
  });

  it('au-dessus du max -> info', () => {
    const reco = proteinReco(200, 80, 'gain'); // max=160
    expect(reco.level).toBe('info');
    expect(reco.message).toMatch(/sans risque/);
  });
});

describe('calorieReco', () => {
  it('avec goal_kcal, intake bien en dessous -> low', () => {
    const reco = calorieReco(1200, 2000, 'cut');
    expect(reco.level).toBe('low');
    expect(reco.source).toBe('nih');
  });

  it('avec goal_kcal, intake proche -> good', () => {
    const reco = calorieReco(1980, 2000, 'maintain');
    expect(reco.level).toBe('good');
  });

  it('avec goal_kcal, intake bien au dessus -> high (cut/maintain)', () => {
    expect(calorieReco(2800, 2000, 'cut').level).toBe('high');
    expect(calorieReco(2800, 2000, 'maintain').level).toBe('high');
  });

  it("mode gain, intake bien au dessus de l'objectif -> good, jamais 'high' (surplus attendu)", () => {
    const reco = calorieReco(2800, 2000, 'gain');
    expect(reco.level).toBe('good');
    expect(reco.level).not.toBe('high');
    expect(reco.source).toBe('nih');
  });

  it('mode gain, intake bien en dessous de l’objectif -> low (reste cohérent)', () => {
    const reco = calorieReco(1200, 2000, 'gain');
    expect(reco.level).toBe('low');
  });

  it('sans goal_kcal -> info factuel', () => {
    const reco = calorieReco(2000, undefined, 'cut');
    expect(reco.level).toBe('info');
    expect(reco.source).toBe('nih');
    expect(reco.message.length).toBeGreaterThan(0);
  });
});

describe('weightTrend', () => {
  it('avg7 null et deltaPerWeek null si aucune entrée', () => {
    expect(weightTrend([])).toEqual({ avg7: null, deltaPerWeek: null });
  });

  it('deltaPerWeek null si moins de 2 points', () => {
    const result = weightTrend([{ date: '2026-07-10', weight_kg: 80 }]);
    expect(result.avg7).toBe(80);
    expect(result.deltaPerWeek).toBeNull();
  });

  it('calcule avg7 sur les 7 derniers jours et une tendance kg/semaine', () => {
    const entries = [
      { date: '2026-06-01', weight_kg: 85 },
      { date: '2026-07-06', weight_kg: 81 },
      { date: '2026-07-07', weight_kg: 80 },
      { date: '2026-07-08', weight_kg: 80 },
      { date: '2026-07-09', weight_kg: 79 },
      { date: '2026-07-10', weight_kg: 79 },
      { date: '2026-07-11', weight_kg: 78 },
      { date: '2026-07-12', weight_kg: 78 },
    ];
    const result = weightTrend(entries);
    expect(result.avg7).not.toBeNull();
    expect(result.deltaPerWeek).not.toBeNull();
    // Tendance à la baisse : delta négatif
    expect(result.deltaPerWeek as number).toBeLessThan(0);
  });
});

describe('aucune projection individuelle datée', () => {
  it('Reco ne contient jamais de champ de date/objectif projeté', () => {
    const allRecos: Reco[] = [
      ...volumeRecos({ chest: 9, back: 15, legs: 25 }),
      proteinReco(90, 80, 'gain'),
      calorieReco(1200, 2000, 'cut'),
      calorieReco(2000, undefined, 'cut'),
    ];

    for (const reco of allRecos) {
      expect(reco).not.toHaveProperty('etaDate');
      expect(reco).not.toHaveProperty('projectedDate');
      expect(reco).not.toHaveProperty('targetDate');
      expect(reco).not.toHaveProperty('daysUntilGoal');
      expect(reco.message).not.toMatch(/d'ici le/i);
      expect(reco.message).not.toMatch(/\d{4}-\d{2}-\d{2}/); // pas de date ISO
      expect(VALID_SOURCES).toContain(reco.source);
    }
  });

  it('weightTrend ne renvoie que avg7 et deltaPerWeek (pas de date/objectif)', () => {
    const result = weightTrend([
      { date: '2026-07-11', weight_kg: 80 },
      { date: '2026-07-12', weight_kg: 79 },
    ]);
    expect(Object.keys(result).sort()).toEqual(['avg7', 'deltaPerWeek']);
  });
});
