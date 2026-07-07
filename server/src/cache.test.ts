import { describe, expect, it } from 'vitest';

import { TtlCache } from './cache.ts';

describe('TtlCache', () => {
  it('renvoie la valeur avant expiration', () => {
    const c = new TtlCache<number>(1000);
    c.set('k', 42, 0);
    expect(c.get('k', 500)).toBe(42);
  });

  it('expire après le TTL', () => {
    const c = new TtlCache<number>(1000);
    c.set('k', 42, 0);
    expect(c.get('k', 1000)).toBeUndefined();
    expect(c.get('k', 2000)).toBeUndefined();
  });

  it('miss sur clé absente', () => {
    expect(new TtlCache<number>(1000).get('x', 0)).toBeUndefined();
  });
});
