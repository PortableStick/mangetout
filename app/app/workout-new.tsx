import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import { captureImage, useMachineVision } from '@/features/ai/vision';
import { generateWorkout } from '@/features/workouts/generator';
import { MUSCLE_LABELS, type Equipment, type MuscleGroup, type WorkoutStatus } from '@/features/workouts/types';
import {
  toMuscleGroups,
  useAddEquipment,
  useCreateWorkout,
  useEquipment,
  useGyms,
} from '@/features/workouts/useWorkouts';
import { useTheme } from '@/theme/ThemeProvider';

const numOf = (s: string) => Number.parseFloat(s.replace(',', '.')) || 0;
const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale du jour, format `YYYY-MM-DD`. */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Heure locale courante, format `HH:mm`. */
function localNowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Construit un ISO à partir de date (`YYYY-MM-DD`) + heure (`HH:mm`) locales. `null` si invalide. */
function toIsoAt(dateStr: string, timeStr: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) return null;
  const [y, m, day] = dateStr.split('-').map(Number) as [number, number, number];
  const d = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== y || d.getMonth() + 1 !== m || d.getDate() !== day) return null;
  return d.toISOString();
}

const STATUS_OPTIONS: { label: string; value: WorkoutStatus }[] = [
  { label: 'Planifiée', value: 'planned' },
  { label: 'En cours', value: 'in_progress' },
  { label: 'Faite', value: 'done' },
];

interface DraftSet {
  reps: number;
  weight_kg: number;
}
interface DraftExercise {
  name: string;
  equipmentId?: string;
  sets: DraftSet[];
}

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

