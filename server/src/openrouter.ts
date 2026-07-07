import type { z } from 'zod';

import { config } from './config.ts';

/** Extrait un objet JSON d'une réponse modèle (tolère les fences ```json). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
      return JSON.parse(fenced);
    } catch {
      const start = fenced.indexOf('{');
      const end = fenced.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(fenced.slice(start, end + 1));
      throw new Error('Sortie IA non-JSON');
    }
  }
}

export interface ChatJsonArgs<T> {
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  fetchImpl?: typeof fetch;
  retries?: number;
}

/**
 * Appel chat OpenRouter forçant une sortie JSON, validée par zod.
 * En cas de JSON invalide, on réessaie (jusqu'à `retries`) puis on rejette.
 */
export async function chatJSON<T>({
  model,
  system,
  user,
  schema,
  fetchImpl = fetch,
  retries = 1,
}: ChatJsonArgs<T>): Promise<T> {
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetchImpl(`${config.openRouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'mangetout',
      },
      body: JSON.stringify({
        model,
        messages: attempt === 0 ? messages : [...messages, { role: 'user', content: 'JSON invalide, renvoie STRICTEMENT le JSON demandé.' }],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';

    const parsed = schema.safeParse(extractJson(content));
    if (parsed.success) return parsed.data;
    lastError = parsed.error;
  }
  throw new Error(`Sortie IA invalide après ${retries + 1} tentative(s): ${String(lastError)}`);
}
