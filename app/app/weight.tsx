import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { today } from '@/features/food/useFoodLog';
import { WeightChart } from '@/features/weight/WeightChart';
import { useAddWeightEntry, useWeightEntries } from '@/features/weight/useWeight';
import { sortByDate, weightStats } from '@/features/weight/weight';
import { useTheme } from '@/theme/ThemeProvider';

const numOf = (s: string) => Number.parseFloat(s.replace(',', '.')) || 0;

export default function WeightScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: entries = [] } = useWeightEntries();
  const addWeight = useAddWeightEntry();
  const [weight, setWeight] = useState('');

  const stats = weightStats(entries);
  const recent = sortByDate(entries).slice(-10);
  const canAdd = numOf(weight) > 0;

  const deltaColor = stats.delta > 0 ? 'warning' : stats.delta < 0 ? 'success' : 'textSecondary';

  return (
    <Screen>
      <ScreenHeader eyebrow="Suivi" title="Poids" />

      <Card>
        {stats.latest !== undefined ? (
          <>
            <Text variant="footnote" color="textTertiary">
              Dernière pesée
            </Text>
            <Text variant="title1">{stats.latest} kg</Text>
            <Text variant="subhead" color={deltaColor as 'success'}>
              {stats.delta > 0 ? '+' : ''}
              {stats.delta} kg depuis le début · min {stats.min} · max {stats.max}
            </Text>
            <View style={{ marginTop: theme.spacing.md }}>
              <WeightChart values={sortByDate(entries).map((e) => e.weight_kg)} />
            </View>
          </>
        ) : (
          <>
            <Text variant="headline">Aucune pesée</Text>
            <Text variant="subhead" color="textSecondary">
              Ajoute ta première pesée pour voir la tendance.
            </Text>
          </>
        )}
      </Card>

      <Card>
        <Text variant="headline">Nouvelle pesée</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field label="Poids (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="Ex. 78.5" />
          </View>
          <Button
            label="Ajouter"
            disabled={!canAdd}
            loading={addWeight.isPending}
            onPress={() =>
              addWeight.mutate(
                { date: today(), weight_kg: numOf(weight) },
                { onSuccess: () => setWeight('') }
              )
            }
          />
        </View>
      </Card>

      {recent.length > 0 ? (
        <Card>
          <Text variant="headline">Historique</Text>
          {recent
            .slice()
            .reverse()
            .map((e) => (
              <View
                key={e.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.separator,
                }}
              >
                <Text variant="body" color="textSecondary">
                  {e.date}
                </Text>
                <Text variant="body">{e.weight_kg} kg</Text>
              </View>
            ))}
        </Card>
      ) : null}

      <Button label="Retour" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
