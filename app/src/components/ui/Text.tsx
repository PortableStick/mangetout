import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { TypographyVariant } from '@/theme/tokens';

type ColorKey =
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'accent'
  | 'onAccent'
  | 'danger'
  | 'onDanger'
  | 'success'
  | 'warning';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorKey;
  center?: boolean;
  /** Chiffres à chasse fixe (`fontVariant: ['tabular-nums']`) — stats, poids, timers. */
  tabular?: boolean;
  /** Force la mise en majuscules, indépendamment du `textTransform` du variant. */
  uppercase?: boolean;
}

/** Texte typé sur l'échelle typographique du thème. Défaut : body / texte principal. */
export function Text({
  variant = 'body',
  color = 'text',
  center,
  tabular,
  uppercase,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[
        // Le style du variant (dont son éventuel `textTransform: 'uppercase'`, ex. display*/label) est
        // propagé tel quel — pas de logique dédiée nécessaire, c'est un objet de style standard.
        theme.typography[variant],
        { color: theme.colors[color] },
        center && { textAlign: 'center' },
        tabular && { fontVariant: ['tabular-nums'] },
        uppercase && { textTransform: 'uppercase' },
        style,
      ]}
      {...rest}
    />
  );
}
