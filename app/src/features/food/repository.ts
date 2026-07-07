import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { syncRecords } from '@/db/schema';
import { newId } from '@/lib/id';
import { SyncManager } from '@/sync/manager';

import { macrosForQuantity } from './nutrition';
import type { Food, FoodEntry, MealType } from './types';

let cached: SyncManager | null = null;
/** Singleton paresseux (évite d'ouvrir la DB à l'import, ex. en test). */
export function syncManager(): SyncManager {
  return (cached ??= new SyncManager());
}

export interface AddEntryInput {
  food: Food;
  quantityG: number;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  userId: string;
}

/** Ajoute un aliment au journal : upsert de l'aliment + de la ligne de journal. */
export async function addFoodEntry(input: AddEntryInput): Promise<FoodEntry> {
  const now = Date.now();
  const mgr = syncManager();

  await mgr.enqueue('foods', 'upsert', {
    ...input.food,
    user: input.userId,
    clientUpdatedAt: now,
    deleted: false,
  });

  const macros = macrosForQuantity(input.food, input.quantityG);
  const entry: FoodEntry = {
    id: newId(),
    date: input.date,
    mealType: input.mealType,
    foodId: input.food.id,
    name: input.food.name,
    quantity_g: input.quantityG,
    estimated: input.food.source === 'ai',
    ...macros,
  };

  await mgr.enqueue('food_entries', 'upsert', {
    ...entry,
    user: input.userId,
    clientUpdatedAt: now,
    deleted: false,
  });
  return entry;
}

/** Lignes de journal d'une date (lecture du cache local). */
export function listEntriesByDate(date: string): FoodEntry[] {
  const rows = db
    .select()
    .from(syncRecords)
    .where(and(eq(syncRecords.collection, 'food_entries'), eq(syncRecords.deleted, false)))
    .all();
  return rows
    .map((r) => ({ id: r.id, ...(r.payload ?? {}) }) as unknown as FoodEntry)
    .filter((e) => e.date === date);
}

export async function deleteFoodEntry(entry: FoodEntry, userId: string): Promise<void> {
  await syncManager().enqueue('food_entries', 'delete', {
    ...entry,
    user: userId,
    clientUpdatedAt: Date.now(),
    deleted: true,
  });
}
