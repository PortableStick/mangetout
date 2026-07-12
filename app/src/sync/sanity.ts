import { z } from 'zod';

import { setSchema, type MetricSetKey } from '@/features/workouts/metrics';

import type { SyncRecord } from './types';

const METRIC_SET_KEYS = [
  'strength',
  'bodyweight',
  'assisted',
  'isometric',
  'cardio_row',
  'cardio_bike',
  'cardio_run',
  'cardio_generic',
] as const satisfies readonly MetricSetKey[];

/**
 * Garde-fous de cohérence AVANT toute écriture (push vers le homelab ou pull en local).
 * Objectif : rejeter des données invalides/aberrantes plutôt que de propager du bruit.
 * Renvoie la liste des violations (vide = OK).
 */

const num = z.number().finite();

/** Schémas de sanité par collection (ne valident que les bornes métier critiques). */
const SANITY: Record<string, z.ZodType> = {
  weight_entries: z.object({
    weight_kg: num.min(20).max(500),
  }),
  food_entries: z.object({
    quantity_g: num.min(0).max(5000),
    kcal: num.min(0).max(10000),
    protein_g: num.min(0).max(2000),
    carbs_g: num.min(0).max(2000),
    fat_g: num.min(0).max(2000),
  }),
  foods: z.object({
    // Valeurs pour 100 g.
    kcal_100g: num.min(0).max(1000),
    protein_100g: num.min(0).max(100),
    carbs_100g: num.min(0).max(100),
    fat_100g: num.min(0).max(100),
  }),
  // Séries : format legacy `{ reps, weight_kg }` à plat, OU format typé par `metric_set`
  // (`{ metricSet, fields }`, Task 18.3). Pour la branche typée, les bornes fines par champ
  // ET les champs requis du preset sont revalidés ici via `setSchema` (Task 18.3 fix) —
  // sans quoi seule la forme (record string→number|string) était vérifiée, sans bornes ni
  // champs requis.
  sets: z.union([
    z.object({ reps: num.min(0).max(1000), weight_kg: num.min(0).max(1000) }).passthrough(),
    z
      .object({
        metricSet: z.enum(METRIC_SET_KEYS),
        fields: z.record(z.string(), z.union([num, z.string()])),
      })
      .passthrough()
      .superRefine((data, ctx) => {
        const result = setSchema(data.metricSet as MetricSetKey).safeParse(data.fields);
        if (!result.success) {
          ctx.addIssue({
            code: 'custom',
            path: ['fields'],
            message: `bornes/champs invalides pour metricSet=${data.metricSet} : ${result.error.issues
              .map((i) => `${i.path.join('.') || 'fields'}: ${i.message}`)
              .join('; ')}`,
          });
        }
      }),
  ]),
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Vérifie métadonnées + bornes métier. `now` injecté pour des tests déterministes. */
export function sanityCheck(collection: string, record: SyncRecord, now: number): string[] {
  const violations: string[] = [];

  if (typeof record.id !== 'string' || record.id.length === 0) {
    violations.push('id manquant');
  }
  if (!Number.isFinite(record.clientUpdatedAt) || record.clientUpdatedAt <= 0) {
    violations.push('clientUpdatedAt invalide');
  } else if (record.clientUpdatedAt > now + ONE_DAY_MS) {
    // Une date d'écriture dans le futur (> 1 j) trahit une horloge déréglée.
    violations.push('clientUpdatedAt dans le futur');
  }
  if (typeof record.deleted !== 'boolean') {
    violations.push('deleted doit être booléen');
  }

  // Un tombstone n'a pas à respecter les bornes métier (les champs peuvent être vides).
  const schema = SANITY[collection];
  if (schema && !record.deleted) {
    const result = schema.safeParse(record);
    if (!result.success) {
      for (const issue of result.error.issues) {
        violations.push(`${issue.path.join('.') || collection} : ${issue.message}`);
      }
    }
  }

  return violations;
}

export function isSane(collection: string, record: SyncRecord, now: number): boolean {
  return sanityCheck(collection, record, now).length === 0;
}
