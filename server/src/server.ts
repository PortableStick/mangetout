import { Hono } from 'hono';
import type { z } from 'zod';

import { verifyUser } from './auth.ts';
import { TtlCache } from './cache.ts';
import { aiConfigured, config } from './config.ts';
import { chatJSON } from './openrouter.ts';
import { PROMPTS, type PromptKey } from './prompts.ts';
import { RateLimiter } from './rateLimit.ts';
import {
  estimateSchema,
  labelSchema,
  machinePerceptionSchema,
  machineSchema,
  mealPlanSchema,
  parseFoodSchema,
  platePerceptionSchema,
  recipeSchema,
  shoppingListSchema,
  singleDaySchema,
  substitutionsSchema,
  summarySchema,
} from './schemas.ts';
import { runCoach } from './coach/engine.ts';
import { applyAction } from './coach/execute.ts';
import { chatVisionJSON } from './vision.ts';

const limiter = new RateLimiter(config.rateLimitPerMin);
const cache = new TtlCache<unknown>(1000 * 60 * 60); // 1 h

type Vars = { userId: string };

export function createApp() {
  const app = new Hono<{ Variables: Vars }>();

  app.get('/api/health', (c) => c.json({ status: 'ok', aiConfigured: aiConfigured() }));

  // Garde commune aux endpoints IA : flag, auth, rate-limit.
  app.use('/api/ai/*', async (c, next) => {
    if (!aiConfigured()) return c.json({ error: 'IA non configurée (clé absente).' }, 503);
    const userId = await verifyUser(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Non authentifié.' }, 401);
    if (!limiter.allow(userId, Date.now())) return c.json({ error: 'Trop de requêtes.' }, 429);
    c.set('userId', userId);
    await next();
  });

  /** Fabrique un endpoint texte : body → prompt utilisateur → JSON validé zod. */
  function textRoute<T>(
    path: string,
    promptKey: PromptKey,
    schema: z.ZodType<T>,
    opts: { cache?: boolean; pro?: boolean } = {}
  ) {
    app.post(`/api/ai/${path}`, async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const userId = c.get('userId');
      const cacheKey = `${promptKey}:${userId}:${JSON.stringify(body)}`;
      if (opts.cache) {
        const hit = cache.get(cacheKey, Date.now());
        if (hit) return c.json(hit as object);
      }
      try {
        const out = await chatJSON({
          model: opts.pro ? config.openRouter.modelTextPro : config.openRouter.modelText,
          system: PROMPTS[promptKey].system,
          user: JSON.stringify(body),
          schema,
        });
        if (opts.cache) cache.set(cacheKey, out, Date.now());
        return c.json(out as object);
      } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'Erreur IA' }, 502);
      }
    });
  }

  textRoute('parse-food', 'parseFood', parseFoodSchema, { cache: true });
  textRoute('estimate', 'estimate', estimateSchema, { cache: true });
  textRoute('recipe', 'recipe', recipeSchema, { cache: true });
  textRoute('meal-plan', 'mealPlan', mealPlanSchema, { cache: true, pro: true });
  textRoute('meal-plan/day', 'singleDay', singleDaySchema);
  textRoute('summary', 'summary', summarySchema);
  textRoute('shopping-list', 'shoppingList', shoppingListSchema, { cache: true });
  textRoute('substitutions', 'substitutions', substitutionsSchema, { cache: true });

  // --- Vision : l'image passe par le modèle vision (perception), jamais le texte ---
  app.post('/api/ai/vision/plate', async (c) => {
    const { imageBase64 } = (await c.req.json().catch(() => ({}))) as { imageBase64?: string };
    if (!imageBase64) return c.json({ error: 'image manquante' }, 400);
    try {
      const out = await chatVisionJSON({
        model: config.openRouter.modelVision,
        system: PROMPTS.visionPlate.system,
        imageBase64,
        schema: platePerceptionSchema,
      });
      return c.json(out);
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Erreur vision' }, 502);
    }
  });

  app.post('/api/ai/vision/label', async (c) => {
    const { imageBase64 } = (await c.req.json().catch(() => ({}))) as { imageBase64?: string };
    if (!imageBase64) return c.json({ error: 'image manquante' }, 400);
    try {
      const out = await chatVisionJSON({
        model: config.openRouter.modelVision,
        system: PROMPTS.visionLabel.system,
        imageBase64,
        schema: labelSchema,
      });
      return c.json(out);
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Erreur vision' }, 502);
    }
  });

  // Pipeline perception → raisonnement : Gemini lit l'affiche, DeepSeek normalise.
  app.post('/api/ai/vision/machine', async (c) => {
    const { imageBase64 } = (await c.req.json().catch(() => ({}))) as { imageBase64?: string };
    if (!imageBase64) return c.json({ error: 'image manquante' }, 400);
    try {
      const perception = await chatVisionJSON({
        model: config.openRouter.modelVision,
        system: PROMPTS.visionMachine.system,
        imageBase64,
        schema: machinePerceptionSchema,
      });
      const normalized = await chatJSON({
        model: config.openRouter.modelText,
        system: PROMPTS.machineNormalize.system,
        user: JSON.stringify(perception),
        schema: machineSchema,
      });
      return c.json(normalized);
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Erreur vision' }, 502);
    }
  });

  // --- Coach agentique : lecture exécutée, action = proposition (confirme→applique) ---
  app.post('/api/ai/coach', async (c) => {
    const ctx = { userId: c.get('userId'), token: c.req.header('Authorization') ?? '' };
    const body = (await c.req.json().catch(() => ({}))) as {
      messages?: { role: 'user' | 'assistant'; content: string }[];
    };
    // Borne l'historique (coût/DoS d'inférence) : 30 derniers messages, 20k caractères cumulés.
    const messages = (body.messages ?? []).slice(-30);
    if (messages.reduce((n, m) => n + (m.content?.length ?? 0), 0) > 20_000) {
      return c.json({ error: 'Historique trop volumineux.' }, 413);
    }
    const result = await runCoach(messages, ctx, Date.now());
    return c.json(result);
  });

  app.post('/api/ai/coach/apply', async (c) => {
    const ctx = { userId: c.get('userId'), token: c.req.header('Authorization') ?? '' };
    const body = (await c.req.json().catch(() => ({}))) as { tool?: string; args?: unknown };
    const result = await applyAction(body.tool ?? '', body.args, ctx, Date.now());
    return c.json(result, result.ok ? 200 : 400);
  });

  return app;
}
