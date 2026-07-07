/** Configuration serveur. Secrets lus en env — la clé OpenRouter reste ici. */
export const config = {
  port: Number(process.env.PORT ?? 8787),
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    modelText: process.env.AI_MODEL_TEXT ?? 'deepseek/deepseek-v4-flash',
    modelTextPro: process.env.AI_MODEL_TEXT_PRO ?? 'deepseek/deepseek-v4-pro',
    modelVision: process.env.AI_MODEL_VISION ?? 'google/gemini-2.5-flash',
  },
  pbInternalUrl: process.env.PB_INTERNAL_URL ?? 'http://pocketbase:8090',
  rateLimitPerMin: Number(process.env.AI_RATE_LIMIT_PER_MIN ?? 20),
} as const;

/** L'IA est-elle configurée (clé présente) ? Sinon les endpoints renvoient 503. */
export function aiConfigured(): boolean {
  return config.openRouter.apiKey.length > 0;
}
