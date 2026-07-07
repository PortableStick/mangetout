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
  | 'success'
  | 'warning';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorKey;
  center?: boolean;
}

/** Texte typé sur l'échelle typographique du thème. Défaut : body / texte principal. */
export function Text({ variant = 'body', color = 'text', center, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
