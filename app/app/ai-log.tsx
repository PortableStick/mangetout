import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { MealPicker } from '@/features/food/MealPicker';
import { type Food, type MealType } from '@/features/food/types';
import { today, useAddFoodEntry } from '@/features/food/useFoodLog';
import { useParseFood, type ParsedFoodItem } from '@/features/ai/useAi';
import { newId } from '@/lib/id';

const round1 = (x: number) => Math.round(x * 10) / 10;

function itemToFood(item: ParsedFoodItem): Food {
  const f = item.quantity_g > 0 ? 100 / item.quantity_g : 0;
  return {
    id: newId(),
    name: item.name,
    source: 'ai',
    kcal_100g: Math.round(item.macros.kcal * f),
    protein_100g: round1(item.macros.protein_g * f),
    carbs_100g: round1(item.macros.carbs_g * f),
    fat_100g: round1(item.macros.fat_g * f),
  };
}

/** Log alimentaire en langage naturel : « 2 œufs et une tranche de pain ». */
export default function AiLogScreen() {
  const router = useRouter();
  const parse = useParseFood();
  const add = useAddFoodEntry();
  const [text, setText] = useState('');
  const [meal, setMeal] = useState<MealType>('lunch');
  const items = parse.data?.items ?? [];

  async function addAll() {
    for (const item of items) {
      await add.mutateAsync({ food: itemToFood(item), quantityG: item.quantity_g, mealType: meal, date: today() });
    }
    router.back();
  }

  return (
    <Screen>
      <Text variant="largeTitle">Log rapide</Text>
      <Text variant="footnote" color="textTertiary">
        Décris ce que tu as mangé, l’IA estime les macros (toujours marquées « estimé »).
      </Text>

      <Field
        value={text}
        onChangeText={setText}
        placeholder="Ex. 2 œufs, une tranche de pain complet et un café"
        multiline
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      <Button
        label="Analyser"
        variant="secondary"
        loading={parse.isPending}
        disabled={text.trim().length === 0}
        onPress={() => parse.mutate(text.trim())}
      />

      {parse.isError ? (
        <Text variant="footnote" color="danger">
          {parse.error instanceof Error ? parse.error.message : 'Analyse impossible.'}
        </Text>
      ) : null}

      {items.length > 0 ? (
        <>
          <Card>
            <Text variant="headline">Estimation</Text>
            {items.map((it, i) => (
              <View
                key={i}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}
              >
                <Text variant="body" style={{ flex: 1 }}>
                  {it.name} · {it.quantity_g} g
                </Text>
                <Text variant="callout" color="textSecondary">
                  {it.macros.kcal} kcal
                </Text>
              </View>
            ))}
            <Text variant="footnote" color="textTertiary">
              Estimation IA — vérifiable et modifiable ensuite.
            </Text>
          </Card>
          <MealPicker value={meal} onChange={setMeal} />
          <Button label="Tout ajouter au journal" loading={add.isPending} onPress={addAll} />
        </>
      ) : null}

      <Button label="Fermer" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
