import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

interface ScreenHeaderProps {
  /** Sur-titre mono volt (ex. « JOURNAL ») — omis si l'écran n'en a pas besoin. */
  eyebrow?: string;
  /** Titre de l'écran — toujours affiché en majuscules (Anton), quelle que soit la casse fournie. */
  title: string;
  /** Nœud aligné à droite du titre (ex. un `IconButton` d'action). */
  right?: ReactNode;
}

/**
 * En-tête d'écran standard : eyebrow mono volt (optionnel) + gros titre Anton majuscules, aligné
 * sur le langage des écrans phares (Today, Session, Coach, Moves). `right` reçoit une action
 * alignée à droite du titre (ex. bouton d'ajout).
 */
export function ScreenHeader({ eyebrow, title, right }: ScreenHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
      }}
    >
      <View style={{ gap: theme.spacing.xs, flex: 1 }}>
        {eyebrow ? (
          <Text variant="label" color="accent">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="display">{title.toUpperCase()}</Text>
      </View>
      {right ?? null}
    </View>
  );
}
