import { ActivityIndicator, Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: ViewStyle;
}

/** Bouton à la iOS : plein (accent), secondaire (surface) ou discret. */
export function Button({
  label,
  variant = 'primary',
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
          paddingVertical: 15,
          paddingHorizontal: theme.spacing.xl,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: pressed && !isDisabled ? [{ scale: 0.98 }] : [{ scale: 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor[variant]} />
      ) : (
        <Text variant="headline" color={fg[variant]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
