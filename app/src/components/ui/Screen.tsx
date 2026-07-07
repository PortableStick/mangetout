import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps {
  children: ReactNode;
  /** Contenu défilable (par défaut) ou fixe. */
  scroll?: boolean;
  /** Padding horizontal (défaut : xl). */
  padded?: boolean;
  style?: ViewStyle;
}

/** Conteneur d'écran : fond thémé + safe area. Respire (padding généreux). */
export function Screen({ children, scroll = true, padded = true, style }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const content: ViewStyle = {
    paddingTop: insets.top + theme.spacing.md,
    paddingBottom: insets.bottom + theme.spacing.xl,
    paddingHorizontal: padded ? theme.spacing.xl : 0,
    flexGrow: 1,
    gap: theme.spacing.lg,
  };

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={[content, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.background }, content, style]}>
      {children}
    </View>
  );
}
