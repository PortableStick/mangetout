import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { findExerciseInfo } from '@/features/workouts/exerciseLibrary';
import { fieldsFor } from '@/features/workouts/metrics';
import { SetInput } from '@/features/workouts/SetInput';
import type { Exercise, ExerciseSet, WorkoutSource, WorkoutStatus } from '@/features/workouts/types';
import {
  useDeleteExercise,
  useDeleteSet,
  useDeleteWorkout,
  useDuplicateWorkout,
  useGyms,
  useUpdateSet,
  useUpdateWorkout,
  useWorkoutDetail,
} from '@/features/workouts/useWorkouts';
import { useTheme } from '@/theme/ThemeProvider';

const STATUS_OPTIONS: { label: string; value: WorkoutStatus }[] = [
  { label: 'Planifiée', value: 'planned' },
  { label: 'En cours', value: 'in_progress' },
  { label: 'Faite', value: 'done' },
];
const STATUS_LABELS: Record<WorkoutStatus, string> = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  done: 'Faite',
};
const STATUS_TONES: Record<WorkoutStatus, 'accent' | 'warning' | 'success'> = {
  planned: 'accent',
  in_progress: 'warning',
  done: 'success',
};
const SOURCE_LABELS: Record<WorkoutSource, string> = {
  generated: 'Générée',
  manual: 'Manuelle',
  vision: 'Scan',
};

/** Détail d'une séance : statut, exercices/séries (édition + suppression), dupliquer, supprimer. */
export default function WorkoutDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useWorkoutDetail(id);
  const { data: gyms = [] } = useGyms();
  const updateWorkout = useUpdateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const duplicateWorkout = useDuplicateWorkout();

  const workout = data?.workout;
  const exercises = data?.exercises ?? [];
  const gymName = gyms.find((g) => g.id === workout?.gym)?.name;

  if (!workout) {
    return (
      <Screen>
        <EmptyState
          icon="barbell-outline"
          title="Séance introuvable"
          subtitle={isLoading ? 'Chargement…' : 'Cette séance a été supprimée ou n’existe pas.'}
          action={<Button label="Retour" variant="secondary" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  const confirmDeleteWorkout = () => {
    Alert.alert('Supprimer la séance', 'La séance et ses exercices seront supprimés.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteWorkout.mutate({ id: workout.id }, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <Screen>
      <Card>
        <Text variant="largeTitle">{new Date(workout.at).toLocaleString('fr-FR')}</Text>
        {gymName ? (
          <Text variant="subhead" color="textSecondary">
            {gymName}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Badge label={STATUS_LABELS[workout.status]} tone={STATUS_TONES[workout.status]} />
          <Badge label={SOURCE_LABELS[workout.source]} tone="neutral" />
        </View>
        {workout.notes ? <Text color="textSecondary">{workout.notes}</Text> : null}
      </Card>

      <Card>
        <Text variant="footnote" color="textTertiary">
          Statut
        </Text>
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={workout.status}
          onChange={(status) => updateWorkout.mutate({ id: workout.id, status })}
        />
      </Card>

      {exercises.length === 0 ? (
        <Text variant="footnote" color="textTertiary">
          Aucun exercice dans cette séance.
        </Text>
      ) : (
        exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} workoutId={workout.id} />
        ))
      )}

      <Button
        label="Dupliquer"
        variant="secondary"
        loading={duplicateWorkout.isPending}
        onPress={() =>
          duplicateWorkout.mutate(
            { id: workout.id, at: new Date().toISOString(), status: 'planned' },
            {
              onSuccess: (newId) =>
                router.replace({ pathname: '/workout/[id]', params: { id: newId } }),
            }
          )
        }
      />
      <Button
        label="Supprimer la séance"
        variant="danger"
        loading={deleteWorkout.isPending}
        onPress={confirmDeleteWorkout}
      />
    </Screen>
  );
}

function ExerciseCard({
  exercise,
  workoutId,
}: {
  exercise: Exercise & { sets: ExerciseSet[] };
  workoutId: string;
}) {
  const theme = useTheme();
  const router = useRouter();
  const deleteExercise = useDeleteExercise();
  const info = findExerciseInfo(exercise.name);

  const confirmDeleteExercise = () => {
    Alert.alert('Supprimer l’exercice', `« ${exercise.name} » et ses séries seront supprimés.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteExercise.mutate({ id: exercise.id, workoutId }),
      },
    ]);
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {info ? (
          <Pressable
            onPress={() => router.push({ pathname: '/exercise/[slug]', params: { slug: info.slug } })}
            accessibilityRole="button"
            accessibilityLabel={`Voir la fiche technique de ${exercise.name}`}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
          >
            <Text variant="headline" style={{ flex: 1 }}>
              {exercise.name}
            </Text>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
          </Pressable>
        ) : (
          <Text variant="headline" style={{ flex: 1 }}>
            {exercise.name}
          </Text>
        )}
        <IconButton
          name="trash-outline"
          tone="danger"
          accessibilityLabel={`Supprimer ${exercise.name}`}
          onPress={confirmDeleteExercise}
        />
      </View>

      {exercise.sets.length === 0 ? (
        <Text variant="footnote" color="textTertiary">
          Aucune série.
        </Text>
      ) : (
        exercise.sets.map((set, index) => (
          <SetRow key={set.id} index={index} set={set} exerciseId={exercise.id} workoutId={workoutId} />
        ))
      )}
    </Card>
  );
}

function SetRow({
  index,
  set,
  exerciseId,
  workoutId,
}: {
  index: number;
  set: ExerciseSet;
  exerciseId: string;
  workoutId: string;
}) {
  const theme = useTheme();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(set.fields);

  const summary =
    fieldsFor(set.metricSet)
      .map((field) => {
        const value = set.fields[field.key];
        if (value === undefined || value === '') return null;
        return field.unit ? `${value} ${field.unit}` : `${value}`;
      })
      .filter((s): s is string => s !== null)
      .join(' · ') || '—';

  const commit = () => {
    updateSet.mutate({ id: set.id, exercise: exerciseId, fields: draft, metricSet: set.metricSet, workoutId });
    setEditing(false);
  };

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
      <Text variant="footnote" color="textTertiary" style={{ width: 20, marginTop: 8 }}>
        {index + 1}
      </Text>
      {editing ? (
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <SetInput metricSet={set.metricSet} value={draft} onChange={setDraft} />
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setDraft(set.fields);
            setEditing(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Modifier la série ${index + 1}`}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <Text>{summary}</Text>
        </Pressable>
      )}
      {editing ? (
        <IconButton
          name="checkmark-circle-outline"
          tone="accent"
          size={32}
          accessibilityLabel={`Valider la série ${index + 1}`}
          onPress={commit}
        />
      ) : null}
      <IconButton
        name="trash-outline"
        tone="danger"
        size={32}
        accessibilityLabel={`Supprimer la série ${index + 1}`}
        onPress={() => deleteSet.mutate({ id: set.id, workoutId })}
      />
    </View>
  );
}
