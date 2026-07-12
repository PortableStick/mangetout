import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/** État vide illustré (icône + titre + sous-titre + action optionnelle). */
export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md }}>
      <Ionicons name={icon} size={48} color={theme.colors.textTertiary} />
      <Text variant="title3" center>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="subhead" color="textSecondary" center>
          {subtitle}
        </Text>
      ) : null}
      {action}
    </View>
  );
}
