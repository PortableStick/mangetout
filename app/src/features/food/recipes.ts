import { macrosForQuantity, roundMacros, sumMacros } from './nutrition';
import type { Food, Macros } from './types';

/** Un composant de repas/recette : un aliment et sa quantité (g). */
export interface MealComponent {
  food: Food;
  quantity_g: number;
}

/** Macros totales d'un repas = somme des composants au prorata. */
export function mealMacros(components: MealComponent[]): Macros {
  return sumMacros(components.map((c) => macrosForQuantity(c.food, c.quantity_g)));
}

/** Macros par portion (sûr si portions ≤ 0). */
export function perPortion(total: Macros, portions: number): Macros {
  const p = Number.isFinite(portions) && portions > 0 ? portions : 1;
  return roundMacros({
    kcal: total.kcal / p,
    protein_g: total.protein_g / p,
    carbs_g: total.carbs_g / p,
    fat_g: total.fat_g / p,
  });
}

/** Poids total (g) d'un repas — utile pour dériver des valeurs /100 g. */
export function mealWeight(components: MealComponent[]): number {
  return components.reduce((sum, c) => sum + (c.quantity_g > 0 ? c.quantity_g : 0), 0);
}

/**
 * Construit un Food « virtuel » (valeurs /100 g) représentant une portion de repas,
 * pour pouvoir logguer une portion de recette comme un aliment.
 */
export function portionAsFood(
  id: string,
  name: string,
  total: Macros,
  portions: number,
  portionWeightG: number
): Food {
  const one = perPortion(total, portions);
  const factor = portionWeightG > 0 ? 100 / portionWeightG : 0;
  return {
    id,
    name,
    source: 'manual',
    kcal_100g: Math.round(one.kcal * factor),
    protein_100g: Math.round(one.protein_g * factor * 10) / 10,
    carbs_100g: Math.round(one.carbs_g * factor * 10) / 10,
    fat_100g: Math.round(one.fat_g * factor * 10) / 10,
  };
}
