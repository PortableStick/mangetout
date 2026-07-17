import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { findExerciseInfo } from '@/features/workouts/exerciseLibrary';
import { PoseViewer } from '@/features/workouts/PoseViewer';
import type { EquipmentCategory } from '@/features/workouts/types';
import { MUSCLE_LABELS } from '@/features/workouts/types';
import { useTheme } from '@/theme/ThemeProvider';

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  machine: 'Machine',
  free_weight: 'Poids libres',
  cardio: 'Cardio',
  functional: 'Fonctionnel',
};

/** Fiche technique d'un exercice : pose animée, muscles ciblés, étapes, conseils, erreurs. */
export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const info = findExerciseInfo(slug ?? '');

  if (!info) {
    return (
      <Screen>
        <EmptyState
          icon="help-circle-outline"
          title="Exercice inconnu"
          subtitle="Cette fiche n’existe pas encore dans la bibliothèque."
          action={<Button label="Retour" variant="secondary" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="largeTitle">{info.name}</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Badge label={CATEGORY_LABELS[info.category]} tone="neutral" />
        </View>
      </View>

      {info.poseId ? (
        <Card>
          <PoseViewer poseId={info.poseId} />
        </Card>
      ) : null}

      <Card>
        <Text variant="footnote" color="textTertiary">
          Muscles ciblés
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          {info.primary.map((m) => (
            <Badge key={m} label={MUSCLE_LABELS[m]} tone="accent" />
          ))}
          {info.secondary.map((m) => (
            <Badge key={m} label={MUSCLE_LABELS[m]} tone="neutral" />
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="headline">Déroulé</Text>
        {info.steps.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme.colors.accentMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="caption" color="accent">
                {i + 1}
              </Text>
            </View>
            <Text style={{ flex: 1 }}>{step}</Text>
          </View>
        ))}
      </Card>

      <IconList title="Conseils" items={info.tips} icon="checkmark-circle" color={theme.colors.success} />
      <IconList title="Erreurs à éviter" items={info.mistakes} icon="close-circle" color={theme.colors.danger} />

      <Button label="Retour" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

/** Liste de puces à icône (conseils, erreurs…). */
function IconList({
  title,
  items,
  icon,
  color,
}: {
  title: string;
  items: string[];
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  const theme = useTheme();
  return (
    <Card>
      <Text variant="headline">{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Ionicons name={icon} size={18} color={color} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1 }}>{item}</Text>
        </View>
      ))}
    </Card>
  );
}
