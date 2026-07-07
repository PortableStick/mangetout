import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';

export default function AboutScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Text variant="largeTitle">À propos</Text>

      <Card>
        <Text variant="headline">mangetout</Text>
        <Text variant="subhead" color="textSecondary">
          Suivi fitness &amp; nutrition, offline-first, auto-hébergé. Tes données vivent sur ton
          homelab, pas dans le cloud.
        </Text>
      </Card>

      <Card>
        <Text variant="headline">Données nutritionnelles</Text>
        <Text variant="subhead" color="textSecondary">
          Data from Open Food Facts / ODbL.
        </Text>
        <Text variant="footnote" color="textTertiary">
          Les informations produits proviennent d’Open Food Facts, sous licence ODbL (attribution +
          partage à l’identique). Données communautaires : à vérifier.
        </Text>
      </Card>

      <Card>
        <Text variant="headline">Intelligence artificielle</Text>
        <Text variant="subhead" color="textSecondary">
          Les fonctions IA (log en langage naturel, estimations, coach, vision) passent par un proxy
          auto-hébergé qui contacte OpenRouter. La clé reste côté serveur.
        </Text>
        <Text variant="footnote" color="textTertiary">
          Confidentialité : le texte/les images que tu soumets à l’IA sont transmis à OpenRouter pour
          traitement. Les estimations IA sont toujours marquées « estimé ».
        </Text>
      </Card>

      <Card>
        <Text variant="footnote" color="textTertiary">
          AI {env.aiEnabled ? 'activée' : 'désactivée'} · Auth {env.authMode}
        </Text>
      </Card>

      <Button label="Retour" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
