/**
 * Tokens de design — identité « volt / ink / bone » (handoff design system, sombre uniquement).
 * Ink = sol de salle de sport (noir chaud), bone = blancs cassés pour le texte, volt = accent
 * signature (vert chalk-under-blacklight). Look plat, tendu, mécanique — pas d'ombres portées,
 * rayons resserrés, typo display en majuscules (Anton) + corps Archivo + labels mono (IBM Plex Mono).
 *
 * Le thème est **sombre uniquement** : `palettes.light` est un alias identique de `palettes.dark`
 * (on n'invente pas de variante claire) afin que `useColorScheme` ne casse rien côté consommateurs.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** Fond de l'écran (le plus en retrait). */
  background: string;
  /** Fond des surfaces surélevées (cartes, listes). */
  surface: string;
  /** Surface secondaire (regroupée, plus contrastée que surface). */
  surfaceMuted: string;
  /** Surface surélevée (ex. barres, sheets). */
  surfaceRaised: string;
  /** Surface au survol/pressed. */
  surfaceHover: string;
  /** Séparateurs discrets (hairline). */
  separator: string;
  /** Bordure marquée (ex. contour de champ actif). */
  borderStrong: string;
  /** Texte principal. */
  text: string;
  /** Texte secondaire. */
  textSecondary: string;
  /** Texte tertiaire / placeholder. */
  textTertiary: string;
  /** Couleur d'accent (actions, sélection). */
  accent: string;
  /** Texte/icône posé sur l'accent. */
  onAccent: string;
  /** Accent atténué (fonds de badges, pistes de progression). */
  accentMuted: string;
  /** Sémantiques. */
  success: string;
  warning: string;
  danger: string;
  /** Texte/icône posé sur le fond danger. */
  onDanger: string;
  /** Signal « repos / info » (ex. rappel récupération). */
  signalRest: string;
  /** Signal « repos » atténué (fond de badge). */
  signalRestDim: string;
  /** Signal « attention » atténué (fond de badge). */
  warnDim: string;
  /** Signal « échec » atténué (fond de badge). */
  failDim: string;
  /** Ombre (couleur de base, opacité gérée par les presets). */
  shadow: string;
}

const dark: Palette = {
  background: '#0B0C0A',
  surface: '#1A1C17',
  surfaceMuted: '#24261F',
  surfaceRaised: '#121310',
  surfaceHover: '#24261F',
  separator: 'rgba(244, 243, 236, 0.08)',
  borderStrong: 'rgba(244, 243, 236, 0.16)',
  text: '#F4F3EC',
  textSecondary: '#C9C8BE',
  textTertiary: '#8B8A80',
  accent: '#CDFB49',
  onAccent: '#0B0C0A',
  accentMuted: 'rgba(205, 251, 73, 0.12)',
  success: '#CDFB49',
  warning: '#FFB03A',
  danger: '#FF5C48',
  onDanger: '#F4F3EC',
  signalRest: '#6FA8FF',
  signalRestDim: 'rgba(111, 168, 255, 0.12)',
  warnDim: 'rgba(255, 176, 58, 0.12)',
  failDim: 'rgba(255, 92, 72, 0.12)',
  shadow: '#000000',
};

/** Thème sombre uniquement : `light` est un alias identique de `dark`, pas une variante claire. */
export const palettes: Record<ColorScheme, Palette> = { light: dark, dark };

/**
 * Dérive une teinte à faible opacité depuis une couleur hex de la palette.
 * @param hex couleur `#rrggbb`. Toute autre forme (rgba, mot-clé, hex court…) est renvoyée telle quelle.
 */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex;
  }
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.substring(0, 2), 16);
  const g = Number.parseInt(clean.substring(2, 4), 16);
  const b = Number.parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Échelle d'espacement (base 4) — conservée telle quelle. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Rayons — resserrés, cette identité n'est pas « soft » (xl remappé à 12, comme lg). */
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 12,
  pill: 999,
} as const;

/** Familles de police embarquées : display Anton (majuscules), corps Archivo, labels/data mono IBM Plex Mono. */
export const fontFamily = {
  display: 'Anton_400Regular',
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemibold: 'IBMPlexMono_600SemiBold',
} as const;

