import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { withAlpha } from '@/theme/tokens';

type Tone = 'accent' | 'neutral' | 'danger';

interface IconButtonProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  tone?: Tone;
  size?: number;
}

/** Bouton icône rond (ex. actions rapides d'une carte ou d'un header). */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  tone = 'neutral',
  size = 44,
}: IconButtonProps) {
  const theme = useTheme();

  const backgrounds: Record<Tone, string> = {
    accent: theme.colors.accent,
    neutral: theme.colors.surfaceMuted,
    danger: withAlpha(theme.colors.danger, 0.15),
  };
  const iconColors: Record<Tone, string> = {
    accent: theme.colors.onAccent,
    neutral: theme.colors.text,
    danger: theme.colors.danger,
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: theme.radius.pill,
        backgroundColor: backgrounds[tone],
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={name} size={size * 0.5} color={iconColors[tone]} />
    </Pressable>
  );
}
