import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { MealPicker } from '@/features/food/MealPicker';
import { lookupBarcode, type OffLookup } from '@/features/food/openFoodFacts';
import { macrosForQuantity } from '@/features/food/nutrition';
import { type Food, type MealType } from '@/features/food/types';
import { today, useAddFoodEntry } from '@/features/food/useFoodLog';
import { useTheme } from '@/theme/ThemeProvider';

// Formats stricts (moins de types = scan plus rapide). expo-barcode-scanner est supprimé.
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function ScanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [lookup, setLookup] = useState<OffLookup | null>(null);
  const [busy, setBusy] = useState(false);
  const scannedRef = useRef(false);

  const onScanned = useCallback(async (data: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setBusy(true);
    setLookup(await lookupBarcode(data));
    setBusy(false);
  }, []);

  const reset = () => {
    scannedRef.current = false;
    setLookup(null);
  };

  if (!permission) return <Screen scroll={false} />;

  if (!permission.granted) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
          <Text variant="title2" center>
            Accès à la caméra
          </Text>
          <Text variant="subhead" color="textSecondary" center>
            Autorise la caméra pour scanner les codes-barres des produits.
          </Text>
          <Button label="Autoriser" onPress={() => void requestPermission()} />
          <Button label="Annuler" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {!lookup && (
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={busy ? undefined : (r) => void onScanned(r.data)}
        />
      )}
      {lookup ? (
        <ResultSheet lookup={lookup} onDismiss={() => router.back()} onRetry={reset} />
      ) : (
        <View style={{ position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' }}>
          <Text variant="callout" style={{ color: '#fff' }}>
            {busy ? 'Recherche…' : 'Vise un code-barres'}
          </Text>
        </View>
      )}
    </View>
  );
}

function ResultSheet({
  lookup,
  onDismiss,
  onRetry,
}: {
  lookup: OffLookup;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const add = useAddFoodEntry();
  const [quantity, setQuantity] = useState('100');
  const [meal, setMeal] = useState<MealType>('lunch');

  if (lookup.status !== 'found') {
    const msg =
      lookup.status === 'not_found'
        ? 'Produit inconnu d’Open Food Facts.'
        : lookup.status === 'incomplete'
          ? 'Produit trouvé mais sans valeurs nutritionnelles.'
          : 'Erreur de recherche.';
    return (
      <Overlay>
        <Text variant="headline">{msg}</Text>
        <Text variant="footnote" color="textTertiary">
          Tu pourras le saisir manuellement (bientôt) ou réessayer.
        </Text>
        <Button label="Réessayer" onPress={onRetry} />
        <Button label="Fermer" variant="ghost" onPress={onDismiss} />
      </Overlay>
    );
  }

  const food: Food = lookup.food;
  const q = Number.parseFloat(quantity) || 0;
  const preview = macrosForQuantity(food, q);

  return (
    <Overlay>
      <Text variant="title3">{food.name}</Text>
      {food.brand ? (
        <Text variant="footnote" color="textTertiary">
          {food.brand}
        </Text>
      ) : null}
      <Text variant="subhead" color="textSecondary">
        {food.kcal_100g} kcal · P {food.protein_100g} · G {food.carbs_100g} · L {food.fat_100g} (/100 g)
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.md,
            paddingVertical: 10,
            paddingHorizontal: theme.spacing.lg,
            color: theme.colors.text,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: theme.typography.body.fontSize,
            minWidth: 90,
          }}
        />
        <Text variant="body" color="textSecondary">
          g → {preview.kcal} kcal
        </Text>
      </View>

      <MealPicker value={meal} onChange={setMeal} />

      <Button
        label="Ajouter au journal"
        loading={add.isPending}
        onPress={() =>
          add.mutate(
            { food, quantityG: q, mealType: meal, date: today() },
            { onSuccess: onDismiss }
          )
        }
      />
      <Button label="Annuler" variant="ghost" onPress={onRetry} />
    </Overlay>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <Card elevation="md" style={{ margin: 12, gap: 10 }}>
        {children}
      </Card>
    </View>
  );
}
