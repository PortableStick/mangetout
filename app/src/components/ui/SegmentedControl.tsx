import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}

/** Sélecteur segmenté à la iOS (ex. Système/Clair/Sombre). */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.radius.md,
        padding: theme.spacing.xs,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              {
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.sm,
                opacity: pressed ? 0.7 : 1,
              },
              active && { backgroundColor: theme.colors.surface, ...theme.shadow('sm') },
            ]}
          >
            <Text
              variant="subhead"
              color={active ? 'text' : 'textSecondary'}
              style={active ? { fontFamily: theme.typography.headline.fontFamily } : undefined}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
