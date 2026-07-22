import { describe, expect, it } from '@jest/globals';

import { fontFamily, palettes, radius, shadow, spacing, typography, voltGlow, withAlpha } from './tokens';

/** Clés `Palette` consommées ailleurs dans l'app (grep `theme.colors.*` + `color="..."`) —
 * TOUTES doivent continuer d'exister après la refonte, remappées sur volt/ink/bone. */
const CONSUMED_PALETTE_KEYS = [
  'background',
  'surface',
  'surfaceMuted',
  'separator',
  'text',
  'textSecondary',
  'textTertiary',
  'accent',
  'onAccent',
  'accentMuted',
  'success',
  'warning',
  'danger',
  'onDanger',
  'shadow',
] as const;

/** Nouvelles clés ajoutées pour le kit M22. */
const NEW_PALETTE_KEYS = [
  'surfaceRaised',
  'surfaceHover',
  'borderStrong',
  'signalRest',
  'signalRestDim',
  'warnDim',
  'failDim',
] as const;

/** Variants `Text` consommés par les écrans existants (grep `variant="..."`). */
const CONSUMED_TYPOGRAPHY_VARIANTS = [
  'largeTitle',
  'title1',
  'title2',
  'title3',
  'headline',
  'body',
  'callout',
  'subhead',
  'footnote',
  'caption',
] as const;

const NEW_TYPOGRAPHY_VARIANTS = ['mega', 'displayLg', 'display', 'title', 'label', 'mono'] as const;

describe('tokens', () => {
  it('palette dark expose toutes les clés consommées (anciennes remappées + nouvelles)', () => {
    for (const key of [...CONSUMED_PALETTE_KEYS, ...NEW_PALETTE_KEYS]) {
      expect(palettes.dark[key]).toMatch(/^#|rgba/);
    }
  });

  it('palettes.light est un alias identique de palettes.dark (thème sombre uniquement)', () => {
    expect(palettes.light).toEqual(palettes.dark);
    for (const key of [...CONSUMED_PALETTE_KEYS, ...NEW_PALETTE_KEYS]) {
      expect(palettes.light[key]).toBe(palettes.dark[key]);
    }
  });

  it('accent = volt (#CDFB49)', () => {
    expect(palettes.dark.accent).toBe('#CDFB49');
    expect(palettes.dark.success).toBe('#CDFB49');
    expect(palettes.dark.onAccent).toBe('#0B0C0A');
  });

  it('danger = signal-fail (#FF5C48), onDanger = texte clair (bone-0)', () => {
    expect(palettes.dark.danger).toBe('#FF5C48');
    expect(palettes.dark.onDanger).toBe('#F4F3EC');
  });

  it('warning = signal-warn (#FFB03A)', () => {
    expect(palettes.dark.warning).toBe('#FFB03A');
  });

  it('background/surface/text reprennent ink/bone', () => {
    expect(palettes.dark.background).toBe('#0B0C0A');
    expect(palettes.dark.surface).toBe('#1A1C17');
    expect(palettes.dark.surfaceRaised).toBe('#121310');
    expect(palettes.dark.text).toBe('#F4F3EC');
    expect(palettes.dark.textSecondary).toBe('#C9C8BE');
    expect(palettes.dark.textTertiary).toBe('#8B8A80');
  });

  it('radius.pill === 999, échelle resserrée (xl remappé à 12)', () => {
    expect(radius.pill).toBe(999);
    expect(radius.sm).toBe(4);
    expect(radius.md).toBe(8);
    expect(radius.lg).toBe(12);
    expect(radius.xl).toBe(12);
  });

  it('échelle d’espacement base-4 conservée et monotone', () => {
    expect(spacing.xs).toBeLessThan(spacing.sm);
    expect(spacing.sm).toBeLessThan(spacing.lg);
    expect(spacing.lg).toBeLessThan(spacing.xxl);
    expect(spacing.xxl).toBeLessThan(spacing.xxxl);
  });

  it('expose toutes les variantes typo consommées par les écrans existants', () => {
    for (const variant of CONSUMED_TYPOGRAPHY_VARIANTS) {
      expect(typography[variant].fontFamily).toBeTruthy();
      expect(typography[variant].fontSize).toBeGreaterThan(0);
    }
  });

  it('ajoute les nouvelles variantes du design system (mega, label, etc.)', () => {
    for (const variant of NEW_TYPOGRAPHY_VARIANTS) {
      expect(typography[variant].fontFamily).toBeTruthy();
      expect(typography[variant].fontSize).toBeGreaterThan(0);
    }
    expect(typography.mega.fontSize).toBe(96);
    expect(typography.label.fontSize).toBe(11);
    expect(typography.display.fontSize).toBe(40);
    expect(typography.displayLg.fontSize).toBe(56);
    expect(typography.title.fontSize).toBe(24);
  });

  it('les variantes display/mega/label utilisent Anton ou mono, en majuscules', () => {
    expect(typography.mega.fontFamily).toBe(fontFamily.display);
    expect(typography.mega.textTransform).toBe('uppercase');
    expect(typography.label.fontFamily).toBe(fontFamily.mono);
    expect(typography.label.textTransform).toBe('uppercase');
  });

  it('fontFamily expose les familles Anton/Archivo/IBM Plex Mono', () => {
    expect(fontFamily.display).toBe('Anton_400Regular');
    expect(fontFamily.regular).toBe('Archivo_400Regular');
    expect(fontFamily.medium).toBe('Archivo_500Medium');
    expect(fontFamily.semibold).toBe('Archivo_600SemiBold');
    expect(fontFamily.bold).toBe('Archivo_700Bold');
    expect(fontFamily.mono).toBe('IBMPlexMono_400Regular');
    expect(fontFamily.monoMedium).toBe('IBMPlexMono_500Medium');
    expect(fontFamily.monoSemibold).toBe('IBMPlexMono_600SemiBold');
  });

  it('shadow() renvoie un preset plat (look sans ombre portée)', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const level of ['sm', 'md', 'lg'] as const) {
        const s = shadow(scheme, level);
        expect(s.shadowOpacity).toBe(0);
        expect(s.elevation).toBe(0);
      }
    }
  });

  it('voltGlow expose le glow volt du handoff', () => {
    expect(voltGlow.shadowColor).toBe('#CDFB49');
    expect(voltGlow.shadowOpacity).toBe(0.25);
    expect(voltGlow.shadowRadius).toBe(24);
  });

  it('withAlpha() convertit un hex #rrggbb en rgba', () => {
    expect(withAlpha('#CDFB49', 0.5)).toBe('rgba(205, 251, 73, 0.5)');
  });

  it('withAlpha() renvoie l’entrée telle quelle si ce n’est pas un hex #rrggbb valide', () => {
    expect(withAlpha('rgba(0,0,0,0.5)', 0.5)).toBe('rgba(0,0,0,0.5)');
    expect(withAlpha('#fff', 0.5)).toBe('#fff');
    expect(withAlpha('not-a-color', 0.5)).toBe('not-a-color');
  });
});
