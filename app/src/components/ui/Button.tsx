import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  /** Hauteur du bouton : sm 36 / md 44 (défaut) / lg 52. */
  size?: Size;
  /** Icône affichée à gauche du libellé (16-20px, `currentColor`/teinte du variant). */
  icon?: ReactNode;
  /** Étire le bouton sur toute la largeur de son conteneur. */
  fullWidth?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const HEIGHTS: Record<Size, number> = { sm: 36, md: 44, lg: 52 };
const H_PADDING: Record<Size, number> = { sm: 14, md: 20, lg: 28 };
const FONT_SIZES: Record<Size, number> = { sm: 13, md: 15, lg: 16 };

/** Bouton à la iOS : plein (accent), secondaire (surface) ou discret. */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  loading,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: theme.colors.accent,
    secondary: theme.colors.surfaceMuted,
    ghost: 'transparent',
    danger: theme.colors.danger,
  };
  const fg: Record<Variant, 'onAccent' | 'text' | 'accent' | 'onDanger'> = {
    primary: 'onAccent',
    secondary: 'text',
    ghost: 'accent',
    danger: 'onDanger',
  };
  const spinnerColor: Record<Variant, string> = {
    primary: theme.colors.onAccent,
    secondary: theme.colors.accent,
    ghost: theme.colors.accent,
    danger: theme.colors.onDanger,
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg[variant],
          borderRadius: theme.radius.md,
          height: HEIGHTS[size],
          paddingHorizontal: H_PADDING[size],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: pressed && !isDisabled ? [{ scale: 0.97 }] : [{ scale: 1 }],
        },
        fullWidth ? { width: '100%' as const } : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor[variant]} />
      ) : (
        <>
          {icon}
          <Text variant="headline" color={fg[variant]} style={{ fontSize: FONT_SIZES[size] }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
