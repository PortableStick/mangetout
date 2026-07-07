import { describe, expect, it } from '@jest/globals';

import { palettes, shadow, spacing } from './tokens';

describe('tokens', () => {
  it('expose une palette claire et sombre complètes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const p = palettes[scheme];
      expect(p.background).toMatch(/^#|rgba/);
      expect(p.accent).toMatch(/^#|rgba/);
      expect(p.text).toMatch(/^#|rgba/);
    }
  });

  it('shadow() renvoie une elevation croissante avec le niveau', () => {
    const sm = shadow('light', 'sm');
    const lg = shadow('light', 'lg');
    expect(lg.elevation).toBeGreaterThan(sm.elevation);
    expect(sm.shadowOpacity).toBeLessThan(shadow('dark', 'sm').shadowOpacity);
  });

  it('l’échelle d’espacement est monotone', () => {
    expect(spacing.xs).toBeLessThan(spacing.sm);
    expect(spacing.sm).toBeLessThan(spacing.lg);
    expect(spacing.lg).toBeLessThan(spacing.xxl);
  });
});
