import type { Food, Macros } from './types';

/** Arrondi : kcal à l'entier, macros à 0,1 g (lisibilité + cohérence de sync). */
export function roundMacros(m: Macros): Macros {
  const round1 = (x: number) => Math.round(x * 10) / 10;
  return {
    kcal: Math.round(m.kcal),
    protein_g: round1(m.protein_g),
    carbs_g: round1(m.carbs_g),
    fat_g: round1(m.fat_g),
  };
}

/** Macros d'une quantité (g) à partir des valeurs pour 100 g d'un aliment. */
export function macrosForQuantity(food: Food, quantityG: number): Macros {
  const q = Number.isFinite(quantityG) && quantityG > 0 ? quantityG : 0;
  const factor = q / 100;
  return roundMacros({
    kcal: food.kcal_100g * factor,
    protein_g: food.protein_100g * factor,
    carbs_g: food.carbs_100g * factor,
    fat_g: food.fat_100g * factor,
  });
}

export const ZERO_MACROS: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/** Somme de plusieurs jeux de macros (totaux journaliers / par repas). */
export function sumMacros(items: Macros[]): Macros {
  return roundMacros(
    items.reduce<Macros>(
      (acc, m) => ({
        kcal: acc.kcal + m.kcal,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
      }),
      { ...ZERO_MACROS }
    )
  );
}

/** Kcal théoriques recalculées depuis les macros (Atwater : 4/4/9). */
export function kcalFromMacros(m: Pick<Macros, 'protein_g' | 'carbs_g' | 'fat_g'>): number {
  return Math.round(m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9);
}

/** Progression 0..1 d'une valeur vers un objectif (bornée, sûre si objectif nul). */
export function goalProgress(value: number, goal: number): number {
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return Math.max(0, Math.min(1, value / goal));
}
