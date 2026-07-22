import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { MovementDemo, type ExerciseId } from '@/features/coach3d/CoachRig';
import { MOVE_TEMPOS, MOVES, type MoveTempoPreset } from '@/features/workouts/moves-data';
import { useTheme } from '@/theme/ThemeProvider';

const DEMO_HEIGHT = 230;

/** Assure un premier élément (les listes de la bibliothèque de gestes ne sont jamais vides). */
function first<T>(arr: T[]): T {
  const [head] = arr;
  if (!head) throw new Error('moves-data : liste vide, un premier élément est requis.');
  return head;
}

const DEFAULT_MOVE = first(MOVES);
const DEFAULT_TEMPO = first(MOVE_TEMPOS);

/** `moves-data.ts` type `id` en `string` ; le rig 3D n'accepte que les 3 exercices connus. */
function toExerciseId(id: string): ExerciseId {
  return id === 'butterfly' || id === 'rower' ? id : 'dumbbells';
}

/**
 * Écran « Bibliothèque de gestes » — copie fidèle de `ui_kits/app/MovesScreen.jsx` (handoff design
 * system) : sélection d'un exercice (chips), choix d'un tempo d'exécution (presets), cue associé.
 *
 * La zone de démo (`MovementDemo`, rig 3D `three`/`expo-gl`, M24) montre la machine + l'athlète
 * exécutant le mouvement sélectionné, pilotée par le tempo choisi.
 */
export default function MovesScreen() {
  const theme = useTheme();
  const [sel, setSel] = useState<string>(DEFAULT_MOVE.id);
  const [tempoKey, setTempoKey] = useState<string>(DEFAULT_TEMPO.key);

  const current = MOVES.find((m) => m.id === sel) ?? DEFAULT_MOVE;
  const tempo = MOVE_TEMPOS.find((t) => t.key === tempoKey) ?? DEFAULT_TEMPO;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="label" color="accent">
          Bibliothèque de gestes
        </Text>
        <Text variant="display">Le coach te montre</Text>
      </View>

      <View
        style={{
          height: DEMO_HEIGHT,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.separator,
        }}
      >
        {/* Tint radial approximé (le handoff utilise un radial-gradient CSS). */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: -70, left: 0, right: 0, alignItems: 'center' }}
        >
          <View
            style={{
              width: 260,
              height: 260,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.accentMuted,
            }}
          />
        </View>

        {/* Rig 3D procédural (M24) : la machine + l'athlète exécutant le mouvement, au tempo choisi. */}
        <MovementDemo
          exercise={toExerciseId(current.id)}
          tempo={tempo.tempo}
          height={DEMO_HEIGHT}
        />

        <View
          style={{
            position: 'absolute',
            left: theme.spacing.lg,
            right: theme.spacing.lg,
            bottom: theme.spacing.md,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}
        >
          <Text variant="display" style={{ fontSize: 22, lineHeight: 22 }}>
            {current.title}
          </Text>
          <Text variant="label" color="accent">
            {`Tempo ${tempo.label}`}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: theme.spacing.sm }}
      >
        {MOVES.map((m) => (
          <MoveChip key={m.id} label={m.title} active={m.id === sel} onPress={() => setSel(m.id)} />
        ))}
      </ScrollView>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="label" color="textTertiary">
          Tempo · concentrique · pause · excentrique (s)
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {MOVE_TEMPOS.map((tp) => (
            <TempoButton
              key={tp.key}
              preset={tp}
              active={tp.key === tempoKey}
              onPress={() => setTempoKey(tp.key)}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
        <Ionicons name="flash" size={16} color={theme.colors.accent} style={{ marginTop: 1 }} />
        <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
          {current.cue}
        </Text>
      </View>
    </Screen>
  );
}

function MoveChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexShrink: 0,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.sm,
        backgroundColor: active ? theme.colors.accent : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.accent : theme.colors.borderStrong,
      }}
    >
      <Text variant="footnote" color={active ? 'onAccent' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

function TempoButton({
  preset,
  active,
  onPress,
}: {
  preset: MoveTempoPreset;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: active ? theme.colors.accentMuted : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.accent : theme.colors.borderStrong,
        borderRadius: theme.radius.sm,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.xs,
      }}
    >
      <Text variant="mono" tabular color={active ? 'accent' : 'text'}>
        {preset.label}
      </Text>
      <Text variant="label" color="textTertiary">
        {preset.sub}
      </Text>
    </Pressable>
  );
}
