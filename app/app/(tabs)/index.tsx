import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useHealthData } from '@/features/health/useHealthData';
import { today } from '@/features/food/useFoodLog';
import { useWeightEntries } from '@/features/weight/useWeight';
import { weightStats } from '@/features/weight/weight';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Dashboard d'accueil (route par défaut). Squelette du Milestone 0 :
 * s'enrichit au fur et à mesure que les données arrivent (kcal/macros, poids,
 * pas & calories actives, séries, streak, raccourcis).
 */
export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: weightEntries = [] } = useWeightEntries();
  const weight = weightStats(weightEntries);
  const health = useHealthData(today());

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
      <Pressable onPress={() => router.push('/weight')}>
        <Card>
          <Text variant="headline">Poids</Text>
          {weight.latest !== undefined ? (
            <>
              <Text variant="title2">{weight.latest} kg</Text>
              <Text variant="footnote" color="textTertiary">
                {weight.delta > 0 ? '+' : ''}
                {weight.delta} kg depuis le début · appuie pour le détail
              </Text>
            </>
          ) : (
            <Text variant="subhead" color="textSecondary">
              Ajoute une pesée pour suivre la tendance.
            </Text>
          )}
        </Card>
      </Pressable>

      {/* Activité (Health Connect) */}
      <Card>
        <Text variant="headline">Activité</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.xl, marginTop: theme.spacing.xs }}>
          <Stat label="Pas" value={health.summary.steps > 0 ? String(health.summary.steps) : '—'} />
          <Stat
            label="Cal. actives"
            value={health.summary.activeCalories > 0 ? `${health.summary.activeCalories}` : '—'}
          />
          <Stat label="Streak" value="0 j" />
        </View>
        {health.providerName === 'health-connect' && health.summary.steps === 0 ? (
          <Pressable onPress={health.requestPermission} disabled={health.requesting}>
            <Text variant="footnote" color="accent">
              {health.requesting ? 'Connexion…' : 'Connecter Health Connect'}
            </Text>
          </Pressable>
        ) : null}
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
