import { describe, expect, it } from '@jest/globals';

import { isSane, sanityCheck } from './sanity';
import type { SyncRecord } from './types';

const NOW = 1_700_000_000_000;
const base = (over: Partial<SyncRecord>): SyncRecord => ({
  id: 'r1',
  clientUpdatedAt: NOW,
  deleted: false,
  ...over,
});

describe('sanity guardrails', () => {
  it('accepte un poids plausible', () => {
    expect(isSane('weight_entries', base({ weight_kg: 72.4 }), NOW)).toBe(true);
  });

  it('rejette un poids aberrant', () => {
    expect(sanityCheck('weight_entries', base({ weight_kg: 5 }), NOW)).toContainEqual(
      expect.stringContaining('weight_kg')
    );
    expect(isSane('weight_entries', base({ weight_kg: 900 }), NOW)).toBe(false);
  });

  it('rejette des macros négatives ou démesurées', () => {
    expect(
      isSane('food_entries', base({ quantity_g: 100, kcal: -5, protein_g: 0, carbs_g: 0, fat_g: 0 }), NOW)
    ).toBe(false);
    expect(
      isSane(
        'food_entries',
        base({ quantity_g: 100, kcal: 99999, protein_g: 0, carbs_g: 0, fat_g: 0 }),
        NOW
      )
    ).toBe(false);
  });

  it('rejette un horodatage dans le futur (horloge déréglée)', () => {
    expect(sanityCheck('foods', base({ clientUpdatedAt: NOW + 5 * 24 * 3600 * 1000 }), NOW)).toContainEqual(
      expect.stringContaining('futur')
    );
  });

  it('rejette des métadonnées invalides', () => {
    const bad = { id: '', clientUpdatedAt: 0, deleted: 'nope' } as unknown as SyncRecord;
    const v = sanityCheck('foods', bad, NOW);
    expect(v).toContainEqual(expect.stringContaining('id'));
    expect(v).toContainEqual(expect.stringContaining('clientUpdatedAt'));
    expect(v).toContainEqual(expect.stringContaining('deleted'));
  });

  it('un tombstone contourne les bornes métier (champs vides tolérés)', () => {
    expect(isSane('weight_entries', base({ deleted: true }), NOW)).toBe(true);
  });

  it('collection sans schéma de sanité → seules les métadonnées comptent', () => {
    expect(isSane('workouts', base({ anything: 'ok' }), NOW)).toBe(true);
  });

  describe('sets — format legacy {reps, weight_kg}', () => {
    it('accepte une série legacy plausible', () => {
      expect(isSane('sets', base({ reps: 10, weight_kg: 50 }), NOW)).toBe(true);
    });

    it('rejette une série legacy hors bornes', () => {
      expect(isSane('sets', base({ reps: -5, weight_kg: 50 }), NOW)).toBe(false);
      expect(isSane('sets', base({ reps: 10, weight_kg: 5000 }), NOW)).toBe(false);
    });
  });

  describe('sets — format typé {metricSet, fields} (Task 18.3)', () => {
    it('accepte une série typée valide (preset strength)', () => {
      expect(
        isSane('sets', base({ metricSet: 'strength', fields: { reps: 10, weight_kg: 50 } }), NOW)
      ).toBe(true);
    });

    it('rejette une série typée hors bornes (setSchema)', () => {
      const violations = sanityCheck(
        'sets',
        base({ metricSet: 'strength', fields: { reps: 5_000_000, weight_kg: -50 } }),
        NOW
      );
      expect(violations.length).toBeGreaterThan(0);
      expect(isSane('sets', base({ metricSet: 'strength', fields: { reps: 5_000_000, weight_kg: -50 } }), NOW)).toBe(
        false
      );
    });

    it('rejette une série typée avec des champs requis manquants (fields vide)', () => {
      expect(isSane('sets', base({ metricSet: 'strength', fields: {} }), NOW)).toBe(false);
    });

    it('rejette un metricSet inconnu', () => {
      expect(isSane('sets', base({ metricSet: 'not_a_preset', fields: { reps: 10 } }), NOW)).toBe(false);
    });
  });
});
