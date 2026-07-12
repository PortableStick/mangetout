import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { useGyms, useSeedGyms, useWorkouts } from '@/features/workouts/useWorkouts';
import type { Workout, WorkoutStatus } from '@/features/workouts/types';
import { useTheme } from '@/theme/ThemeProvider';

const STATUS_LABEL: Record<WorkoutStatus, string> = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  done: 'Faite',
};

const STATUS_TONE: Record<WorkoutStatus, 'accent' | 'warning' | 'success'> = {
  planned: 'accent',
  in_progress: 'warning',
  done: 'success',
};

type WorkoutListItem = Workout & { exerciseCount: number };

function WorkoutCard({ workout, gymLabel }: { workout: WorkoutListItem; gymLabel: string }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/workout/[id]', params: { id: workout.id } })}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="headline">{workout.date}</Text>
          <Text variant="subhead" color="textSecondary">
            {gymLabel}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: theme.spacing.xs,
          }}
        >
          <Badge label={STATUS_LABEL[workout.status]} tone={STATUS_TONE[workout.status]} />
          <Text variant="footnote" color="textTertiary">
            {workout.exerciseCount} exercice{workout.exerciseCount > 1 ? 's' : ''}
            {workout.notes ? ` · ${workout.notes}` : ''}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const { data: gyms = [] } = useGyms();
  const { data: workouts = [] } = useWorkouts();
  const seed = useSeedGyms();

  const gymName = useMemo(() => new Map(gyms.map((g) => [g.id, g.name])), [gyms]);

  const { upcoming, history } = useMemo(() => {
    const nowIso = new Date().toISOString();
    const isUpcoming = (w: (typeof workouts)[number]) => w.status !== 'done' || w.at > nowIso;
    return {
      upcoming: workouts.filter(isUpcoming).sort((a, b) => a.at.localeCompare(b.at)),
      history: workouts.filter((w) => !isUpcoming(w)).sort((a, b) => b.at.localeCompare(a.at)),
    };
  }, [workouts]);

  if (gyms.length === 0) {
    return (
      <Screen>
        <ScreenHeader eyebrow="Entraînement" title="Séances" />
        <Card>
          <Text variant="headline">Configure tes salles</Text>
          <Text variant="subhead" color="textSecondary">
            On crée deux salles par défaut : Basic-Fit (équipements pré-remplis) et Salle perso (à
            compléter). Tu pourras les modifier ensuite.
          </Text>
          <Button
            label="Créer mes salles"
            loading={seed.isPending}
            onPress={() => seed.mutate()}
            style={{ marginTop: 8 }}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Entraînement"
        title="Séances"
        right={
          <IconButton
            name="add"
            tone="accent"
            accessibilityLabel="Nouvelle séance"
            onPress={() => router.push('/workout-new')}
          />
        }
      />

      {workouts.length === 0 ? (
        <EmptyState
          icon="fitness-outline"
          title="Aucune séance"
          subtitle="Crée ta première séance : choisis une salle et génère ou compose tes exercices."
          action={<Button label="Nouvelle séance" onPress={() => router.push('/workout-new')} />}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <Text variant="label" color="textTertiary">
                À venir
              </Text>
              {upcoming.map((w) => (
                <WorkoutCard key={w.id} workout={w} gymLabel={gymName.get(w.gym) ?? 'Salle'} />
              ))}
            </>
          )}
          {history.length > 0 && (
            <>
              <Text variant="label" color="textTertiary">
                Historique
              </Text>
              {history.map((w) => (
                <WorkoutCard key={w.id} workout={w} gymLabel={gymName.get(w.gym) ?? 'Salle'} />
              ))}
            </>
          )}
        </>
      )}

      <Button label="Gérer les salles" variant="ghost" onPress={() => router.push('/gyms')} />
    </Screen>
  );
}
