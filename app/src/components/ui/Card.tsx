import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface CardProps {
  children: ReactNode;
  /** Profondeur de l'ombre. `none` = surface plate. */
  elevation?: 'none' | 'sm' | 'md';
  style?: ViewStyle;
}

/** Carte à la iOS : surface arrondie, ombre légère, respire. */
export function Card({ children, elevation = 'sm', style }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          gap: theme.spacing.sm,
        },
        elevation !== 'none' && theme.shadow(elevation),
        style,
      ]}
    >
      {children}
    </View>
  );
}
