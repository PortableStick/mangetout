import { describe, expect, it } from '@jest/globals';

import { palettes, shadow, spacing, withAlpha } from './tokens';

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

  it('withAlpha() convertit un hex #rrggbb en rgba', () => {
    expect(withAlpha('#1F9E5E', 0.5)).toBe('rgba(31, 158, 94, 0.5)');
  });

  it('withAlpha() renvoie l’entrée telle quelle si ce n’est pas un hex #rrggbb valide', () => {
    expect(withAlpha('rgba(0,0,0,0.5)', 0.5)).toBe('rgba(0,0,0,0.5)');
    expect(withAlpha('#fff', 0.5)).toBe('#fff');
    expect(withAlpha('not-a-color', 0.5)).toBe('not-a-color');
  });

  it('palette expose onDanger pour le texte sur fond danger', () => {
    expect(palettes.light.onDanger).toBe('#FFFFFF');
    expect(palettes.dark.onDanger).toBe('#FFFFFF');
  });
});
