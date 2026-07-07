import type { z } from 'zod';

import { config } from './config.ts';
import { extractJson } from './openrouter.ts';

/** Normalise une entrée image en data URL (accepte base64 brut ou data URL). */
export function toDataUrl(image: string): string {
  return image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
}

export interface ChatVisionArgs<T> {
  model: string;
  system: string;
  imageBase64: string;
  userText?: string;
  schema: z.ZodType<T>;
  fetchImpl?: typeof fetch;
  retries?: number;
}

/**
 * Appel VISION (perception). L'image ne va JAMAIS directement au modèle texte :
 * le modèle vision (Gemini) extrait une sortie structurée, validée zod ici.
 */
export async function chatVisionJSON<T>({
  model,
  system,
  imageBase64,
  userText = 'Analyse cette image et renvoie le JSON demandé.',
  schema,
  fetchImpl = fetch,
  retries = 1,
}: ChatVisionArgs<T>): Promise<T> {
  const messages = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: toDataUrl(imageBase64) } },
      ],
    },
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
      body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, temperature: 0.2 }),
    });
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = schema.safeParse(extractJson(data.choices?.[0]?.message?.content ?? ''));
    if (parsed.success) return parsed.data;
    lastError = parsed.error;
  }
  throw new Error(`Sortie vision invalide après ${retries + 1} tentative(s): ${String(lastError)}`);
}
