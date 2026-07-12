import { useRouter } from 'expo-router';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useEquipment, useGyms, useSeedGyms } from '@/features/workouts/useWorkouts';
import type { Gym } from '@/features/workouts/types';

/** Une ligne de la liste des salles : isole le hook `useEquipment` (règle des hooks, pas de map). */
function GymRow({ gym }: { gym: Gym }) {
  const router = useRouter();
  const { data: equipment = [] } = useEquipment(gym.id);

  return (
    <Card style={{ padding: 0 }}>
      <ListRow
        title={gym.name}
        subtitle={`${equipment.length} équipement${equipment.length > 1 ? 's' : ''}`}
        right={
          <Badge
            label={gym.gymType === 'chain' ? 'Chaîne' : 'Perso'}
            tone={gym.gymType === 'chain' ? 'accent' : 'neutral'}
          />
        }
        onPress={() => router.push({ pathname: '/gym-edit', params: { id: gym.id } })}
      />
    </Card>
  );
}

export default function GymsScreen() {
  const router = useRouter();
  const { data: gyms = [] } = useGyms();
  const seed = useSeedGyms();

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Matériel"
        title="Salles"
        right={
          <IconButton
            name="add"
            tone="accent"
            accessibilityLabel="Ajouter une salle"
            onPress={() => router.push('/gym-edit')}
          />
        }
      />

      {gyms.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title="Aucune salle"
          subtitle="On crée deux salles par défaut : Basic-Fit (équipements pré-remplis) et Salle perso (à compléter). Tu pourras les modifier ensuite."
          action={
            <Button
              label="Créer mes salles par défaut"
              loading={seed.isPending}
              onPress={() => seed.mutate()}
            />
          }
        />
      ) : (
        gyms.map((g) => <GymRow key={g.id} gym={g} />)
      )}
    </Screen>
  );
}
