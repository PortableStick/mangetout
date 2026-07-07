/**
 * Tokens de design — direction « Apple, ultra clean ».
 * Palette restreinte, une couleur d'accent (vert, clin d'œil à « mangetout »),
 * contrastes AA, dark mode natif complet. Ombres légères plutôt que bordures marquées.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** Fond de l'écran (le plus en retrait). */
  background: string;
  /** Fond des surfaces surélevées (cartes, listes). */
  surface: string;
  /** Surface secondaire (regroupée, plus contrastée que surface). */
  surfaceMuted: string;
  /** Séparateurs discrets. */
  separator: string;
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
  /** Ombre (couleur de base, opacité gérée par les presets). */
  shadow: string;
}

const light: Palette = {
  background: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EDEDF0',
  separator: 'rgba(60,60,67,0.14)',
  text: '#1C1C1E',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  accent: '#1F9E5E',
  onAccent: '#FFFFFF',
  accentMuted: 'rgba(31,158,94,0.12)',
  success: '#1F9E5E',
  warning: '#C77700',
  danger: '#D7382F',
  shadow: '#000000',
};

const dark: Palette = {
  background: '#0B0B0C',
  surface: '#1C1C1E',
  surfaceMuted: '#2C2C2E',
  separator: 'rgba(84,84,88,0.6)',
  text: '#F5F5F7',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  accent: '#3DDC84',
  onAccent: '#06130C',
  accentMuted: 'rgba(61,220,132,0.16)',
  success: '#3DDC84',
  warning: '#FFB340',
  danger: '#FF6961',
  shadow: '#000000',
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Échelle d'espacement (base 4). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Rayons — coins arrondis généreux, style Apple. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/** Famille de police embarquée (Inter — grotesque neutre soignée, pas Roboto brut). */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Échelle typographique inspirée iOS. */
export const typography = {
  largeTitle: { fontFamily: fontFamily.bold, fontSize: 34, lineHeight: 41, letterSpacing: 0.37 },
  title1: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34, letterSpacing: 0.36 },
  title2: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28, letterSpacing: 0.35 },
  title3: { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 25, letterSpacing: 0.38 },
  headline: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  body: { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  callout: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 21, letterSpacing: -0.32 },
  subhead: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 20, letterSpacing: -0.24 },
  footnote: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Presets d'ombre (profondeur douce). Android utilise elevation. */
export function shadow(scheme: ColorScheme, level: 'sm' | 'md' | 'lg') {
  const opacity = scheme === 'dark' ? { sm: 0.4, md: 0.5, lg: 0.6 } : { sm: 0.06, md: 0.1, lg: 0.16 };
  const config = {
    sm: { radius: 6, offset: 2, elevation: 2 },
    md: { radius: 14, offset: 6, elevation: 6 },
    lg: { radius: 24, offset: 12, elevation: 12 },
  }[level];
  return {
    shadowColor: palettes[scheme].shadow,
    shadowOpacity: opacity[level],
    shadowRadius: config.radius,
    shadowOffset: { width: 0, height: config.offset },
    elevation: config.elevation,
  };
}
