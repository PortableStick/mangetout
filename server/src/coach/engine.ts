import { config } from '../config.ts';
import { executeReadTool, type CoachContext } from './execute.ts';
import { isAction, toolDefinitions, validateToolCall } from './tools.ts';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  [key: string]: unknown;
}

export type CoachResult =
  | { type: 'message'; text: string }
  | { type: 'proposal'; tool: string; args: unknown; summary: string }
  | { type: 'error'; error: string };

function safeJson(s: unknown): unknown {
  if (typeof s !== 'string') return s ?? {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

/** Récapitulatif lisible d'une action proposée (carte de confirmation). */
export function proposalSummary(tool: string, args: Record<string, unknown>): string {
  switch (tool) {
    case 'add_food_entry':
      return `Ajouter « ${args.name} » (${args.quantity_g} g, ${args.kcal} kcal) au journal.`;
    case 'add_weight_entry':
      return `Enregistrer une pesée de ${args.weight_kg} kg.`;
    case 'update_goals':
      return `Mettre à jour tes objectifs (${args.kcal ?? '—'} kcal).`;
    default:
      return `Action : ${tool}.`;
  }
}

const SYSTEM =
  "Tu es le coach de mangetout, bienveillant et neutre. Utilise les outils de LECTURE pour connaître le contexte de l'utilisateur avant de répondre. Pour toute ACTION (écriture), propose-la — elle sera confirmée par l'utilisateur avant application. Ne fixe jamais d'objectif agressif. Réponds en français.";

/**
 * Un tour de coach : boucle de tool-calling. Les outils LECTURE sont exécutés
 * (owner-scoped) ; le premier outil ACTION est renvoyé comme PROPOSITION (non exécuté).
 * Gère le passthrough `reasoning_content` de DeepSeek (message assistant ré-empilé tel quel).
 */
export async function runCoach(
  history: ChatMessage[],
  ctx: CoachContext,
  now: number,
  fetchImpl: typeof fetch = fetch,
  maxHops = 4
): Promise<CoachResult> {
  const convo: ChatMessage[] = [{ role: 'system', content: SYSTEM }, ...history];

  for (let hop = 0; hop < maxHops; hop++) {
    const res = await fetchImpl(`${config.openRouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'mangetout',
      },
      body: JSON.stringify({
        model: config.openRouter.modelText,
        messages: convo,
        tools: toolDefinitions(),
        temperature: 0.3,
      }),
    });
    if (!res.ok) return { type: 'error', error: `OpenRouter ${res.status}` };

    const data = (await res.json()) as {
      choices?: { message?: ChatMessage & { tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
    };
    const msg = data.choices?.[0]?.message;
    const calls = msg?.tool_calls;
    if (!msg || !calls || calls.length === 0) {
      return { type: 'message', text: msg?.content ?? '' };
    }

    const call = calls[0]!;
    const name = call.function.name;
    const args = safeJson(call.function.arguments);
    const validation = validateToolCall(name, args);

    if (!validation.ok) {
      convo.push(msg);
      convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: validation.error }) } as ChatMessage);
      continue;
    }

    if (isAction(name)) {
      return {
        type: 'proposal',
        tool: name,
        args: validation.args,
        summary: proposalSummary(name, validation.args as Record<string, unknown>),
      };
    }

    // Outil de lecture : exécuté côté serveur, résultat ré-injecté (avec reasoning_content).
    const result = await executeReadTool(name, ctx, now);
    convo.push(msg);
    convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result ?? {}) } as ChatMessage);
  }

  return { type: 'message', text: 'Je n’ai pas réussi à conclure. Peux-tu reformuler ?' };
}
