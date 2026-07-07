import { describe, expect, it } from '@jest/globals';

import { goalProgress, kcalFromMacros, macrosForQuantity, roundMacros, sumMacros } from './nutrition';
import type { Food } from './types';

const food: Food = {
  id: 'f1',
  name: 'Riz basmati',
  source: 'manual',
  kcal_100g: 350,
  protein_100g: 7.5,
  carbs_100g: 78,
  fat_100g: 0.6,
};

describe('nutrition', () => {
  it('calcule les macros au prorata de la quantité', () => {
    expect(macrosForQuantity(food, 200)).toEqual({
      kcal: 700,
      protein_g: 15,
      carbs_g: 156,
      fat_g: 1.2,
    });
  });

  it('quantité nulle ou invalide → macros nulles', () => {
    expect(macrosForQuantity(food, 0)).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    expect(macrosForQuantity(food, -50)).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('arrondit kcal à l’entier et les grammes à 0,1', () => {
    expect(roundMacros({ kcal: 12.6, protein_g: 1.23, carbs_g: 4.57, fat_g: 0.04 })).toEqual({
      kcal: 13,
      protein_g: 1.2,
      carbs_g: 4.6,
      fat_g: 0,
    });
  });

  it('somme plusieurs jeux de macros', () => {
    expect(
      sumMacros([
        { kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2 },
        { kcal: 250, protein_g: 12, carbs_g: 30, fat_g: 8 },
      ])
    ).toEqual({ kcal: 350, protein_g: 17, carbs_g: 40, fat_g: 10 });
  });

  it('recalcule les kcal depuis les macros (Atwater 4/4/9)', () => {
    expect(kcalFromMacros({ protein_g: 10, carbs_g: 20, fat_g: 5 })).toBe(165);
  });

  it('goalProgress est borné et sûr si objectif nul', () => {
    expect(goalProgress(50, 100)).toBe(0.5);
    expect(goalProgress(150, 100)).toBe(1);
    expect(goalProgress(50, 0)).toBe(0);
  });
});
