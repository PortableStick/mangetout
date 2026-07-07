import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

import { MEAL_LABELS, MEAL_TYPES, type MealType } from './types';

/** Sélecteur de repas (pastilles), style segmenté iOS. */
export function MealPicker({ value, onChange }: { value: MealType; onChange: (m: MealType) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
      {MEAL_TYPES.map((m) => (
        <Pressable
          key={m}
          onPress={() => onChange(m)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            backgroundColor: value === m ? theme.colors.accent : theme.colors.surfaceMuted,
          }}
        >
          <Text variant="footnote" color={value === m ? 'onAccent' : 'textSecondary'}>
            {MEAL_LABELS[m]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
