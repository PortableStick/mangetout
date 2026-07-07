/**
 * Toutes les collections synchronisées vers le homelab. RIEN ne vit uniquement
 * en local : chaque entité figure ici et transite par la couche sync.
 */
export const SYNC_COLLECTIONS = [
  'foods',
  'food_entries',
  'meals',
  'meal_items',
  'weight_entries',
  'gyms',
  'equipment',
  'workouts',
  'exercises',
  'sets',
  'goals',
  'meal_plans',
] as const;

export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];
