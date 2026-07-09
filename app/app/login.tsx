import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';

export default function LoginScreen() {
  const theme = useTheme();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setLoading(true);
    try {
      const res = await action();
      if (!res.ok) setError(res.error ?? 'Connexion impossible.');
      // En cas de succès, la garde de route (root layout) redirige automatiquement.
    } catch {
      // Dernier filet : un rejet inattendu ne doit jamais crasher l'écran.
      setError('Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.xl }}>
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: theme.radius.xl,
              backgroundColor: theme.colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="leaf" size={38} color={theme.colors.onAccent} />
          </View>
          <Text variant="largeTitle" center>
            mangetout
          </Text>
          <Text variant="subhead" color="textSecondary" center>
            Ton suivi fitness &amp; nutrition, privé et auto-hébergé.
          </Text>
        </View>

        {env.authMode === 'password' ? (
          <View style={{ gap: theme.spacing.md }}>
            <Field
              placeholder="Adresse e-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Field
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Button
              label="Se connecter"
              loading={loading}
              onPress={() => run(() => auth.signInWithPassword(email, password))}
            />
          </View>
        ) : (
          <Button
            label="Se connecter avec Authelia"
            loading={loading}
            onPress={() => run(() => auth.signInWithOidc())}
          />
        )}

        {error ? (
          <Text variant="footnote" color="danger" center>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.colors.textTertiary}
      autoCapitalize="none"
      autoCorrect={false}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        paddingVertical: 14,
        paddingHorizontal: theme.spacing.lg,
        color: theme.colors.text,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
      }}
      {...props}
    />
  );
}
