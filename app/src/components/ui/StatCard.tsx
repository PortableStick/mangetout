import type { ViewStyle } from 'react-native';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { voltGlow } from '@/theme/tokens';

import { Card } from './Card';
import { Text } from './Text';

export type StatCardDeltaTone = 'volt' | 'warn' | 'fail' | 'rest' | 'neutral';

interface StatCardProps {
  /** Libellé mono, majuscule (ex. « Volume hebdo »). */
  label: string;
  /** Le chiffre, en gros — reste court. */
  value: string | number;
  /** Unité mono (« KG », « BPM », « MIN »). */
  unit?: string;
  /** Ligne de delta mono, teintée selon `deltaTone` (ex. « +7,5 vs sem. dern. »). */
  delta?: string;
  deltaTone?: StatCardDeltaTone;
  /** Bordure + lueur volt — réservé aux records personnels. */
  accent?: boolean;
  style?: ViewStyle;
}

/** Carte métrique : label mono, chiffre display, unité, delta teinté. Le cheval de bataille des dashboards. */
export function StatCard({ label, value, unit, delta, deltaTone = 'volt', accent, style }: StatCardProps) {
  const theme = useTheme();

  const toneColor: Record<StatCardDeltaTone, string> = {
    volt: theme.colors.success,
    warn: theme.colors.warning,
    fail: theme.colors.danger,
    rest: theme.colors.signalRest,
    neutral: theme.colors.textTertiary,
  };

  const cardStyle: ViewStyle = {
    ...(accent
      ? { borderWidth: 1, borderColor: theme.colors.accent, ...voltGlow }
      : null),
    ...style,
  };

  return (
    <Card style={cardStyle}>
      <Text variant="label" color="textTertiary">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text variant="display" tabular>
          {value}
        </Text>
        {unit ? (
          <Text variant="mono" color="textTertiary" uppercase style={{ fontSize: 13 }}>
            {unit}
          </Text>
        ) : null}
      </View>
      {delta ? (
        <Text variant="mono" tabular style={{ fontSize: 13, color: toneColor[deltaTone] }}>
          {delta}
        </Text>
      ) : null}
    </Card>
  );
}
