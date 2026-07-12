import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useEquipment, useGyms, useSeedGyms } from '@/features/workouts/useWorkouts';
import type { Gym } from '@/features/workouts/types';
import { useTheme } from '@/theme/ThemeProvider';

/** Une ligne de la liste des salles : isole le hook `useEquipment` (règle des hooks, pas de map). */
function GymRow({ gym }: { gym: Gym }) {
  const router = useRouter();
  const { data: equipment = [] } = useEquipment(gym.id);

  return (
    <Pressable onPress={() => router.push({ pathname: '/gym-edit', params: { id: gym.id } })}>
      <Card>
        <Text variant="headline">{gym.name}</Text>
        <Text variant="subhead" color="textSecondary">
          {gym.gymType === 'chain' ? 'Chaîne' : 'Perso'}
        </Text>
        <Text variant="footnote" color="textTertiary">
          {equipment.length} équipement{equipment.length > 1 ? 's' : ''}
        </Text>
      </Card>
    </Pressable>
  );
}

export default function GymsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: gyms = [] } = useGyms();
  const seed = useSeedGyms();

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="largeTitle">Salles</Text>
        <Pressable
          onPress={() => router.push('/gym-edit')}
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

      {gyms.length === 0 ? (
        <Card>
          <Text variant="headline">Aucune salle</Text>
          <Text variant="subhead" color="textSecondary">
            On crée deux salles par défaut : Basic-Fit (équipements pré-remplis) et Salle perso (à
            compléter). Tu pourras les modifier ensuite.
          </Text>
          <Button
            label="Créer mes salles par défaut"
            loading={seed.isPending}
            onPress={() => seed.mutate()}
            style={{ marginTop: 8 }}
          />
        </Card>
      ) : (
        gyms.map((g) => <GymRow key={g.id} gym={g} />)
      )}
    </Screen>
  );
}
