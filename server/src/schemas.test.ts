import { describe, expect, it } from 'vitest';

import { mealPlanSchema, parseFoodSchema } from './schemas.ts';

describe('schemas', () => {
  it('valide un parse-food correct', () => {
    const ok = parseFoodSchema.safeParse({
      items: [{ name: 'oeuf', quantity_g: 100, macros: { kcal: 143, protein_g: 13, carbs_g: 1, fat_g: 10 } }],
    });
    expect(ok.success).toBe(true);
  });

  it('rejette des macros négatives', () => {
    const bad = parseFoodSchema.safeParse({
      items: [{ name: 'x', quantity_g: 100, macros: { kcal: -1, protein_g: 0, carbs_g: 0, fat_g: 0 } }],
    });
    expect(bad.success).toBe(false);
  });

  it('exige exactement 7 jours pour un meal-plan', () => {
    const day = { day: 'Lun', meals: [], total: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } };
    expect(mealPlanSchema.safeParse({ days: [day] }).success).toBe(false);
    expect(mealPlanSchema.safeParse({ days: Array.from({ length: 7 }, () => day) }).success).toBe(true);
  });
});
