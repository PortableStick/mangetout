# Design — Salles (CRUD + IA), markdown coach, thème & refonte visuelle

> Date : 2026-07-12 · Auteur : orchestrateur (Opus) · Statut : validé pour planification
> Milestones **M12 → M15**, dans la continuité de 0→11. Chantier combiné, exécuté milestone par
> milestone, orchestré par Opus avec implémentation déléguée à des agents Sonnet, portes qualité du
> projet (code-reviewer + security-reviewer + test-runner) **vertes avant chaque merge**.

## Contexte & objectifs

Quatre besoins utilisateur, regroupés car ils se recoupent (salles + coach + UI) :

1. **Gérer les salles à la main** — aucun écran ni fonction CRUD n'existe aujourd'hui : le repository
   n'a que `listGyms` / `seedDefaultGyms` / `addEquipment` ([app/src/features/workouts/repository.ts](../../../app/src/features/workouts/repository.ts)),
   et l'onglet Séances ne fait que semer 2 salles par défaut.
2. **Rendu markdown propre dans le chat coach** — [coach.tsx:107](../../../app/app/(tabs)/coach.tsx) affiche le
   texte brut, donc `**gras**` apparaît littéralement.
3. **L'IA peut modifier les salles** — [coach/tools.ts](../../../server/src/coach/tools.ts) n'expose que
   `list_gyms` (lecture) ; aucune action d'écriture sur les salles/équipement.
4. **UI plus propre, thème clair/sombre choisi** — [ThemeProvider.tsx](../../../app/src/theme/ThemeProvider.tsx)
   suit uniquement le système ; refonte visuelle souhaitée.

