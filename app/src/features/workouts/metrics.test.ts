import { describe, it, expect } from '@jest/globals';

import { METRIC_SETS, METRIC_FIELDS, fieldsFor, setSchema } from './metrics';

describe('metrics — catalogue de champs + presets metric_set', () => {
  it('cardio_row contient durée/distance/split/spm/watts dans l’ordre', () => {
    expect(METRIC_SETS.cardio_row).toEqual([
      'duration_s',
      'distance_m',
      'pace_split_500m',
      'cadence_spm',
      'watts',
    ]);
  });

  it('fieldsFor renvoie des MetricField ordonnés avec unités', () => {
    const f = fieldsFor('strength');
    expect(f[0]!.key).toBe('reps');
    expect(METRIC_FIELDS.weight_kg.unit).toBe('kg');
  });

  it('setSchema strength valide une série muscu, rejette hors bornes', () => {
    expect(setSchema('strength').safeParse({ reps: 10, weight_kg: 80 }).success).toBe(true);
    expect(setSchema('strength').safeParse({ reps: -1, weight_kg: 80 }).success).toBe(false);
  });

  it('setSchema cardio_row valide une série rameur', () => {
    expect(
      setSchema('cardio_row').safeParse({
        duration_s: 1200,
        distance_m: 5000,
        pace_split_500m: 120,
        cadence_spm: 26,
        watts: 180,
      }).success
    ).toBe(true);
  });

  it('set_type accepte seulement les valeurs connues', () => {
    expect(
      setSchema('strength').safeParse({ reps: 5, weight_kg: 100, set_type: 'warmup' }).success
    ).toBe(true);
    expect(
      setSchema('strength').safeParse({ reps: 5, weight_kg: 100, set_type: 'bogus' }).success
    ).toBe(false);
  });
});
