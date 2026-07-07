import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <Text variant="largeTitle">Réglages</Text>

      <Card>
        <Text variant="headline">Compte</Text>
        <View style={{ gap: 2, marginTop: theme.spacing.xs }}>
          <Text variant="body">{user?.email || 'Non connecté'}</Text>
          <Text variant="footnote" color="textTertiary">
            Authentification : {env.authMode === 'oidc' ? 'Authelia (OIDC)' : 'e-mail / mot de passe'}
          </Text>
        </View>
      </Card>

      <Card>
        <Text variant="headline">À venir</Text>
        <Text variant="subhead" color="textSecondary">
          Objectifs kcal/macros, thème, écran « À propos » (mention ODbL Open Food Facts) et gestion
          hors-ligne arriveront aux prochains milestones.
        </Text>
      </Card>

      <Button label="Se déconnecter" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
