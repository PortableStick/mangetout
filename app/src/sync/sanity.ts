import { z } from 'zod';

import type { SyncRecord } from './types';

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
  // (`{ metricSet, fields }`, Task 18.3) — les bornes fines par champ sont validées côté
  // saisie (`features/workouts/metrics.ts#setSchema`) ; ici on ne garde qu'un filet générique.
  sets: z.union([
    z.object({ reps: num.min(0).max(1000), weight_kg: num.min(0).max(1000) }).passthrough(),
    z
      .object({ metricSet: z.string().min(1), fields: z.record(z.string(), z.union([num, z.string()])) })
      .passthrough(),
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