/** Traitements du handoff (leading/tracking), utilisés pour dériver l'échelle typo ci-dessous. */
const LEADING = { display: 1.05, tight: 1.15, body: 1.5 } as const;
const TRACKING = { display: 0.01, label: 0.14 } as const;

/** `fontSize * leading`, arrondi au pixel. */
function lh(fontSize: number, leading: number): number {
  return Math.round(fontSize * leading);
}

/** `fontSize * tracking` (em), arrondi au centième. */
function ls(fontSize: number, tracking: number): number {
  return Math.round(fontSize * tracking * 100) / 100;
}

/**
 * Échelle typographique — identité volt/ink/bone.
 * Nouvelles variantes du design system : `mega`, `displayLg`, `display`, `title`, `label`, `mono`.
 * Anciennes variantes (encore consommées par les écrans existants) remappées sans être retirées :
 * `largeTitle`/`title1` en display Anton, `title2`/`title3`/`headline` en Archivo semibold,
 * `body`/`callout`/`subhead`/`footnote` en Archivo, `caption` en mono (comme `label`).
 */
export const typography = {
  // ── Nouvelles variantes (design system) ──────────────────────────
  mega: {
    fontFamily: fontFamily.display,
    fontSize: 96,
    lineHeight: lh(96, LEADING.display),
    letterSpacing: ls(96, TRACKING.display),
    textTransform: 'uppercase',
  },
  displayLg: {
    fontFamily: fontFamily.display,
    fontSize: 56,
    lineHeight: lh(56, LEADING.display),
    letterSpacing: ls(56, TRACKING.display),
    textTransform: 'uppercase',
  },
  display: {
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: lh(40, LEADING.display),
    letterSpacing: ls(40, TRACKING.display),
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 24,
    lineHeight: lh(24, LEADING.tight),
    letterSpacing: 0,
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    lineHeight: lh(11, LEADING.tight),
    letterSpacing: ls(11, TRACKING.label),
    textTransform: 'uppercase',
  },
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: 15,
    lineHeight: lh(15, LEADING.body),
    letterSpacing: 0,
  },

  // ── Anciennes variantes, remappées (écrans existants, retraduits en M23) ─
  largeTitle: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    lineHeight: lh(36, LEADING.display),
    letterSpacing: ls(36, TRACKING.display),
    textTransform: 'uppercase',
  },
  title1: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    lineHeight: lh(28, LEADING.display),
    letterSpacing: ls(28, TRACKING.display),
    textTransform: 'uppercase',
  },
  title2: {
    fontFamily: fontFamily.semibold,
    fontSize: 22,
    lineHeight: lh(22, LEADING.tight),
    letterSpacing: 0,
  },
  title3: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: lh(20, LEADING.tight),
    letterSpacing: 0,
  },
  headline: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    lineHeight: lh(17, LEADING.tight),
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: lh(15, LEADING.body),
    letterSpacing: 0,
  },
  callout: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: lh(16, LEADING.body),
    letterSpacing: 0,
  },
  subhead: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lh(13, LEADING.body),
    letterSpacing: 0,
  },
  footnote: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lh(13, LEADING.body),
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    lineHeight: lh(11, LEADING.tight),
    letterSpacing: ls(11, TRACKING.label),
    textTransform: 'uppercase',
  },
} as const;

export type TypographyVariant = keyof typeof typography;

/**
 * Presets d'ombre — cette identité est **plate** : pas d'ombre portée, la profondeur vient du
 * contraste ink/bone. La signature (scheme, level) est conservée pour ne pas casser les appelants
 * (`theme.shadow(level)`, `Card`, `SegmentedControl`) ; utiliser `voltGlow` pour un accent lumineux.
 */
export function shadow(scheme: ColorScheme, _level: 'sm' | 'md' | 'lg') {
  return {
    shadowColor: palettes[scheme].shadow,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  };
}

/** Glow volt du handoff (`--shadow-volt`) — accent lumineux ponctuel (ex. bouton primaire, PR). */
export const voltGlow = {
  shadowColor: '#CDFB49',
  shadowOpacity: 0.25,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
} as const;
