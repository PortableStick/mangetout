import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/sync/manager', () => ({
  getSyncManager: () => ({ enqueue: jest.fn() }),
}));

const mockAll = jest.fn<() => unknown[]>();
jest.mock('@/db/client', () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ all: () => mockAll() }) }) }) },
}));

import { doneWorkoutsSince, weeklyVolumeKg, weightKeyFor } from './volume';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-12T12:00:00.000Z').getTime();

describe('weightKeyFor', () => {
  it('résout la clé de poids par metricSet', () => {
    expect(weightKeyFor('strength')).toBe('weight_kg');
    expect(weightKeyFor('bodyweight')).toBe('added_weight_kg');
    expect(weightKeyFor('assisted')).toBe('assist_weight_kg');
    expect(weightKeyFor('cardio_row')).toBe('weight_kg'); // défaut
  });
});

describe('doneWorkoutsSince', () => {
  beforeEach(() => {
    mockAll.mockReset();
  });

  it('exclut les séances non `done` et hors fenêtre', () => {
    mockAll.mockReturnValueOnce([
      { id: 'w1', payload: { at: new Date(NOW - 1 * MS_PER_DAY).toISOString(), status: 'done', gym: 'g1' } },
      { id: 'w2', payload: { at: new Date(NOW - 2 * MS_PER_DAY).toISOString(), status: 'planned', gym: 'g1' } },
      { id: 'w3', payload: { at: new Date(NOW - 10 * MS_PER_DAY).toISOString(), status: 'done', gym: 'g1' } },
    ]);

    const result = doneWorkoutsSince(NOW - 7 * MS_PER_DAY, NOW);

    expect(result.map((w) => w.id)).toEqual(['w1']);
  });
});

describe('weeklyVolumeKg', () => {
  beforeEach(() => {
    mockAll.mockReset();
  });

  function mockData(workouts: unknown[], exercises: unknown[], sets: unknown[]) {
    mockAll
      .mockReturnValueOnce(workouts) // listWorkouts (doneWorkoutsSince)
      .mockReturnValueOnce(exercises) // listAllExercises
      .mockReturnValueOnce(sets); // listAllSets
  }

  it('additionne reps × weight_kg pour des séries strength', () => {
    mockData(
      [{ id: 'w1', payload: { at: new Date(NOW - 1 * MS_PER_DAY).toISOString(), status: 'done', gym: 'g1' } }],
      [{ id: 'e1', payload: { workout: 'w1', name: 'Squat', position: 0 } }],
      [
        { id: 's1', payload: { exercise: 'e1', metricSet: 'strength', fields: { reps: 10, weight_kg: 50 }, position: 0 } },
        { id: 's2', payload: { exercise: 'e1', metricSet: 'strength', fields: { reps: 8, weight_kg: 55 }, position: 1 } },
      ]
    );

    expect(weeklyVolumeKg(NOW)).toBe(10 * 50 + 8 * 55);
  });

  it('bodyweight avec added_weight_kg compte reps × added_weight_kg', () => {
    mockData(
      [{ id: 'w1', payload: { at: new Date(NOW - 1 * MS_PER_DAY).toISOString(), status: 'done', gym: 'g1' } }],
      [{ id: 'e1', payload: { workout: 'w1', name: 'Tractions', position: 0 } }],
      [{ id: 's1', payload: { exercise: 'e1', metricSet: 'bodyweight', fields: { reps: 8, added_weight_kg: 10 }, position: 0 } }]
    );

    expect(weeklyVolumeKg(NOW)).toBe(8 * 10);
  });

  it('bodyweight sans added_weight_kg est ignorée (pas comptée à 0)', () => {
    mockData(
      [{ id: 'w1', payload: { at: new Date(NOW - 1 * MS_PER_DAY).toISOString(), status: 'done', gym: 'g1' } }],
      [{ id: 'e1', payload: { workout: 'w1', name: 'Tractions', position: 0 } }],
      [{ id: 's1', payload: { exercise: 'e1', metricSet: 'bodyweight', fields: { reps: 8 }, position: 0 } }]
    );

    expect(weeklyVolumeKg(NOW)).toBeNull();
  });

  it('assisted est toujours ignorée (assistance ≠ charge ajoutée)', () => {
    mockData(
      [{ id: 'w1', payload: { at: new Date(NOW - 1 * MS_PER_DAY).toISOString(), status: 'done', gym: 'g1' } }],
      [{ id: 'e1', payload: { workout: 'w1', name: 'Dips assistées', position: 0 } }],
      [{ id: 's1', payload: { exercise: 'e1', metricSet: 'assisted', fields: { reps: 8, assist_weight_kg: 20 }, position: 0 } }]
    );

    expect(weeklyVolumeKg(NOW)).toBeNull();
  });

  it('mixe strength + bodyweight/assisted ignorées : ne compte que le volume exploitable', () => {
    mockData(
      [{ id: 'w1', payload: { at: new Date(NOW - 1 * MS_PER_DAY).toISOString(), status: 'done', gym: 'g1' } }],
      [
        { id: 'e1', payload: { workout: 'w1', name: 'Squat', position: 0 } },
        { id: 'e2', payload: { workout: 'w1', name: 'Dips assistées', position: 1 } },
      ],
      [
        { id: 's1', payload: { exercise: 'e1', metricSet: 'strength', fields: { reps: 10, weight_kg: 50 }, position: 0 } },
        { id: 's2', payload: { exercise: 'e2', metricSet: 'assisted', fields: { reps: 8, assist_weight_kg: 20 }, position: 0 } },
      ]
    );

    expect(weeklyVolumeKg(NOW)).toBe(10 * 50);
  });

  it('exclut les séances hors fenêtre 7 jours ou non `done`', () => {
    mockData(
      [
        { id: 'w1', payload: { at: new Date(NOW - 10 * MS_PER_DAY).toISOString(), status: 'done', gym: 'g1' } },
        { id: 'w2', payload: { at: new Date(NOW - 1 * MS_PER_DAY).toISOString(), status: 'planned', gym: 'g1' } },
      ],
      [],
      []
    );

    expect(weeklyVolumeKg(NOW)).toBeNull();
  });

  it('renvoie null si aucune séance `done` récente', () => {
    mockData([], [], []);

    expect(weeklyVolumeKg(NOW)).toBeNull();
  });
});