export default function WorkoutNewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: gyms = [] } = useGyms();
  const [selectedGymId, setGymId] = useState<string>();
  // Salle active = sélection explicite, sinon la première (dérivé, pas d'effet).
  const gymId = selectedGymId ?? gyms[0]?.id;
  const { data: equipment = [] } = useEquipment(gymId);
  const create = useCreateWorkout();
  const addEquipment = useAddEquipment();
  const machineScan = useMachineVision();

  async function scanMachine() {
    if (!gymId) return;
    const image = await captureImage();
    if (!image) return;
    const res = await machineScan.mutateAsync(image);
    await addEquipment.mutateAsync({
      gymId,
      name: res.canonical_name,
      category: 'machine',
      muscleGroups: toMuscleGroups(res.muscle_groups),
    });
  }

  const [targets, setTargets] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [dateStr, setDateStr] = useState(localToday());
  const [timeStr, setTimeStr] = useState(localNowTime());
  const [status, setStatus] = useState<WorkoutStatus>('done');
  const [usedGenerator, setUsedGenerator] = useState(false);

  const at = toIsoAt(dateStr, timeStr);

  const toggleTarget = (m: MuscleGroup) =>
    setTargets((t) => (t.includes(m) ? t.filter((x) => x !== m) : [...t, m]));

  const generate = () => {
    const picked = generateWorkout(equipment, { targets, count: 6 });
    setExercises(picked.map((e) => ({ name: e.name, equipmentId: e.id, sets: [{ reps: 10, weight_kg: 0 }] })));
    setUsedGenerator(true);
  };

  const addFromEquipment = (e: Equipment) =>
    setExercises((ex) => [...ex, { name: e.name, equipmentId: e.id, sets: [{ reps: 10, weight_kg: 0 }] }]);

  const addSet = (i: number) =>
    setExercises((ex) =>
      ex.map((e, idx) => (idx === i ? { ...e, sets: [...e.sets, { reps: 10, weight_kg: 0 }] } : e))
    );
  const setField = (i: number, s: number, field: keyof DraftSet, value: number) =>
    setExercises((ex) =>
      ex.map((e, idx) =>
        idx === i
          ? { ...e, sets: e.sets.map((set, sIdx) => (sIdx === s ? { ...set, [field]: value } : set)) }
          : e
      )
    );
  const removeExercise = (i: number) => setExercises((ex) => ex.filter((_, idx) => idx !== i));

  const canSave = !!gymId && exercises.length > 0 && !!at;

  return (
    <Screen>
      <Text variant="largeTitle">Nouvelle séance</Text>

      <Text variant="footnote" color="textTertiary">
        Salle
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        {gyms.map((g) => (
          <Chip key={g.id} label={g.name} active={gymId === g.id} onPress={() => setGymId(g.id)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Field
          label="Date"
          value={dateStr}
          onChangeText={setDateStr}
          placeholder="AAAA-MM-JJ"
          autoCapitalize="none"
          style={{ flex: 1 }}
        />
        <Field
          label="Heure"
          value={timeStr}
          onChangeText={setTimeStr}
          placeholder="HH:mm"
          autoCapitalize="none"
          style={{ flex: 1 }}
        />
      </View>
      {!at ? (
        <Text variant="footnote" color="danger">
          Date ou heure invalide (attendu AAAA-MM-JJ et HH:mm).
        </Text>
      ) : null}

      <Text variant="footnote" color="textTertiary">
        Statut
      </Text>
      <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      <Text variant="footnote" color="textTertiary">
        Groupes ciblés (optionnel)
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        {MUSCLES.map((m) => (
          <Chip key={m} label={MUSCLE_LABELS[m]} active={targets.includes(m)} onPress={() => toggleTarget(m)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button label="Générer" variant="secondary" onPress={generate} style={{ flex: 1 }} />
        {exercises.length > 0 ? (
          <Button
            label="Vider"
            variant="ghost"
            onPress={() => {
              setExercises([]);
              setUsedGenerator(false);
            }}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>

      {exercises.map((ex, i) => (
        <Card key={`${ex.equipmentId ?? ex.name}-${i}`}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="headline" style={{ flex: 1 }}>
              {ex.name}
            </Text>
            <Pressable onPress={() => removeExercise(i)} accessibilityRole="button">
              <Ionicons name="close-circle" size={22} color={theme.colors.textTertiary} />
            </Pressable>
          </View>
          {ex.sets.map((s, sIdx) => (
            <View key={sIdx} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
              <Text variant="footnote" color="textTertiary" style={{ width: 20 }}>
                {sIdx + 1}
              </Text>
              <Field
                value={String(s.reps)}
                onChangeText={(v) => setField(i, sIdx, 'reps', Math.round(numOf(v)))}
                keyboardType="numeric"
                style={{ width: 64, paddingVertical: 8, textAlign: 'center' }}
              />
              <Text variant="footnote" color="textTertiary">
                reps ×
              </Text>
              <Field
                value={String(s.weight_kg)}
                onChangeText={(v) => setField(i, sIdx, 'weight_kg', numOf(v))}
                keyboardType="numeric"
                style={{ width: 74, paddingVertical: 8, textAlign: 'center' }}
              />
              <Text variant="footnote" color="textTertiary">
                kg
              </Text>
            </View>
          ))}
          <Pressable onPress={() => addSet(i)}>
            <Text variant="footnote" color="accent">
              + série
            </Text>
          </Pressable>
        </Card>
      ))}

      {env.aiEnabled && gymId ? (
        <Button
          label={machineScan.isPending || addEquipment.isPending ? 'Analyse de la machine…' : '📷 Scanner une machine'}
          variant="secondary"
          loading={machineScan.isPending || addEquipment.isPending}
          onPress={scanMachine}
        />
      ) : null}

      {gymId && equipment.length > 0 ? (
        <Card>
          <Text variant="headline">Ajouter un exercice</Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {equipment.slice(0, 40).map((e) => (
              <Chip key={e.id} label={e.name} active={false} onPress={() => addFromEquipment(e)} />
            ))}
          </View>
        </Card>
      ) : gymId ? (
        <Text variant="footnote" color="textTertiary">
          Cette salle n’a pas encore d’équipement. Ajoute-en depuis la salle (ou scan d’affiche, bientôt).
        </Text>
      ) : null}

      <Button
        label="Enregistrer la séance"
        disabled={!canSave}
        loading={create.isPending}
        onPress={() =>
          create.mutate(
            {
              gymId: gymId!,
              at: at!,
              status,
              source: usedGenerator ? 'generated' : 'manual',
              exercises,
            },
            { onSuccess: () => router.back() }
          )
        }
        style={{ marginTop: 8 }}
      />
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
