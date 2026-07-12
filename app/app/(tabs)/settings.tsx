import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/AuthContext';
import { useGoals, useSetGoals } from '@/features/goals/useGoals';
import { useSync } from '@/features/sync/useSync';
import type { GoalMode } from '@/features/stats/coaching';
import { useTheme } from '@/theme/ThemeProvider';

const numOrUndef = (s: string) => {
  const n = Number.parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: goals } = useGoals();
  const setGoals = useSetGoals();
  const sync = useSync();

  const [kcal, setKcal] = useState(goals?.kcal ? String(goals.kcal) : '');
  const [protein, setProtein] = useState(goals?.protein_g ? String(goals.protein_g) : '');
  const [carbs, setCarbs] = useState(goals?.carbs_g ? String(goals.carbs_g) : '');
  const [fat, setFat] = useState(goals?.fat_g ? String(goals.fat_g) : '');

  const offline = sync.data?.every((r) => r.offline);

  return (
    <Screen>
      <ScreenHeader eyebrow="Compte" title="Réglages" />

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
        <Text variant="headline">Objectifs quotidiens</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Calories" value={kcal} onChangeText={setKcal} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Protéines (g)" value={protein} onChangeText={setProtein} keyboardType="numeric" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Glucides (g)" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Lipides (g)" value={fat} onChangeText={setFat} keyboardType="numeric" />
          </View>
        </View>
        <Button
          label="Enregistrer les objectifs"
          loading={setGoals.isPending}
          onPress={() =>
            setGoals.mutate({
              kcal: numOrUndef(kcal),
              protein_g: numOrUndef(protein),
              carbs_g: numOrUndef(carbs),
              fat_g: numOrUndef(fat),
            })
          }
          style={{ marginTop: 8 }}
        />
      </Card>

      <Card>
        <Text variant="headline">Mode objectif</Text>
        <Text variant="footnote" color="textTertiary">
          Utilisé par les repères de protéines (ISSN) et de calories (NIH) du dashboard.
        </Text>
        <SegmentedControl
          options={[
            { label: 'Prise de muscle', value: 'gain' },
            { label: 'Perte de gras', value: 'cut' },
            { label: 'Maintien', value: 'maintain' },
          ]}
          value={goals?.mode ?? 'maintain'}
          onChange={(mode: GoalMode) => setGoals.mutate({ ...(goals ?? {}), mode })}
        />
      </Card>

      <Card>
        <Text variant="headline">Apparence</Text>
        <Text variant="footnote" color="textTertiary">
          Choisis l’apparence de l’app.
        </Text>
        <SegmentedControl
          options={[
            { label: 'Système', value: 'system' },
            { label: 'Clair', value: 'light' },
            { label: 'Sombre', value: 'dark' },
          ]}
          value={theme.mode}
          onChange={theme.setMode}
        />
      </Card>

      <Card>
        <Text variant="headline">Synchronisation</Text>
        <Text variant="footnote" color="textTertiary">
          Le homelab est la source de vérité. La sync se fait automatiquement ; tu peux la forcer.
        </Text>
        <Button
          label={sync.isPending ? 'Synchronisation…' : 'Synchroniser maintenant'}
          variant="secondary"
          loading={sync.isPending}
          onPress={() => sync.mutate()}
          style={{ marginTop: 8 }}
        />
        {sync.data ? (
          <Text variant="footnote" color={offline ? 'warning' : 'success'}>
            {offline ? 'Hors-ligne — les modifications sont en file.' : 'À jour avec le homelab.'}
          </Text>
        ) : null}
      </Card>

      <Button label="Mes salles" variant="ghost" onPress={() => router.push('/gyms')} />
      <Button label="À propos (licences, IA)" variant="ghost" onPress={() => router.push('/about')} />
      <Button label="Se déconnecter" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
