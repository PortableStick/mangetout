import { ActivityIndicator, Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: ViewStyle;
}

/** Bouton à la iOS : plein (accent), secondaire (surface) ou discret. */
export function Button({ label, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: theme.colors.accent,
    secondary: theme.colors.surfaceMuted,
    ghost: 'transparent',
  };
  const fg: Record<Variant, 'onAccent' | 'text' | 'accent'> = {
    primary: 'onAccent',
    secondary: 'text',
    ghost: 'accent',
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
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.onAccent : theme.colors.accent} />
      ) : (
        <Text variant="headline" color={fg[variant]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
