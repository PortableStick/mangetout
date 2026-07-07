import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useGyms, useSeedGyms, useWorkouts } from '@/features/workouts/useWorkouts';
import { useTheme } from '@/theme/ThemeProvider';

export default function WorkoutsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: gyms = [] } = useGyms();
  const { data: workouts = [] } = useWorkouts();
  const seed = useSeedGyms();

  const gymName = useMemo(() => new Map(gyms.map((g) => [g.id, g.name])), [gyms]);

  if (gyms.length === 0) {
    return (
      <Screen>
        <Text variant="largeTitle">Séances</Text>
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="largeTitle">Séances</Text>
        <Pressable
          onPress={() => router.push('/workout-new')}
          accessibilityRole="button"
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={26} color={theme.colors.onAccent} />
        </Pressable>
      </View>

      {workouts.length === 0 ? (
        <Card>
          <Text variant="headline">Aucune séance</Text>
          <Text variant="subhead" color="textSecondary">
            Crée ta première séance : choisis une salle et génère ou compose tes exercices.
          </Text>
          <Button label="Nouvelle séance" onPress={() => router.push('/workout-new')} style={{ marginTop: 8 }} />
        </Card>
      ) : (
        workouts.map((w) => (
          <Card key={w.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="headline">{w.date}</Text>
              <Text variant="subhead" color="textSecondary">
                {gymName.get(w.gym) ?? 'Salle'}
              </Text>
            </View>
            <Text variant="footnote" color="textTertiary">
              {w.exerciseCount} exercice{w.exerciseCount > 1 ? 's' : ''}
              {w.notes ? ` · ${w.notes}` : ''}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
