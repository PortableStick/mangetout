import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { MUSCLE_LABELS, type Equipment, type EquipmentCategory, type GymType, type MuscleGroup } from '@/features/workouts/types';
import {
  useAddEquipment,
  useAddGym,
  useDeleteGym,
  useEquipment,
  useGyms,
  useRemoveEquipment,
  useUpdateEquipment,
  useUpdateGym,
} from '@/features/workouts/useWorkouts';
import { useTheme } from '@/theme/ThemeProvider';

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  machine: 'Machine',
  free_weight: 'Poids libres',
  cardio: 'Cardio',
  functional: 'Fonctionnel',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as EquipmentCategory[];
const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

/** Création ET édition d'une salle : infos, équipement (ajout/édition/retrait), suppression. */
export default function GymEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: gyms = [] } = useGyms();
  const { data: equipment = [] } = useEquipment(id);
  const addGym = useAddGym();
  const updateGym = useUpdateGym();
  const deleteGym = useDeleteGym();
  const addEquipment = useAddEquipment();
  const updateEquipment = useUpdateEquipment();
  const removeEquipment = useRemoveEquipment();

  const gym = gyms.find((g) => g.id === id);
  const prefilledId = useRef<string | undefined>(undefined);

  const [name, setName] = useState('');
  const [gymType, setGymType] = useState<GymType>('chain');

  // Préremplit nom + type quand la salle éditée charge (une fois par id, sans écraser la saisie en cours).
  useEffect(() => {
    if (gym && prefilledId.current !== gym.id) {
      setName(gym.name);
      setGymType(gym.gymType);
      prefilledId.current = gym.id;
    }
  }, [gym]);

  // Formulaire d'ajout/édition d'un équipement de la salle.
  const [editingEquipmentId, setEditingEquipmentId] = useState<string>();
  const [eqName, setEqName] = useState('');
  const [eqCategory, setEqCategory] = useState<EquipmentCategory>('machine');
  const [eqMuscles, setEqMuscles] = useState<MuscleGroup[]>([]);

  const resetEquipmentForm = () => {
    setEditingEquipmentId(undefined);
    setEqName('');
    setEqCategory('machine');
    setEqMuscles([]);
  };
  const startEditEquipment = (e: Equipment) => {
    setEditingEquipmentId(e.id);
    setEqName(e.name);
    setEqCategory(e.category);
    setEqMuscles(e.muscleGroups);
  };
  const toggleEqMuscle = (m: MuscleGroup) =>
    setEqMuscles((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]));

  const canSaveGym = name.trim().length > 0;
  const canSaveEquipment = isEdit && eqName.trim().length > 0;

  async function saveGym() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (id) {
      updateGym.mutate({ id, name: trimmed, gymType });
    } else {
      const createdId = await addGym.mutateAsync({ name: trimmed, gymType });
      router.replace({ pathname: '/gym-edit', params: { id: createdId } });
    }
  }

  function submitEquipment() {
    if (!id || eqName.trim().length === 0) return;
    const payload = { name: eqName.trim(), category: eqCategory, muscleGroups: eqMuscles };
    if (editingEquipmentId) {
      updateEquipment.mutate(
        { id: editingEquipmentId, gymId: id, ...payload },
        { onSuccess: resetEquipmentForm }
      );
    } else {
      addEquipment.mutate({ gymId: id, ...payload }, { onSuccess: resetEquipmentForm });
    }
  }

  function confirmDeleteGym() {
    if (!id) return;
    Alert.alert('Supprimer la salle', 'La salle et son équipement seront supprimés.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteGym.mutate({ id }, { onSuccess: () => router.back() }),
      },
    ]);
  }

  return (
    <Screen>
      <Text variant="largeTitle">{isEdit ? 'Modifier la salle' : 'Nouvelle salle'}</Text>

      <Card>
        <Field label="Nom" value={name} onChangeText={setName} placeholder="Ex. Basic-Fit Nation" />
        <Text variant="footnote" color="textTertiary">
          Type
        </Text>
        <SegmentedControl
          options={[
            { label: 'Chaîne', value: 'chain' },
            { label: 'Perso', value: 'home' },
          ]}
          value={gymType}
          onChange={setGymType}
        />
        <Button
          label={isEdit ? 'Enregistrer' : 'Créer la salle'}
          disabled={!canSaveGym}
          loading={addGym.isPending || updateGym.isPending}
          onPress={saveGym}
          style={{ marginTop: 8 }}
        />
      </Card>

      {isEdit ? (
        <Card>
          <Text variant="headline">Équipement</Text>
          {equipment.length === 0 ? (
            <Text variant="footnote" color="textTertiary">
              Aucun équipement pour l’instant.
            </Text>
          ) : null}
          {equipment.map((e) => (
            <View
              key={e.id}
              style={{ borderTopWidth: 1, borderTopColor: theme.colors.separator }}
            >
              <ListRow
                title={e.name}
                subtitle={`${CATEGORY_LABELS[e.category]}${
                  e.muscleGroups.length > 0
                    ? ` · ${e.muscleGroups.map((m) => MUSCLE_LABELS[m]).join(', ')}`
                    : ''
                }`}
                onPress={() => startEditEquipment(e)}
                right={
                  <IconButton
                    name="trash-outline"
                    tone="danger"
                    accessibilityLabel="Retirer l’équipement"
                    onPress={() => removeEquipment.mutate({ id: e.id, gymId: id })}
                  />
                }
              />
            </View>
          ))}
        </Card>
      ) : null}

      {isEdit ? (
        <Card>
          <Text variant="headline">
            {editingEquipmentId ? 'Modifier l’équipement' : 'Ajouter un équipement'}
          </Text>
          <Field label="Nom" value={eqName} onChangeText={setEqName} placeholder="Ex. Leg press" />

          <Text variant="footnote" color="textTertiary">
            Catégorie
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={CATEGORY_LABELS[c]} active={eqCategory === c} onPress={() => setEqCategory(c)} />
            ))}
          </View>

          <Text variant="footnote" color="textTertiary">
            Groupes musculaires
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {MUSCLES.map((m) => (
              <Chip
                key={m}
                label={MUSCLE_LABELS[m]}
                active={eqMuscles.includes(m)}
                onPress={() => toggleEqMuscle(m)}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: 8 }}>
            <Button
              label={editingEquipmentId ? 'Enregistrer' : 'Ajouter'}
              disabled={!canSaveEquipment}
              loading={addEquipment.isPending || updateEquipment.isPending}
              onPress={submitEquipment}
              style={{ flex: 1 }}
            />
            {editingEquipmentId ? (
              <Button label="Annuler" variant="ghost" onPress={resetEquipmentForm} style={{ flex: 1 }} />
            ) : null}
          </View>
        </Card>
      ) : null}

      {isEdit ? (
        <Button
          label="Supprimer la salle"
          variant="secondary"
          style={{ backgroundColor: theme.colors.danger }}
          loading={deleteGym.isPending}
          onPress={confirmDeleteGym}
        />
      ) : null}

      <Button label="Annuler" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.accent : theme.colors.surfaceMuted,
      }}
    >
      <Text variant="footnote" color={active ? 'onAccent' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}
