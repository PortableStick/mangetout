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
  mealPlanSchema,
  parseFoodSchema,
  recipeSchema,
  shoppingListSchema,
  singleDaySchema,
  substitutionsSchema,
  summarySchema,
} from './schemas.ts';

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

  return app;
}
