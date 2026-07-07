import { describe, expect, it } from '@jest/globals';

import { mealMacros, mealWeight, perPortion } from './recipes';
import type { Food } from './types';

const mk = (over: Partial<Food>): Food => ({
  id: 'f',
  name: 'x',
  source: 'manual',
  kcal_100g: 0,
  protein_100g: 0,
  carbs_100g: 0,
  fat_100g: 0,
  ...over,
});

describe('recipes', () => {
  const poulet = mk({ kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6 });
  const riz = mk({ kcal_100g: 350, protein_100g: 7.5, carbs_100g: 78, fat_100g: 0.6 });

  it('somme les macros des composants au prorata', () => {
    const total = mealMacros([
      { food: poulet, quantity_g: 200 },
      { food: riz, quantity_g: 100 },
    ]);
    // poulet 200g: 330 kcal, 62 P ; riz 100g: 350 kcal, 7.5 P
    expect(total.kcal).toBe(680);
    expect(total.protein_g).toBe(69.5);
  });

  it('divise par le nombre de portions', () => {
    const total = { kcal: 680, protein_g: 69.5, carbs_g: 78, fat_g: 7.8 };
    expect(perPortion(total, 2)).toEqual({ kcal: 340, protein_g: 34.8, carbs_g: 39, fat_g: 3.9 });
  });

  it('portions ≤ 0 → traité comme 1 portion', () => {
    const total = { kcal: 100, protein_g: 10, carbs_g: 20, fat_g: 5 };
    expect(perPortion(total, 0)).toEqual(total);
  });

  it('calcule le poids total du repas', () => {
    expect(mealWeight([{ food: poulet, quantity_g: 200 }, { food: riz, quantity_g: 100 }])).toBe(300);
  });
});
