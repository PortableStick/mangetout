import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { chatVisionJSON, toDataUrl } from './vision.ts';

const schema = z.object({ raw_name: z.string() });

describe('toDataUrl', () => {
  it('préfixe le base64 brut', () => {
    expect(toDataUrl('AAAA')).toBe('data:image/jpeg;base64,AAAA');
  });
  it('laisse une data URL intacte', () => {
    expect(toDataUrl('data:image/png;base64,ZZ')).toBe('data:image/png;base64,ZZ');
  });
});

describe('chatVisionJSON', () => {
  it('envoie l’image en content multimodal et valide la sortie', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"raw_name":"leg press"}' } }] }),
    })) as unknown as typeof fetch;

    const out = await chatVisionJSON({
      model: 'g',
      system: 's',
      imageBase64: 'AAAA',
      schema,
      fetchImpl,
    });
    expect(out.raw_name).toBe('leg press');

    const calls = (fetchImpl as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls;
    const body = JSON.parse(calls[0]![1].body);
    const parts = body.messages[1].content as { type: string; image_url?: { url: string } }[];
    expect(parts.some((p) => p.type === 'image_url' && p.image_url?.url.startsWith('data:image'))).toBe(true);
  });

  it('rejette une sortie non conforme', async () => {
    const fetchImpl = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"nope":1}' } }] }),
    })) as unknown as typeof fetch;
    await expect(
      chatVisionJSON({ model: 'g', system: 's', imageBase64: 'A', schema, fetchImpl, retries: 0 })
    ).rejects.toThrow(/invalide/);
  });
});
