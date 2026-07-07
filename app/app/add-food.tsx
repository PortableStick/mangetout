import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import { captureImage, useLabelVision } from '@/features/ai/vision';
import { MealPicker } from '@/features/food/MealPicker';
import { makeManualFood } from '@/features/food/repository';
import { type MealType } from '@/features/food/types';
import { today, useAddFoodEntry } from '@/features/food/useFoodLog';

const numOf = (s: string) => Number.parseFloat(s.replace(',', '.')) || 0;

/** Saisie manuelle d'un aliment (valeurs /100 g) + ajout au journal. */
export default function AddFoodScreen() {
  const router = useRouter();
  const add = useAddFoodEntry();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [meal, setMeal] = useState<MealType>('lunch');
  const label = useLabelVision();

  const canSave = name.trim().length > 0 && numOf(quantity) > 0;

  async function scanLabel() {
    const image = await captureImage();
    if (!image) return;
    const res = await label.mutateAsync(image);
    if (res.name) setName(res.name);
    setKcal(String(res.per_100g.kcal));
    setProtein(String(res.per_100g.protein_g));
    setCarbs(String(res.per_100g.carbs_g));
    setFat(String(res.per_100g.fat_g));
  }

  function save() {
    const food = makeManualFood({
      name: name.trim(),
      kcal_100g: numOf(kcal),
      protein_100g: numOf(protein),
      carbs_100g: numOf(carbs),
      fat_100g: numOf(fat),
    });
    add.mutate(
      { food, quantityG: numOf(quantity), mealType: meal, date: today() },
      { onSuccess: () => router.back() }
    );
  }

  return (
    <Screen>
      <Text variant="largeTitle">Saisie manuelle</Text>
      <Text variant="footnote" color="textTertiary">
        Valeurs nutritionnelles pour 100 g.
      </Text>

      {env.aiEnabled ? (
        <Button
          label={label.isPending ? 'Lecture de l’étiquette…' : '📷 Scanner l’étiquette'}
          variant="secondary"
          loading={label.isPending}
          onPress={scanLabel}
        />
      ) : null}

      <Field label="Nom" value={name} onChangeText={setName} placeholder="Ex. Fromage blanc" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Calories (kcal)" value={kcal} onChangeText={setKcal} keyboardType="numeric" />
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
      <Field label="Quantité (g)" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />

      <Text variant="footnote" color="textTertiary">
        Repas
      </Text>
      <MealPicker value={meal} onChange={setMeal} />

      <Button label="Ajouter au journal" loading={add.isPending} disabled={!canSave} onPress={save} style={{ marginTop: 8 }} />
      <Button label="Annuler" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
