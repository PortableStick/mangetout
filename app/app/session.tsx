import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { SetRow, type SetRowStatus } from '@/components/ui/SetRow';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

const REST_DURATION_S = 90;

interface SessionSet {
  weight: string;
  reps: number;
  rpe?: number;
  status: SetRowStatus;
}

/** Format `mm:ss` (tabular) pour le compte à rebours de repos. */
function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Écran de séance live — copie fidèle de `ui_kits/app/SessionScreen.jsx` (handoff design system) :
 * header (retour, compteur de série, badge de rythme), bloc titre, hero numéral (charge en cours),
 * minuteur de repos avec barre de progression, liste de séries et insight coach.
 *
 * Données représentatives (comme le handoff) : la séance affichée n'est pas encore câblée à une
 * vraie séance/exercice — seul le comportement (valider une série démarre un repos de 90 s) est
 * reproduit. Câblage à `useWorkoutDetail`/`useUpdateSet` prévu dans un futur milestone.
 */
export default function SessionScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [sets, setSets] = useState<SessionSet[]>([
    { weight: '170', reps: 5, rpe: 7, status: 'done' },
    { weight: '180', reps: 5, rpe: 8, status: 'done' },
    { weight: '182,5', reps: 5, rpe: 9, status: 'pr' },
    { weight: '182,5', reps: 5, status: 'pending' },
    { weight: '182,5', reps: 5, status: 'pending' },
  ]);
  const [rest, setRest] = useState<number | null>(null);

  useEffect(() => {
    if (rest == null || rest <= 0) return;
    const timer = setTimeout(() => setRest(rest - 1), 1000);
    return () => clearTimeout(timer);
  }, [rest]);

  const logSet = (index: number) => {
    setSets((prev) =>
      prev.map((set, i) => (i === index ? { ...set, status: 'done', rpe: 9 } : set))
    );
    setRest(REST_DURATION_S);
  };

  const doneCount = sets.filter((s) => s.status !== 'pending').length;
  const currentSet = Math.min(doneCount + 1, sets.length);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton
          name="chevron-back"
          size={36}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <Text variant="label" color="textTertiary" tabular>
          {`Série ${currentSet} sur ${sets.length}`}
        </Text>
        <Badge label="Rythme record" tone="accent" />
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="label" color="textTertiary">
          Exercice 1 sur 3
        </Text>
        <Text variant="display">Squat</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
        <Text variant="mega" tabular>
          182,5
        </Text>
        <Text variant="mono" color="textTertiary">
          KG
        </Text>
      </View>

      {rest != null && rest > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            backgroundColor: theme.colors.surfaceRaised,
            borderWidth: 1,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radius.md,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
          }}
        >
          <Ionicons name="timer-outline" size={18} color={theme.colors.signalRest} />
          <View style={{ flex: 1, gap: theme.spacing.sm }}>
            <Text variant="mono" tabular style={{ fontSize: 13 }}>
              {`REPOS ${formatRest(rest)}`}
            </Text>
            <ProgressBar progress={rest / REST_DURATION_S} color={theme.colors.signalRest} height={3} />
          </View>
          <Button label="Passer" variant="ghost" size="sm" onPress={() => setRest(0)} />
        </View>
      ) : null}

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.separator,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
        }}
      >
        {sets.map((set, i) => (
          <SetRow
            key={i}
            index={i + 1}
            weight={set.weight}
            reps={set.reps}
            rpe={set.rpe}
            status={set.status}
            onLog={
              set.status === 'pending' && (i === 0 || sets[i - 1]?.status !== 'pending')
                ? () => logSet(i)
                : undefined
            }
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
        <Ionicons name="flash" size={16} color={theme.colors.accent} style={{ marginTop: 1 }} />
        <Text variant="subhead" color="textSecondary" style={{ flex: 1 }}>
          La vitesse à la barre a tenu 0,42 m/s à la série 3 — ce record était mérité, pas arraché.
          Une série propre de plus et on s’arrête.
        </Text>
      </View>
    </Screen>
  );
}
