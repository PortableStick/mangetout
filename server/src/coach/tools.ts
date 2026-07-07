import { z } from 'zod';

/**
 * Outils du coach. LECTURE = exécutés côté serveur, owner-scoped. ACTION = jamais
 * exécutés directement : renvoyés à l'app comme PROPOSITION (propose→confirme→applique).
 * Le serveur valide toujours nom + arguments + autorisation avant exécution.
 */

const macros = {
  kcal: z.number().min(0).max(20000).optional(),
  protein_g: z.number().min(0).max(2000).optional(),
  carbs_g: z.number().min(0).max(2000).optional(),
  fat_g: z.number().min(0).max(2000).optional(),
};

export interface ToolDef {
  kind: 'read' | 'action';
  description: string;
  args: z.ZodType;
  /** Collection PocketBase cible (pour les actions d'écriture). */
  collection?: string;
}

export const TOOLS: Record<string, ToolDef> = {
  // --- Lecture ---
  get_today_summary: { kind: 'read', description: 'Totaux kcal/macros du jour', args: z.object({}) },
  get_goals: { kind: 'read', description: 'Objectifs kcal/macros', args: z.object({}) },
  get_recent_weight: { kind: 'read', description: 'Dernières pesées', args: z.object({}) },
  list_gyms: { kind: 'read', description: 'Salles de l’utilisateur', args: z.object({}) },
  get_recent_workouts: { kind: 'read', description: 'Séances récentes', args: z.object({}) },
  // --- Action (proposition) ---
  add_food_entry: {
    kind: 'action',
    collection: 'food_entries',
    description: 'Ajoute un aliment au journal',
    args: z.object({
      name: z.string().min(1),
      quantity_g: z.number().min(0).max(5000),
      mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
      kcal: z.number().min(0).max(10000),
      protein_g: z.number().min(0).max(2000),
      carbs_g: z.number().min(0).max(2000),
      fat_g: z.number().min(0).max(2000),
    }),
  },
  add_weight_entry: {
    kind: 'action',
    collection: 'weight_entries',
    description: 'Enregistre une pesée',
    args: z.object({
      weight_kg: z.number().min(20).max(500),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
  },
  update_goals: {
    kind: 'action',
    collection: 'goals',
    description: 'Met à jour les objectifs (jamais imposé)',
    args: z.object(macros).refine((v) => Object.values(v).some((x) => x !== undefined), {
      message: 'au moins un objectif',
    }),
  },
};

export function isAction(tool: string): boolean {
  return TOOLS[tool]?.kind === 'action';
}

export type ToolValidation =
  | { ok: true; args: unknown }
  | { ok: false; error: string };

/** Valide le nom + les arguments d'un appel d'outil. */
export function validateToolCall(tool: string, rawArgs: unknown): ToolValidation {
  const def = TOOLS[tool];
  if (!def) return { ok: false, error: `outil inconnu: ${tool}` };
  const parsed = def.args.safeParse(rawArgs ?? {});
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  return { ok: true, args: parsed.data };
}

/** Définitions exposées au modèle (format OpenAI function calling). */
export function toolDefinitions() {
  return Object.entries(TOOLS).map(([name, def]) => ({
    type: 'function' as const,
    function: {
      name,
      description: def.description,
      parameters: { type: 'object', properties: {}, additionalProperties: true },
    },
  }));
}
