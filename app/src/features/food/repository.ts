import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { syncRecords } from '@/db/schema';
import { newId } from '@/lib/id';
import { SyncManager } from '@/sync/manager';

import { macrosForQuantity } from './nutrition';
import type { MealComponent } from './recipes';
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

// --- Aliments custom & repas réutilisables (Milestone 4) ---

function rows(collection: string) {
  return db
    .select()
    .from(syncRecords)
    .where(and(eq(syncRecords.collection, collection), eq(syncRecords.deleted, false)))
    .all();
}

/** Construit un aliment manuel (valeurs /100 g saisies par l'utilisateur). */
export function makeManualFood(input: Omit<Food, 'id' | 'source'>): Food {
  return { id: newId(), source: 'manual', ...input };
}

export function listFoods(): Food[] {
  return rows('foods').map((r) => ({ id: r.id, ...(r.payload ?? {}) }) as unknown as Food);
}

export interface MealSummary {
  id: string;
  name: string;
  portions: number;
}

export function listMeals(): MealSummary[] {
  return rows('meals').map((r) => {
    const p = r.payload ?? {};
    return { id: r.id, name: String(p.name ?? ''), portions: Number(p.portions ?? 1) };
  });
}

/** Composants d'un repas (résout chaque food_item vers son Food). */
export function mealComponents(mealId: string): MealComponent[] {
  const foods = new Map(listFoods().map((f) => [f.id, f]));
  return rows('meal_items')
    .map((r) => r.payload ?? {})
    .filter((p) => p.meal === mealId)
    .map((p) => ({ food: foods.get(String(p.food)), quantity_g: Number(p.quantity_g ?? 0) }))
    .filter((c): c is MealComponent => c.food !== undefined);
}

/** Sauvegarde un repas réutilisable : le repas, ses aliments et ses composants. */
export async function saveMeal(input: {
  name: string;
  portions: number;
  components: MealComponent[];
  userId: string;
}): Promise<string> {
  const now = Date.now();
  const mgr = syncManager();
  const mealId = newId();
  await mgr.enqueue('meals', 'upsert', {
    id: mealId,
    name: input.name,
    portions: input.portions,
    user: input.userId,
    clientUpdatedAt: now,
    deleted: false,
  });
  for (const c of input.components) {
    await mgr.enqueue('foods', 'upsert', {
      ...c.food,
      user: input.userId,
      clientUpdatedAt: now,
      deleted: false,
    });
    await mgr.enqueue('meal_items', 'upsert', {
      id: newId(),
      meal: mealId,
      food: c.food.id,
      quantity_g: c.quantity_g,
      user: input.userId,
      clientUpdatedAt: now,
      deleted: false,
    });
  }
  return mealId;
}

/** Ajoute tous les composants d'un repas au journal (une ligne par aliment). */
export async function addMealToJournal(
  mealId: string,
  mealType: MealType,
  date: string,
  userId: string
): Promise<void> {
  for (const c of mealComponents(mealId)) {
    await addFoodEntry({ food: c.food, quantityG: c.quantity_g, mealType, date, userId });
  }
}
