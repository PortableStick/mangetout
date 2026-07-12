import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { withAlpha } from '@/theme/tokens';

import { Text } from './Text';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

/** Petite pastille de statut, teinte selon `tone`. */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const theme = useTheme();

  const backgrounds: Record<Tone, string> = {
    neutral: theme.colors.surfaceMuted,
    accent: theme.colors.accentMuted,
    success: withAlpha(theme.colors.success, 0.15),
    warning: withAlpha(theme.colors.warning, 0.15),
    danger: withAlpha(theme.colors.danger, 0.15),
  };
  const textColors: Record<Tone, 'textSecondary' | 'accent' | 'success' | 'warning' | 'danger'> = {
    neutral: 'textSecondary',
    accent: 'accent',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
  };

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: backgrounds[tone],
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Text variant="caption" color={textColors[tone]}>
        {label}
      </Text>
    </View>
  );
}
