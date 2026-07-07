import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { chatJSON, extractJson } from './openrouter.ts';

const schema = z.object({ items: z.array(z.object({ name: z.string() })) });

function mockFetch(contents: string[]) {
  let i = 0;
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: contents[Math.min(i++, contents.length - 1)] } }] }),
  })) as unknown as typeof fetch;
}

describe('extractJson', () => {
  it('parse du JSON brut', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('parse du JSON entre fences ```json', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('extrait un objet noyé dans du texte', () => {
    expect(extractJson('Voici: {"a":1} merci')).toEqual({ a: 1 });
  });
  it('lève si aucun JSON', () => {
    expect(() => extractJson('pas de json')).toThrow();
  });
});

describe('chatJSON', () => {
  it('valide une sortie conforme', async () => {
    const out = await chatJSON({
      model: 'm',
      system: 's',
      user: 'u',
      schema,
      fetchImpl: mockFetch(['{"items":[{"name":"oeuf"}]}']),
    });
    expect(out.items[0]!.name).toBe('oeuf');
  });

  it('réessaie sur JSON invalide puis réussit', async () => {
    const fetchImpl = mockFetch(['{"items":"nope"}', '{"items":[{"name":"pain"}]}']);
    const out = await chatJSON({ model: 'm', system: 's', user: 'u', schema, fetchImpl, retries: 1 });
    expect(out.items[0]!.name).toBe('pain');
  });

  it('rejette après épuisement des tentatives', async () => {
    const fetchImpl = mockFetch(['{"bad":1}']);
    await expect(
      chatJSON({ model: 'm', system: 's', user: 'u', schema, fetchImpl, retries: 1 })
    ).rejects.toThrow(/invalide/);
  });
});
