/** Modèle nutritionnel (unités métriques : kcal, g). */

export type FoodSource = 'off' | 'manual' | 'ai';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Snacks',
};

/** Valeurs nutritionnelles d'une portion donnée. */
export interface Macros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Aliment canonique (valeurs POUR 100 g). */
export interface Food {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  source: FoodSource;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  servingSize?: string;
}

/** Ligne du journal alimentaire (macros déjà calculées pour la quantité). */
export interface FoodEntry extends Macros {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodId?: string;
  name: string;
  quantity_g: number;
  /** true si les macros sont une estimation (IA / OCR / photo). */
  estimated: boolean;
}
