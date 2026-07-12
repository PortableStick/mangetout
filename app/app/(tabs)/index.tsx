import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { StatCard } from '@/components/ui/StatCard';
import { Text } from '@/components/ui/Text';
import { today } from '@/features/food/useFoodLog';
import { useCoaching } from '@/features/stats/useCoaching';
import type { ExerciseSet } from '@/features/workouts/types';
import { weeklyVolumeKg, weightKeyFor } from '@/features/workouts/volume';
import { useGyms, useWorkoutDetail, useWorkouts } from '@/features/workouts/useWorkouts';
import { useTheme } from '@/theme/ThemeProvider';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_LABELS = [
  'janv',
  'févr',
  'mars',
  'avr',
  'mai',
  'juin',
  'juil',
  'août',
  'sept',
  'oct',
  'nov',
  'déc',
];

/** Numéro de semaine ISO 8601 (lundi = premier jour, semaine 1 = celle contenant le 4 janvier). */
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // lundi = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // jeudi de cette semaine ISO
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
}

/** « Sam 12 juil · Semaine 04 » — calcul 100% local, sans dépendance de date. */
function formatHeaderDate(date: Date): string {
  const weekday = WEEKDAY_LABELS[date.getDay()];
  const month = MONTH_LABELS[date.getMonth()];
  const week = String(isoWeekNumber(date)).padStart(2, '0');
  return `${weekday} ${date.getDate()} ${month} · Semaine ${week}`;
}

/** Résumé mono d'un exercice à partir de sa 1re série (représentative — l'app ne force pas des séries uniformes). */
function exerciseSummary(sets: ExerciseSet[]): string {
  if (sets.length === 0) return '—';
  const first = sets[0]!;
  const reps = first.fields.reps;
  const weight = first.fields[weightKeyFor(first.metricSet)];
  if (reps !== undefined && weight !== undefined) {
    return `${sets.length}×${reps} · ${weight} kg`;
  }
  if (reps !== undefined) return `${sets.length}×${reps}`;
  return `${sets.length} série${sets.length > 1 ? 's' : ''}`;
}

/** Volume hebdo (Σ reps × charge, résolu par `metricSet` — cf. `volume.ts`) des séances `done`
 * des 7 derniers jours. `null` si aucune donnée exploitable. */
function useWeeklyVolumeKg() {
  return useQuery({
    queryKey: ['today-weekly-volume-kg'],
    queryFn: async (): Promise<number | null> => weeklyVolumeKg(),
    staleTime: 60_000,
  });
}

/** Formate un nombre avec séparateur de milliers « espace » (ex. 24180 → « 24 180 »). */
function formatThousands(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Écran d'accueil « Today » — copie fidèle du handoff design system (volt/ink/bone) :
 * header, séance du jour, grille de stats, insight coach. Remplace l'ancien dashboard.
 */
export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const date = today();

  const { data: workouts = [] } = useWorkouts();
  const upcoming = workouts
    .filter((w) => w.status !== 'done' && w.date >= date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const sessionWorkout = upcoming[0];

  const { data: detail } = useWorkoutDetail(sessionWorkout?.id);
  const exercises = detail?.exercises ?? [];
  const { data: gyms = [] } = useGyms();
  const gymName = gyms.find((g) => g.id === sessionWorkout?.gym)?.name;

  const { data: weeklyVolumeKg } = useWeeklyVolumeKg();
  const coaching = useCoaching();
  const coachMessage =
    coaching.recos[0]?.message ??
    'Continue comme ça — reviens demain pour un nouveau conseil personnalisé.';

  const sessionTitle = sessionWorkout ? sessionWorkout.notes || gymName || 'Séance du jour' : 'Jour libre';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="display" style={{ fontSize: 20, lineHeight: 24, textTransform: 'none' }}>
          mangetout
        </Text>
        <Text variant="label" color="textTertiary">
          {formatHeaderDate(new Date())}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="label" color="accent">
          Séance du jour
        </Text>
        <Text variant="displayLg">{sessionTitle}</Text>
      </View>

      <Card style={{ padding: 20, gap: theme.spacing.lg }}>
        {sessionWorkout ? (
          <View style={{ gap: theme.spacing.sm }}>
            {exercises.map((exercise, index) => (
              <View
                key={exercise.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingBottom: theme.spacing.sm,
                  borderBottomWidth: index < exercises.length - 1 ? 1 : 0,
                  borderBottomColor: theme.colors.separator,
                }}
              >
                <Text variant="body" style={{ fontWeight: '500' }}>
                  {exercise.name}
                </Text>
                <Text variant="mono" tabular color="textSecondary" style={{ fontSize: 13 }}>
                  {exerciseSummary(exercise.sets)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="body" color="textSecondary">
            Aucune séance prévue aujourd’hui — planifie ta prochaine séance.
          </Text>
        )}
        <Button
          label={sessionWorkout ? 'Démarrer la séance' : 'Planifier une séance'}
          icon={<Ionicons name="play" size={18} color={theme.colors.onAccent} />}
          fullWidth
          size="lg"
          onPress={() =>
            sessionWorkout
              ? router.push({ pathname: '/workout/[id]', params: { id: sessionWorkout.id } })
              : router.push('/workout-new')
          }
        />
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <StatCard
          style={{ flex: 1 }}
          label="Volume hebdo"
          value={weeklyVolumeKg != null ? formatThousands(weeklyVolumeKg) : '—'}
          unit={weeklyVolumeKg != null ? 'KG' : undefined}
        />
        <StatCard style={{ flex: 1 }} label="Récupération" value="—" deltaTone="warn" />
      </View>

      <Pressable onPress={() => router.push('/(tabs)/coach')} accessibilityRole="button">
        <Card style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
          <Ionicons
            name="chatbubble-ellipses"
            size={18}
            color={theme.colors.accent}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Text variant="label" color="textTertiary">
              Coach
            </Text>
            <Text variant="body" color="textSecondary">
              {coachMessage}
            </Text>
          </View>
        </Card>
      </Pressable>
    </Screen>
  );
}
