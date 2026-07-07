import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockMem = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockMem.set(k, v);
  }),
  getItemAsync: jest.fn(async (k: string) => (mockMem.has(k) ? mockMem.get(k)! : null)),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockMem.delete(k);
  }),
}));

import { clearSecure, loadSecure, saveSecure, splitChunks } from './secureStore';

describe('secureStore', () => {
  beforeEach(() => mockMem.clear());

  it('splitChunks respecte la taille et couvre toute la chaîne', () => {
    const s = 'a'.repeat(4001);
    const chunks = splitChunks(s, 1800);
    expect(chunks).toHaveLength(3);
    expect(chunks.join('')).toBe(s);
    expect(chunks[0]!.length).toBe(1800);
  });

  it('découpe en respectant la taille en OCTETS (caractères multi-octets)', () => {
    const s = 'é'.repeat(1000); // 2 octets chacun en UTF-8 → 2000 octets
    const chunks = splitChunks(s, 1800);
    const enc = new TextEncoder();
    for (const c of chunks) expect(enc.encode(c).length).toBeLessThanOrEqual(1800);
    expect(chunks.join('')).toBe(s);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('round-trip d’un payload plus grand qu’un fragment', async () => {
    const payload = JSON.stringify({ token: 'x'.repeat(4000), record: { id: '1' } });
    await saveSecure('pb_auth', payload);
    // Plusieurs fragments écrits + un compteur.
    expect(Number(mockMem.get('pb_auth.count'))).toBeGreaterThan(1);
    await expect(loadSecure('pb_auth')).resolves.toBe(payload);
  });

  it('un payload plus court supprime les fragments obsolètes', async () => {
    await saveSecure('pb_auth', 'y'.repeat(5000)); // 3 fragments
    await saveSecure('pb_auth', 'z'.repeat(100)); // 1 fragment
    expect(mockMem.has('pb_auth.1')).toBe(false);
    expect(mockMem.has('pb_auth.2')).toBe(false);
    await expect(loadSecure('pb_auth')).resolves.toBe('z'.repeat(100));
  });

  it('clearSecure retire tous les fragments et le compteur', async () => {
    await saveSecure('pb_auth', 'w'.repeat(3000));
    await clearSecure('pb_auth');
    expect([...mockMem.keys()]).toHaveLength(0);
    await expect(loadSecure('pb_auth')).resolves.toBeNull();
  });

  it('loadSecure renvoie null quand rien n’est stocké', async () => {
    await expect(loadSecure('absent')).resolves.toBeNull();
  });
});
