import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { syncRecords } from '@/db/schema';
import { newId } from '@/lib/id';
import { getSyncManager } from '@/sync/manager';

export interface Goals {
  id?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  weight_target_kg?: number;
}

/** Objectifs courants = enregistrement `goals` le plus récent de l'utilisateur. */
export function getGoals(): Goals | null {
  const rows = db
    .select()
    .from(syncRecords)
    .where(and(eq(syncRecords.collection, 'goals'), eq(syncRecords.deleted, false)))
    .all();
  if (rows.length === 0) return null;
  const latest = rows.sort((a, b) => b.clientUpdatedAt - a.clientUpdatedAt)[0]!;
  return { id: latest.id, ...(latest.payload ?? {}) };
}

export async function setGoals(goals: Goals, userId: string): Promise<void> {
  const id = getGoals()?.id ?? newId();
  await getSyncManager().enqueue('goals', 'upsert', {
    id,
    kcal: goals.kcal,
    protein_g: goals.protein_g,
    carbs_g: goals.carbs_g,
    fat_g: goals.fat_g,
    weight_target_kg: goals.weight_target_kg,
    user: userId,
    clientUpdatedAt: Date.now(),
    deleted: false,
  });
}
