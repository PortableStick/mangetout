import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

interface PlaceholderScreenProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Empty state soigné pour les écrans en cours de construction (milestones à venir). */
export function PlaceholderScreen({ title, subtitle, icon }: PlaceholderScreenProps) {
  const theme = useTheme();
  return (
    <Screen>
      <Text variant="largeTitle">{title}</Text>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: theme.radius.xl,
            backgroundColor: theme.colors.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={40} color={theme.colors.accent} />
        </View>
        <Text variant="title3" center>
          Bientôt disponible
        </Text>
        <Text variant="subhead" color="textSecondary" center>
          {subtitle}
        </Text>
      </View>
    </Screen>
  );
}
