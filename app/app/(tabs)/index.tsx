import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useGoals } from '@/features/goals/useGoals';
import { useHealthData } from '@/features/health/useHealthData';
import { goalProgress, sumMacros } from '@/features/food/nutrition';
import { today, useEntryDates, useFoodEntries } from '@/features/food/useFoodLog';
import type { Reco } from '@/features/stats/coaching';
import { computeStreak } from '@/features/stats/streak';
import { RECO_LEVEL_LABEL, RECO_LEVEL_TONE, RECO_SOURCE_LABEL, useCoaching } from '@/features/stats/useCoaching';
import { useWeightEntries } from '@/features/weight/useWeight';
import { weightStats } from '@/features/weight/weight';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Dashboard d'accueil (route par défaut). Agrège : kcal/macros du jour vs objectif,
 * tendance de poids, activité (Health Connect), streak.
 */
export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const date = today();
  const { data: entries = [] } = useFoodEntries(date);
  const { data: goals } = useGoals();
  const { data: entryDates = [] } = useEntryDates();
  const { data: weightEntries = [] } = useWeightEntries();
  const weight = weightStats(weightEntries);
  const health = useHealthData(date);
  const coaching = useCoaching();

  const total = sumMacros(entries);
  const streak = computeStreak(entryDates, date);

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
          <MacroRow label="Calories" unit="kcal" value={total.kcal} goal={goals?.kcal} color={theme.colors.accent} />
          <MacroRow label="Protéines" unit="g" value={total.protein_g} goal={goals?.protein_g} color={theme.colors.success} />
          <MacroRow label="Glucides" unit="g" value={total.carbs_g} goal={goals?.carbs_g} color={theme.colors.warning} />
          <MacroRow label="Lipides" unit="g" value={total.fat_g} goal={goals?.fat_g} color={theme.colors.danger} />
        </View>
        {!goals ? (
          <Text variant="footnote" color="textTertiary">
            Définis tes objectifs dans Réglages pour suivre ta progression.
          </Text>
        ) : null}
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
          <Stat label="Streak" value={`${streak} j`} />
        </View>
        {health.providerName === 'health-connect' && health.summary.steps === 0 ? (
          <Pressable onPress={health.requestPermission} disabled={health.requesting}>
            <Text variant="footnote" color="accent">
              {health.requesting ? 'Connexion…' : 'Connecter Health Connect'}
            </Text>
          </Pressable>
        ) : null}
      </Card>

      {/* Coaching — constats factuels (jamais de prédiction), sourcés (ACSM/ISSN/NIH/RP) */}
      <Card>
        <Text variant="headline">Coaching</Text>
        {coaching.recos.length === 0 ? (
          <Text variant="subhead" color="textSecondary">
            Pas encore assez de données pour du feedback.
          </Text>
        ) : (
          <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xs }}>
            {coaching.recos.map((reco) => (
              <CoachingRecoRow key={reco.id} reco={reco} />
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function CoachingRecoRow({ reco }: { reco: Reco }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="subhead" style={{ flex: 1 }}>
          {reco.message}
        </Text>
        <Badge label={RECO_LEVEL_LABEL[reco.level]} tone={RECO_LEVEL_TONE[reco.level]} />
      </View>
      <Text variant="footnote" color="textTertiary">
        source : {RECO_SOURCE_LABEL[reco.source]}
      </Text>
    </View>
  );
}

function MacroRow({
  label,
  unit,
  value,
  goal,
  color,
}: {
  label: string;
  unit: string;
  value: number;
  goal?: number;
  color: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="subhead" color="textSecondary">
          {label}
        </Text>
        <Text variant="subhead" color="textTertiary">
          {value} / {goal ?? '—'} {unit}
        </Text>
      </View>
      <ProgressBar progress={goal ? goalProgress(value, goal) : 0} color={color} />
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
