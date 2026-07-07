import { config } from '../config.ts';
import { TOOLS, validateToolCall } from './tools.ts';

export interface CoachContext {
  userId: string;
  token: string;
  fetchImpl?: typeof fetch;
}

function pbFetch(ctx: CoachContext, path: string, init?: RequestInit) {
  return (ctx.fetchImpl ?? fetch)(`${config.pbInternalUrl}${path}`, {
    ...init,
    headers: { Authorization: ctx.token, 'Content-Type': 'application/json', ...init?.headers },
  });
}

function dayOf(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * Construit l'enregistrement PocketBase d'une action. SÉCURITÉ : le champ `user`
 * est TOUJOURS l'utilisateur vérifié du contexte — jamais une valeur venue du modèle.
 */
export function buildRecord(
  tool: string,
  args: Record<string, unknown>,
  userId: string,
  now: number
): Record<string, unknown> {
  const base = { user: userId, clientUpdatedAt: now, deleted: false };
  switch (tool) {
    case 'add_food_entry':
      return {
        ...base,
        date: dayOf(now),
        mealType: args.mealType,
        name: args.name,
        quantity_g: args.quantity_g,
        kcal: args.kcal,
        protein_g: args.protein_g,
        carbs_g: args.carbs_g,
        fat_g: args.fat_g,
        estimated: true,
      };
    case 'add_weight_entry':
      return { ...base, date: (args.date as string) || dayOf(now), weight_kg: args.weight_kg };
    case 'update_goals':
      return {
        ...base,
        kcal: args.kcal,
        protein_g: args.protein_g,
        carbs_g: args.carbs_g,
        fat_g: args.fat_g,
      };
    default:
      return base;
  }
}

/** Exécute une action CONFIRMÉE (après validation + owner-scoping). */
export async function applyAction(
  tool: string,
  rawArgs: unknown,
  ctx: CoachContext,
  now: number
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const def = TOOLS[tool];
  if (!def || def.kind !== 'action' || !def.collection) return { ok: false, error: 'action invalide' };
  const v = validateToolCall(tool, rawArgs);
  if (!v.ok) return { ok: false, error: v.error };

  const body = buildRecord(tool, v.args as Record<string, unknown>, ctx.userId, now);
  const res = await pbFetch(ctx, `/api/collections/${def.collection}/records`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: `PocketBase ${res.status}` };
  const rec = (await res.json()) as { id?: string };
  return { ok: true, id: rec.id ?? '' };
}

/** Exécute un outil de LECTURE, owner-scoped (les règles PB restreignent à l'utilisateur). */
export async function executeReadTool(tool: string, ctx: CoachContext, now: number): Promise<unknown> {
  const get = async (path: string) => {
    const res = await pbFetch(ctx, path, { method: 'GET' });
    if (!res.ok) return null;
    return res.json();
  };
  switch (tool) {
    case 'get_today_summary': {
      const day = dayOf(now);
      return get(`/api/collections/food_entries/records?filter=${encodeURIComponent(`date="${day}"`)}&perPage=200`);
    }
    case 'get_goals':
      return get('/api/collections/goals/records?sort=-updated&perPage=1');
    case 'get_recent_weight':
      return get('/api/collections/weight_entries/records?sort=-date&perPage=10');
    case 'list_gyms':
      return get('/api/collections/gyms/records?perPage=50');
    case 'get_recent_workouts':
      return get('/api/collections/workouts/records?sort=-date&perPage=10');
    default:
      return null;
  }
}
