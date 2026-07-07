import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { MealPicker } from '@/features/food/MealPicker';
import { type MealType } from '@/features/food/types';
import { today, useAddMealToJournal, useMeals } from '@/features/food/useFoodLog';
import { useTheme } from '@/theme/ThemeProvider';

/** Repas / recettes réutilisables : liste + ajout au journal. */
export default function MealsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: meals = [], isLoading } = useMeals();
  const addMeal = useAddMealToJournal();
  const [meal, setMeal] = useState<MealType>('lunch');

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="largeTitle">Repas</Text>
        <Pressable
          onPress={() => router.push('/meal-new')}
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
          <Ionicons name="add" size={26} color={theme.colors.onAccent} />
        </Pressable>
      </View>

      <Text variant="footnote" color="textTertiary">
        Ajouter au repas
      </Text>
      <MealPicker value={meal} onChange={setMeal} />

      {isLoading ? (
        <Text variant="subhead" color="textTertiary">
          Chargement…
        </Text>
      ) : meals.length === 0 ? (
        <Card>
          <Text variant="headline">Aucun repas enregistré</Text>
          <Text variant="subhead" color="textSecondary">
            Compose un repas réutilisable à partir de tes aliments.
          </Text>
          <Button label="Nouveau repas" onPress={() => router.push('/meal-new')} style={{ marginTop: 8 }} />
        </Card>
      ) : (
        meals.map((m) => (
          <Card key={m.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{m.name}</Text>
                <Text variant="footnote" color="textTertiary">
                  {m.portions} portion{m.portions > 1 ? 's' : ''}
                </Text>
              </View>
              <Button
                label="Ajouter"
                variant="secondary"
                loading={addMeal.isPending}
                onPress={() => addMeal.mutate({ mealId: m.id, mealType: meal, date: today() })}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
