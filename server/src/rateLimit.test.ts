import { describe, expect, it } from 'vitest';

import { RateLimiter } from './rateLimit.ts';

describe('RateLimiter', () => {
  it('autorise jusqu’à la limite puis bloque dans la fenêtre', () => {
    const rl = new RateLimiter(3, 60_000);
    expect(rl.allow('u1', 1000)).toBe(true);
    expect(rl.allow('u1', 1001)).toBe(true);
    expect(rl.allow('u1', 1002)).toBe(true);
    expect(rl.allow('u1', 1003)).toBe(false);
    expect(rl.remaining('u1', 1003)).toBe(0);
  });

  it('réinitialise à la fenêtre suivante', () => {
    const rl = new RateLimiter(1, 60_000);
    expect(rl.allow('u1', 0)).toBe(true);
    expect(rl.allow('u1', 100)).toBe(false);
    expect(rl.allow('u1', 60_000)).toBe(true);
  });

  it('isole les utilisateurs', () => {
    const rl = new RateLimiter(1, 60_000);
    expect(rl.allow('a', 0)).toBe(true);
    expect(rl.allow('b', 0)).toBe(true);
  });
});
