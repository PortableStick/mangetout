import { describe, it, expect } from '@jest/globals';

import { METRIC_SETS, METRIC_FIELDS, METRIC_SET_REQUIRED, fieldsFor, setSchema } from './metrics';

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

  it('setSchema cardio_row valide une série cardio PARTIELLE (durée+distance seules, sans watts/spm/split)', () => {
    // FIX perte de données silencieuse : une série cardio réaliste (ex. rameur sans allure ni
    // watts saisis) ne doit pas être rejetée faute de champs secondaires.
    expect(
      setSchema('cardio_row').safeParse({ duration_s: 1200, distance_m: 5000 }).success
    ).toBe(true);
  });

  it('setSchema cardio_bike/cardio_run/cardio_generic : seul duration_s est requis', () => {
    expect(setSchema('cardio_bike').safeParse({ duration_s: 600 }).success).toBe(true);
    expect(setSchema('cardio_run').safeParse({ duration_s: 600 }).success).toBe(true);
    expect(setSchema('cardio_generic').safeParse({ duration_s: 600 }).success).toBe(true);
  });

  it('setSchema : une série avec fields vide reste invalide, pour tous les presets', () => {
    for (const set of Object.keys(METRIC_SETS) as (keyof typeof METRIC_SETS)[]) {
      expect(setSchema(set).safeParse({}).success).toBe(false);
    }
  });

  it('setSchema bodyweight/assisted : reps requis, le champ secondaire est optionnel', () => {
    expect(setSchema('bodyweight').safeParse({ reps: 12 }).success).toBe(true);
    expect(setSchema('assisted').safeParse({ reps: 8 }).success).toBe(true);
  });

  it('setSchema isometric : duration_s requis', () => {
    expect(setSchema('isometric').safeParse({ duration_s: 45 }).success).toBe(true);
    expect(setSchema('isometric').safeParse({}).success).toBe(false);
  });

  it("fieldsFor recalcule l'optionnalité PAR PRESET (ex. reps requis en strength, absent des presets cardio)", () => {
    const strengthFields = fieldsFor('strength');
    const reps = strengthFields.find((f) => f.key === 'reps');
    expect(reps?.optional).toBe(false);

    const cardioFields = fieldsFor('cardio_row');
    const distance = cardioFields.find((f) => f.key === 'distance_m');
    expect(distance?.optional).toBe(true);
  });

  it('METRIC_SET_REQUIRED : chaque clé requise appartient bien au preset', () => {
    for (const [set, required] of Object.entries(METRIC_SET_REQUIRED)) {
      const keys = METRIC_SETS[set as keyof typeof METRIC_SETS];
      for (const key of required) {
        expect(keys).toContain(key);
      }
    }
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
