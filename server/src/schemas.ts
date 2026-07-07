import { z } from 'zod';

/**
 * Schémas des SORTIES IA (JSON strict). On ne parse jamais de prose libre :
 * la sortie du modèle est validée ici, rejetée/réessayée si invalide.
 */

export const macrosSchema = z.object({
  kcal: z.number().min(0).max(20000),
  protein_g: z.number().min(0).max(2000),
  carbs_g: z.number().min(0).max(2000),
  fat_g: z.number().min(0).max(2000),
});

/** parse-food : « 2 œufs et une tranche de pain » → items estimés. */
export const parseFoodSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity_g: z.number().min(0).max(5000),
        macros: macrosSchema,
      })
    )
    .max(30),
});

/** estimate : macros estimées d'un produit inconnu à partir de son nom. */
export const estimateSchema = z.object({
  name: z.string().min(1),
  per_100g: macrosSchema,
  confidence: z.enum(['low', 'medium', 'high']),
});

/** recipe : décomposition d'une recette → macros par portion. */
export const recipeSchema = z.object({
  title: z.string().min(1),
  portions: z.number().int().min(1).max(50),
  per_portion: macrosSchema,
  ingredients: z.array(z.object({ name: z.string(), quantity_g: z.number().min(0) })).max(50),
});

const mealSchema = z.object({
  name: z.string().min(1),
  macros: macrosSchema,
});

/** meal-plan : semaine de repas (jour régénérable individuellement). */
export const mealPlanSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.string().min(1),
        meals: z.array(mealSchema).max(8),
        total: macrosSchema,
      })
    )
    .length(7),
});

export const singleDaySchema = z.object({
  day: z.string().min(1),
  meals: z.array(mealSchema).max(8),
  total: macrosSchema,
});

/** summary : insights hebdo, ton neutre et bienveillant. */
export const summarySchema = z.object({
  headline: z.string().min(1),
  insights: z.array(z.string()).max(6),
});

/** shopping-list : liste agrégée depuis un plan de repas. */
export const shoppingListSchema = z.object({
  items: z.array(z.object({ name: z.string().min(1), quantity: z.string() })).max(200),
});

/** substitutions : remplacement d'un aliment à profil proche. */
export const substitutionsSchema = z.object({
  original: z.string(),
  options: z.array(z.object({ name: z.string(), why: z.string() })).max(8),
});

// --- Vision (perception → raisonnement) ---

/** Photo d'assiette → items perçus + 1-3 questions de confirmation (fiabilité). */
export const platePerceptionSchema = z.object({
  items: z.array(z.object({ name: z.string().min(1), portion_guess: z.string() })).max(20),
  questions: z.array(z.string()).max(3),
});

/** OCR d'étiquette nutritionnelle → valeurs structurées. */
export const labelSchema = z.object({
  name: z.string().default(''),
  per_100g: macrosSchema,
  per_portion: macrosSchema.optional(),
  serving_size: z.string().optional(),
});

/** Perception d'affiche de machine (texte brut lu par le modèle vision). */
export const machinePerceptionSchema = z.object({
  raw_name: z.string().min(1),
  visible_text: z.string().optional(),
  muscles_text: z.string().optional(),
});

/** Machine normalisée par le modèle texte → alimente la collection equipment. */
export const machineSchema = z.object({
  canonical_name: z.string().min(1),
  muscle_groups: z.array(z.string()).max(6),
  movement_pattern: z.string().optional(),
  how_to: z.string().optional(),
});

export type ParseFood = z.infer<typeof parseFoodSchema>;
export type MealPlan = z.infer<typeof mealPlanSchema>;
