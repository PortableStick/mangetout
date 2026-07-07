import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { sumMacros } from '@/features/food/nutrition';
import { MEAL_LABELS, MEAL_TYPES, type FoodEntry, type MealType } from '@/features/food/types';
import { today, useDeleteFoodEntry, useFoodEntries } from '@/features/food/useFoodLog';
import { useTheme } from '@/theme/ThemeProvider';

export default function JournalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const date = today();
  const { data: entries = [], isLoading } = useFoodEntries(date);
  const del = useDeleteFoodEntry();

  const total = sumMacros(entries);
  const byMeal = (m: MealType) => entries.filter((e) => e.mealType === m);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="largeTitle">Journal</Text>
        <Pressable
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="barcode-outline" size={22} color={theme.colors.onAccent} />
        </Pressable>
      </View>

      <Card>
        <Text variant="footnote" color="textTertiary">
          Total du jour
        </Text>
        <Text variant="title1">{total.kcal} kcal</Text>
        <Text variant="subhead" color="textSecondary">
          P {total.protein_g} g · G {total.carbs_g} g · L {total.fat_g} g
        </Text>
      </Card>

      {isLoading ? (
        <Text variant="subhead" color="textTertiary">
          Chargement…
        </Text>
      ) : entries.length === 0 ? (
        <Card>
          <Text variant="headline">Journée vide</Text>
          <Text variant="subhead" color="textSecondary">
            Scanne un produit pour commencer à suivre tes calories.
          </Text>
          <Button label="Scanner un code-barres" onPress={() => router.push('/scan')} style={{ marginTop: 8 }} />
        </Card>
      ) : (
        MEAL_TYPES.map((m) => {
          const items = byMeal(m);
          if (items.length === 0) return null;
          const mealTotal = sumMacros(items);
          return (
            <Card key={m}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="headline">{MEAL_LABELS[m]}</Text>
                <Text variant="subhead" color="textSecondary">
                  {mealTotal.kcal} kcal
                </Text>
              </View>
              {items.map((e) => (
                <EntryRow key={e.id} entry={e} onDelete={() => del.mutate(e)} />
              ))}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

function EntryRow({ entry, onDelete }: { entry: FoodEntry; onDelete: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onLongPress={onDelete}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.separator,
      }}
    >
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text variant="body">
          {entry.name}
          {entry.estimated ? ' · estimé' : ''}
        </Text>
        <Text variant="footnote" color="textTertiary">
          {entry.quantity_g} g · P {entry.protein_g} · G {entry.carbs_g} · L {entry.fat_g}
        </Text>
      </View>
      <Text variant="callout" color="textSecondary">
        {entry.kcal} kcal
      </Text>
    </Pressable>
  );
}
