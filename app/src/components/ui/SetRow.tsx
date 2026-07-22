import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/tokens';

import { Text } from './Text';

export type SetRowStatus = 'pending' | 'done' | 'pr' | 'fail';

export interface SetRowProps {
  /** Numéro de série, affiché `01`/`02`/… */
  index: number;
  weight: number | string;
  /** Défaut `« KG »`. */
  unit?: string;
  reps: number | string;
  /** RPE, affiché `@8`. */
  rpe?: number | string;
  status?: SetRowStatus;
  /** Affiche une action de validation tant que la série est en attente. */
  onLog?: () => void;
  style?: ViewStyle;
}

const STATUS_LABEL: Record<SetRowStatus, string> = {
  pending: '—',
  done: 'FAIT',
  pr: 'REC',
  fail: 'ÉCHEC',
};

/**
 * Une série du journal de séance : index, poids + unité, reps, RPE, puis statut ou action de
 * validation. Copie fidèle de `components/data/SetRow.jsx` (handoff design system) — les séries
 * `pr` reçoivent un fond teinté volt ; tant que `status === 'pending'` et `onLog` fourni, un bouton
 * de validation remplace le statut. Empile plusieurs `SetRow` dans un conteneur bordé : chaque ligne
 * porte déjà sa propre bordure basse hairline.
 */
export function SetRow({
  index,
  weight,
  unit = 'KG',
  reps,
  rpe,
  status = 'pending',
  onLog,
  style,
}: SetRowProps) {
  const theme = useTheme();
  const active = status === 'pending' && !!onLog;

  const statusColor: Record<SetRowStatus, string> = {
    pending: theme.colors.textTertiary,
    done: theme.colors.textSecondary,
    pr: theme.colors.accent,
    fail: theme.colors.danger,
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          minHeight: 52,
          paddingHorizontal: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.separator,
          backgroundColor: status === 'pr' ? theme.colors.accentMuted : 'transparent',
        },
        style,
      ]}
    >
      <Text variant="mono" tabular color="textTertiary" style={{ width: 32, fontSize: 13 }}>
        {String(index).padStart(2, '0')}
      </Text>

      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline' }}>
        <Text
          tabular
          color={status === 'pending' ? 'textTertiary' : 'text'}
          style={{ fontFamily: fontFamily.semibold, fontSize: 18 }}
        >
          {weight}
        </Text>
        <Text
          variant="mono"
          tabular
          uppercase
          color="textTertiary"
          style={{ fontSize: 11, marginLeft: 4 }}
        >
          {unit}
        </Text>
      </View>

      <Text variant="mono" tabular color="textTertiary" style={{ width: 64, fontSize: 13 }}>
        ×{reps}
      </Text>

      <Text variant="mono" tabular color="textTertiary" style={{ width: 56, fontSize: 13 }}>
        {rpe != null ? `@${rpe}` : ''}
      </Text>

      {active ? (
        <Pressable
          onPress={onLog}
          accessibilityRole="button"
          accessibilityLabel="Valider la série"
          style={({ pressed }) => ({
            width: 72,
            height: 32,
            borderRadius: theme.radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? theme.colors.accent : theme.colors.accentMuted,
          })}
        >
          {({ pressed }) => (
            <Text
              variant="label"
              style={{ color: pressed ? theme.colors.onAccent : theme.colors.accent }}
            >
              Valider
            </Text>
          )}
        </Pressable>
      ) : (
        <Text variant="label" style={{ width: 72, textAlign: 'right', color: statusColor[status] }}>
          {STATUS_LABEL[status]}
        </Text>
      )}
    </View>
  );
}