### Non-objectifs (YAGNI)
- Pas de partage de salles entre utilisateurs (owner-scoped strict, cohérent avec l'app).
- Pas d'import/export de catalogues d'équipement.
- Pas de nouvelle dépendance markdown ni d'animation lourde (voir décisions transverses).
- La refonte reste dans l'identité existante (Apple clean, accent vert « mangetout ») — pas de rebrand.

## Décisions transverses
- **Sync-first partout** : toute écriture locale (manuelle) passe par `getSyncManager().enqueue`
  (écriture SQLite optimiste + file de push), comme l'existant. Les actions IA écrivent côté serveur
  (PocketBase) puis l'app **déclenche `getSyncManager().syncAll()`** pour rapatrier le changement dans
  le cache local (corrige une latence déjà présente pour les actions food/weight du coach).
- **Soft-delete + cascade** : supprimer = `deleted:true`. Supprimer une salle cascade en soft-delete
  sur son équipement. Les séances passées ne sont jamais supprimées (affichage « Salle supprimée » si
  le nom est introuvable).
- **Invariant sécurité coach inchangé** : le champ `user` d'un enregistrement est TOUJOURS l'utilisateur
  vérifié du contexte serveur, jamais une valeur venue du modèle. Pour update/delete, l'`id` cible peut
  venir du modèle mais l'autorisation reste garantie par les règles owner-only PocketBase (+
  parent-ownership pour l'équipement).
- **Zéro nouvelle dépendance** : markdown = renderer maison ; animations = `Pressable` + API `Animated`
  RN et/ou `react-native-reanimated` **déjà présent** (dépendance transitive d'expo-router) — aucune
  nouvelle install.
- **Persistance du mode thème** : via `expo-secure-store` (déjà installé, aucune dépendance ajoutée,
  valeur minuscule) ; défaut `system` tant que la valeur persistée n'est pas chargée.

---

## M12 — Salles : CRUD manuel

### Repository ([app/src/features/workouts/repository.ts](../../../app/src/features/workouts/repository.ts))
Nouvelles fonctions (mêmes conventions que `addEquipment` : `enqueue` + `newId` + `clientUpdatedAt`) :
- `addGym({ name, gymType, userId }) → Promise<string>`
- `updateGym({ id, name, gymType, userId })`
- `deleteGym({ id, userId })` — soft-delete de la salle **et** cascade soft-delete de chaque
  équipement dont `gym === id` (via `listEquipment(id)` puis `enqueue('equipment', 'upsert', { …, deleted:true })`).
- `updateEquipment({ id, name, category, muscleGroups, gymId, userId })`
- `removeEquipment({ id, userId })` — soft-delete.

### Hooks ([app/src/features/workouts/useWorkouts.ts](../../../app/src/features/workouts/useWorkouts.ts))
`useAddGym`, `useUpdateGym`, `useDeleteGym`, `useUpdateEquipment`, `useRemoveEquipment` — mêmes patterns
que `useAddEquipment`, invalidation des clés `['gyms']` / `['equipment', gymId]` en `onSuccess`.

### UI (expo-router)
- **`/gyms`** — liste des salles (nom, type via badge, nb d'équipements) ; bouton « + Ajouter »,
  chaque ligne cliquable → `/gym-edit?id=`. Accessible depuis l'onglet **Séances** (bouton « Gérer les
  salles ») **et** depuis **Réglages**.
- **`/gym-edit`** — création (sans `id`) ou édition (`id` en param). Champs : nom, type (segmented
  control chain/home). Section **Équipement** : liste avec ajout (nom + catégorie + groupes musculaires)
  et retrait. Bouton « Supprimer la salle » (confirmation) en mode édition.
- L'écran d'accueil vide de Séances ([workouts.tsx](../../../app/app/(tabs)/workouts.tsx)) garde le seed
  par défaut et gagne un lien vers `/gyms`.

### Tests (test-runner)
CRUD repository (add/update/delete gym, update/remove equipment), **cascade** de suppression (équipement
soft-deleté), non-suppression des séances liées.

---

## M13 — Salles : outils IA (propose → confirme → applique)

### Serveur — outils ([server/src/coach/tools.ts](../../../server/src/coach/tools.ts))
Nouveaux outils **action** avec args zod bornés :
- `add_gym` → collection `gyms`, args `{ name: string(1..80), gymType: enum(chain|home) }`
- `update_gym` → `{ id: string, name?: string, gymType?: enum }` (au moins un champ modifiable)
- `delete_gym` → `{ id: string }`
- `add_equipment` → collection `equipment`, args `{ gymId: string, name, category, muscleGroups[] }`
- `remove_equipment` → `{ id: string }`

`toolDefinitions()` continue d'exposer un schéma libre au modèle (validation réelle post-hoc côté
serveur) — comportement existant, non régressé.

### Serveur — exécution ([server/src/coach/execute.ts](../../../server/src/coach/execute.ts))
`applyAction` ne fait aujourd'hui qu'un **POST create**. On introduit une **opération** par outil
(`create` | `update` | `delete`) :
- `create` : POST `/api/collections/{c}/records`, `buildRecord` fixe `user: ctx.userId`.
- `update` : PATCH `/api/collections/{c}/records/{id}` avec les seuls champs fournis + `clientUpdatedAt`
  ; **jamais** `user` dans le patch (pas de réassignation).
- `delete` : PATCH `{ deleted: true, clientUpdatedAt }` (soft-delete, cohérent avec le modèle de sync) ;
  pour `delete_gym`, cascade côté serveur sur l'équipement de la salle.
Autorisation : les règles owner-only PB rejettent tout `id` n'appartenant pas à l'utilisateur (backstop).
`proposalSummary` ([coach/engine.ts](../../../server/src/coach/engine.ts)) étendu : résumé lisible FR par
nouvel outil.

### App
Le chemin d'`apply` est déjà générique ([coach.tsx](../../../app/app/(tabs)/coach.tsx) `confirm()` →
`useApplyAction`). Modif : après un `apply` réussi, **déclencher `getSyncManager().syncAll()` puis
`qc.invalidateQueries()`** (au lieu d'invalider seul), pour que les changements IA écrits côté serveur
apparaissent immédiatement.

### Tests serveur (test-runner)
Validation des 5 nouveaux outils, routage `create/update/delete`, `user` jamais issu du modèle, `id`
non-owner rejeté (owner-scoping), proposition ≠ exécution, cascade delete gym.

---

## M14 — Rendu markdown propre dans le chat coach

### Module pur — `app/src/features/ai/markdown.ts`
`parseMarkdown(text: string): MdBlock[]` — parseur **maison**, testable, sans dépendance.
Sous-ensemble supporté (suffisant pour la sortie coach) :
- Blocs : paragraphes, titres `#`..`###`, listes à puces (`-`/`*`) et numérotées, séparation par lignes vides.
- Inline : `**gras**`, `*italique*` / `_italique_`, `` `code` ``.
Sortie = liste de blocs typés, chaque bloc portant des *spans* inline typés (`text` | `bold` | `italic`
| `code`). Robuste aux marqueurs non fermés (retombe en texte brut, jamais d'exception).

### Composant — `app/src/components/ui/Markdown.tsx`
`<Markdown>{content}</Markdown>` rend les blocs avec le `Text` du thème (poids/tailles via `typography`,
`code` sur `surfaceMuted` en police mono système). Utilisé dans les bulles assistant de
[coach.tsx](../../../app/app/(tabs)/coach.tsx) à la place du `Text` brut (les bulles user restent en texte
brut).

### Tests (test-runner)
Le parseur : gras/italique/code, listes, titres, marqueurs non fermés, texte vide, imbrication simple.

---

## M15 — Thème sélectionnable + refonte visuelle

### M15a — Plomberie thème (petit, faible risque)
[ThemeProvider.tsx](../../../app/src/theme/ThemeProvider.tsx) gère un **mode** `system | light | dark` :
- Le scheme effectif = `mode === 'system' ? useColorScheme() : mode`.
- Mode persisté via `expo-secure-store` (clé dédiée) ; chargé au démarrage (défaut `system`).
- Le contexte expose `mode`, `setMode`. Sélecteur **segmented control** (Système / Clair / Sombre) dans
  [Réglages](../../../app/app/(tabs)/settings.tsx).
- Tests : résolution du scheme selon le mode ; round-trip de persistance.

### M15b — Refonte visuelle « mangetout, affirmé »
Direction verrouillée (reste dans l'identité Apple clean + accent vert, mais plus affirmée et cohérente) :
- **Couleur** : identité verte conservée et mieux exploitée ; fonds neutres légèrement plus chauds/
  profonds ; usage discipliné de `accentMuted` pour badges/pistes ; sémantiques success/warning/danger
  homogènes. Ajustements dans [tokens.ts](../../../app/src/theme/tokens.ts) uniquement (source unique).
- **Typographie** : échelle Inter resserrée, contraste de graisse renforcé sur les titres, hiérarchie
  plus nette (titres plus confiants, secondaires plus discrets).
- **Surfaces** : cartes en couches douces (élévations `sm/md/lg` retravaillées), séparateurs en filet,
  rythme d'espacement homogène (base 4 existante).
- **Nouveaux primitives partagés** (dans `components/ui/`) : `SegmentedControl` (réutilisé par le thème
  et le type de salle), `ListRow`, `IconButton`, `Badge`, `EmptyState` — pour dé-dupliquer les motifs
  déjà répétés (en-têtes d'écran, états vides, lignes de liste).
- **Micro-interactions** : états pressé (opacité/échelle légère) sur `Button`/`Card` via `Pressable` ;
  transitions douces via `react-native-reanimated` **déjà présent** (aucune install). Sobre, pas de
  surcharge.
- **Propagation** : les écrans consommant le kit héritent de la refonte ; le polish par écran est ciblé
  (Séances, Journal, Coach, Réglages, Dashboard, écrans salles).
- Menée avec le skill **frontend-design** au moment de l'implémentation.
- Tests : smoke (rendu des nouveaux primitives, thème appliqué) ; le gros est visuel/manuel.

---

## Modèle d'exécution
- **Orchestrateur (Opus, cette session)** : séquencement, revues, commits/merges, arbitrages.
- **Implémentation** : agents **Sonnet** (`general-purpose`, avec droits d'écriture) par milestone —
  les agents custom du projet sont read-only (sauf test-runner). Dérogation explicite à la règle
  CLAUDE.md « l'orchestrateur écrit tout le code de prod », autorisée par l'utilisateur.
- **Portes qualité avant chaque merge** : `code-reviewer` + `security-reviewer` (M13 surtout) +
  `test-runner`, plus `gate.mjs` (typecheck + lint + tests). Un milestone n'est « fait » que **vert**.
- **Branche** : `feat/gyms-and-polish` (ou une branche par milestone si préférable au plan).
- **Ordre suggéré** : M12 → M13 (dépend du CRUD/patterns) → M14 (indépendant) → M15a → M15b (bénéficie
  du thème et touche transversalement le kit ; fait en dernier pour éviter le rework).

## Risques & garde-fous
- **Latence d'affichage des actions IA** : résolu par le déclenchement de `syncAll()` après `apply`.
- **Refonte transverse (M15b)** : risque de régression visuelle large → concentrer les changements dans
  `tokens.ts` + kit `components/ui/` (source unique) et garder les écrans minces ; smoke tests + revue.
- **Persistance thème** : lecture async → bref défaut `system` au 1er rendu (acceptable, pas de flash
  majeur car proche du choix système).
- **Marqueurs markdown mal formés** : le parseur retombe en texte brut, jamais d'exception.
