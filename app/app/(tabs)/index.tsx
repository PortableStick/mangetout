import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Dashboard d'accueil (route par défaut). Squelette du Milestone 0 :
 * s'enrichit au fur et à mesure que les données arrivent (kcal/macros, poids,
 * pas & calories actives, séries, streak, raccourcis).
 */
export default function DashboardScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="footnote" color="textTertiary">
          Aujourd’hui
        </Text>
        <Text variant="largeTitle">Bonjour 👋</Text>
      </View>

      {/* Calories & macros du jour vs objectif */}
      <Card>
        <Text variant="headline">Calories &amp; macros</Text>
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xs }}>
          <MacroRow label="Calories" unit="kcal" color={theme.colors.accent} />
          <MacroRow label="Protéines" unit="g" color={theme.colors.success} />
          <MacroRow label="Glucides" unit="g" color={theme.colors.warning} />
          <MacroRow label="Lipides" unit="g" color={theme.colors.danger} />
        </View>
        <Text variant="footnote" color="textTertiary">
          Définis tes objectifs dans Réglages pour suivre ta progression.
        </Text>
      </Card>

      {/* Tendance de poids */}
      <Card>
        <Text variant="headline">Poids</Text>
        <Text variant="subhead" color="textSecondary">
          Aucune entrée pour l’instant.
        </Text>
        <Text variant="footnote" color="textTertiary">
          Le graphe de tendance apparaîtra après ta première pesée.
        </Text>
      </Card>

      {/* Activité (Health Connect) */}
      <Card>
        <Text variant="headline">Activité</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.xl, marginTop: theme.spacing.xs }}>
          <Stat label="Pas" value="—" />
          <Stat label="Cal. actives" value="—" />
          <Stat label="Streak" value="0 j" />
        </View>
      </Card>
    </Screen>
  );
}

function MacroRow({ label, unit, color }: { label: string; unit: string; color: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="subhead" color="textSecondary">
          {label}
        </Text>
        <Text variant="subhead" color="textTertiary">
          0 / — {unit}
        </Text>
      </View>
      <ProgressBar progress={0} color={color} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="title3">{value}</Text>
      <Text variant="footnote" color="textTertiary">
        {label}
      </Text>
    </View>
  );
}
