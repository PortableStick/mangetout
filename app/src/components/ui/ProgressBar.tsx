import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface ProgressBarProps {
  /** Valeur entre 0 et 1 (bornée). */
  progress: number;
  color?: string;
  height?: number;
}

/** Barre de progression discrète (piste + remplissage arrondi). */
export function ProgressBar({ progress, color, height = 8 }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View
      style={{
        height,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: theme.radius.pill,
          backgroundColor: color ?? theme.colors.accent,
        }}
      />
    </View>
  );
}
