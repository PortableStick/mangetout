/**
 * Proxy IA mangetout — squelette (Milestone 0).
 * Détiendra la clé OpenRouter et exposera /api/ai/* au Milestone 8.
 * Pour l'instant : serveur de santé zéro-dépendance (Node http natif).
 *
 * Règle non négociable : la clé OpenRouter (OPENROUTER_API_KEY) ne quitte
 * JAMAIS ce serveur. L'app mobile appelle ce proxy, jamais OpenRouter en direct.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);
const AI_CONFIGURED = Boolean(process.env.OPENROUTER_API_KEY);

const server = createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', aiConfigured: AI_CONFIGURED }));
    return;
  }

  if (req.url?.startsWith('/api/ai/')) {
    // Endpoints IA implémentés au Milestone 8 (proxy OpenRouter, zod, cache, rate-limit).
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'IA non encore implémentée (Milestone 8).' }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[ai-proxy] écoute sur :${PORT} (IA configurée: ${AI_CONFIGURED})`);
});
