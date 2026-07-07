import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { mealMacros, type MealComponent } from '@/features/food/recipes';
import { type Food } from '@/features/food/types';
import { useFoods, useSaveMeal } from '@/features/food/useFoodLog';
import { useTheme } from '@/theme/ThemeProvider';

const numOf = (s: string) => Number.parseFloat(s.replace(',', '.')) || 0;

/** Composeur de repas : ajoute des aliments existants + quantités, nomme, enregistre. */
export default function MealNewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: foods = [] } = useFoods();
  const saveMeal = useSaveMeal();

  const [name, setName] = useState('');
  const [portions, setPortions] = useState('1');
  const [search, setSearch] = useState('');
  const [components, setComponents] = useState<MealComponent[]>([]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 6);
  }, [foods, search]);

  const total = mealMacros(components);
  const canSave = name.trim().length > 0 && components.length > 0;

  const addComponent = (food: Food) => {
    setComponents((c) => [...c, { food, quantity_g: 100 }]);
    setSearch('');
  };
  const setQty = (i: number, q: number) =>
    setComponents((c) => c.map((comp, idx) => (idx === i ? { ...comp, quantity_g: q } : comp)));
  const remove = (i: number) => setComponents((c) => c.filter((_, idx) => idx !== i));

  return (
    <Screen>
      <Text variant="largeTitle">Nouveau repas</Text>

      <Field label="Nom du repas" value={name} onChangeText={setName} placeholder="Ex. Bowl poulet-riz" />
      <Field label="Portions" value={portions} onChangeText={setPortions} keyboardType="numeric" />

      <Field label="Ajouter un aliment" value={search} onChangeText={setSearch} placeholder="Rechercher…" />
      {matches.map((f) => (
        <Pressable key={f.id} onPress={() => addComponent(f)}>
          <Card elevation="none" style={{ paddingVertical: 10 }}>
            <Text variant="body">{f.name}</Text>
            <Text variant="footnote" color="textTertiary">
              {f.kcal_100g} kcal /100 g
            </Text>
          </Card>
        </Pressable>
      ))}
      {search.trim().length > 0 && matches.length === 0 ? (
        <Text variant="footnote" color="textTertiary">
          Aucun aliment. Scanne ou saisis-en un d’abord.
        </Text>
      ) : null}

      {components.length > 0 ? (
        <Card>
          <Text variant="headline">Composition</Text>
          {components.map((c, i) => (
            <View
              key={`${c.food.id}-${i}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 6 }}
            >
              <Text variant="body" style={{ flex: 1 }}>
                {c.food.name}
              </Text>
              <Field
                value={String(c.quantity_g)}
                onChangeText={(v) => setQty(i, numOf(v))}
                keyboardType="numeric"
                style={{ width: 74, paddingVertical: 8, textAlign: 'right' }}
              />
              <Text variant="footnote" color="textTertiary">
                g
              </Text>
              <Pressable onPress={() => remove(i)} accessibilityRole="button">
                <Ionicons name="close-circle" size={22} color={theme.colors.textTertiary} />
              </Pressable>
            </View>
          ))}
          <Text variant="subhead" color="textSecondary">
            Total : {total.kcal} kcal · P {total.protein_g} · G {total.carbs_g} · L {total.fat_g}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Enregistrer le repas"
        disabled={!canSave}
        loading={saveMeal.isPending}
        onPress={() =>
          saveMeal.mutate(
            { name: name.trim(), portions: numOf(portions) || 1, components },
            { onSuccess: () => router.back() }
          )
        }
        style={{ marginTop: 8 }}
      />
      <Button label="Annuler" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
