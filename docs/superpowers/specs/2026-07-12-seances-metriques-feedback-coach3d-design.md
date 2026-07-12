# Design — Refonte Séances, métriques flexibles, feedback scientifique & coach visuel

> Date : 2026-07-12 · Auteur : orchestrateur (Opus) · Statut : validé pour planification
> Milestones **M16 → M20**. Un seul chantier, exécuté milestone par milestone (Opus orchestre, agents
> Sonnet implémentent, portes qualité vertes avant chaque merge). Fondé sur une recherche web sourcée
> (voir « Références » en fin de doc).

## Contexte & objectifs
Le module Séances actuel est un cul-de-sac : `Workout {date, gym, notes}`, `Exercise {name, equipment?,
position}`, `ExerciseSet {reps, weight_kg, position}` — **aucun statut**, **aucune provenance**, date figée
à `today()`, **pas d'écran de détail** (on ne peut ni revoir ni éditer une séance), **pas de duplication**,
et les séries ne stockent **que reps×poids** (inadapté au rameur, tapis, gainage…). Le chat coach a ses
bulles masquées par le clavier.

Objectifs (demande utilisateur) :
1. Rendre les séances **utilisables** : voir/éditer une séance enregistrée, la dupliquer.
2. **Statuts** (planifiée / en cours / faite) + **provenance** (générée par l'appli ou non).
3. **Métriques d'équipement flexibles** (rameur = temps/distance/SPM/watts, etc.) ; l'IA **et** l'utilisateur
   créent des équipements avec des caractéristiques variables, **sans inventer de nouveaux types** de champ.
4. **Feedback scientifique** sur la progression et la nutrition (« bien / trop / pas assez »).
5. **Fix clavier** du coach.
6. **Coach visuel 3D** (avatar façon Wii Fit qui montre le mouvement + cadence visuelle & audio) — **3D
   obligatoire côté utilisateur, mais dé-risqué par un POC** (la stack 3D Expo est instable en amont).

### Non-objectifs (YAGNI)
- Pas de **prédiction de résultat individuel** (date d'atteinte d'un poids, gain musculaire projeté) — la
  recherche établit que c'est de la sur-promesse non fondée. Uniquement du **feedback de tendance**.
- L'utilisateur **ne crée pas** de nouveaux *types* de métriques (seulement des équipements combinant des
  types existants d'un catalogue fixe).
- Pas de production d'une bibliothèque complète d'animations 3D par exercice en v1 (POC + périmètre limité).

## Décisions transverses
- Continuité offline-first : écritures via `getSyncManager().enqueue`, soft-delete, `clientUpdatedAt`.
  Stockage générique `sync_records` (payload JSON) — les nouveaux champs sont **additifs** (rétro-compatibles
  avec les enregistrements existants ; valeurs par défaut au mapping).
- **Nouvelles dépendances autorisées pour M20 uniquement** (le 3D/audio l'exige — exception explicite à la
  règle « zéro dépendance » des chantiers précédents) : `expo-gl`, `three` (+ `expo-three` ou loader GLTF
  manuel), `expo-av`/`expo-speech` pour audio/TTS. Versions compatibles Expo 57 à **vérifier au plan**.
  M16→M19 restent **zéro nouvelle dépendance**.
- **Owner-scoping coach inchangé** : `user` = utilisateur vérifié serveur, jamais le modèle ; ids d'outils
  validés `^[a-z0-9]{15}$`.
- Feedback = **heuristiques transparentes et sourcées**, jamais des prédictions ; chaque reco porte un champ
  `source` (`acsm | issn | nih | rp_heuristic | user_override`).

---

## M16 — Fix clavier du chat coach
Le clavier masque les bulles ([app/app/(tabs)/coach.tsx](../../../app/app/(tabs)/coach.tsx)).
- Envelopper le contenu dans `KeyboardAvoidingView` (behavior `padding` iOS / `height` Android) et/ou
  `ScrollView` avec `keyboardShouldPersistTaps="handled"` ; auto-scroll en bas à l'envoi et à l'arrivée
  d'une réponse. Vérifier le comportement avec la barre d'onglets.
- Petit, indépendant, en premier (quick win). Test : smoke / manuel.

## M17 — Refonte données & UX Séances
### Modèle (types + mapping repository)
- `Workout` : ajouter `status: 'planned' | 'in_progress' | 'done'`, `source: 'generated' | 'manual' | 'vision'`,
  `at: string` (ISO datetime, remplace/complète `date` — garder `date` dérivé pour la compat). Défauts au
  mapping : anciens records → `status:'done'`, `source:'manual'`.
- `Exercise` : ajouter `source?: 'generated' | 'manual' | 'vision'` (provenance fine, optionnel).
- Repository : `updateWorkout`, `deleteWorkout`, `updateExercise`, `deleteExercise`, `updateSet`,
  `deleteSet`, `duplicateWorkout(id, { at?, status? })` (copie exercices+séries avec nouveaux ids,
  `source` conservé, `status:'planned'` ou `'done'` selon paramètre).
### UI
- **`/workout/[id]`** (NOUVEAU) : détail d'une séance — en-tête (date/heure, salle, statut badge, provenance
  badge), liste des exercices avec leurs séries (rendu adapté au metric_set — voir M18), édition inline ou
  via sous-écrans, actions : **Dupliquer**, **Supprimer**, changer le statut, marquer « fait ».
- `workouts.tsx` (onglet) : chaque carte devient tappable → `/workout/[id]` (via `ListRow`), avec **badge de
  statut** (planifiée/en cours/faite) et **filtre** (à venir / passées). Section « À venir » vs « Historique ».
- `workout-new.tsx` : **sélecteur de date & heure** (loguer une séance passée / planifier une future),
  choix explicite du **statut** initial, et le `source` est renseigné automatiquement (`generated` si passé
  par le générateur, `manual` sinon, `vision` si via scan machine).
### Tests
Repository (update/delete/duplicate, mapping des défauts pour anciens records), logique de tri/filtre par statut.

## M18 — Métriques d'équipement flexibles
### Catalogue de champs (FIXE) — `app/src/features/workouts/metrics.ts`
Chaque champ = `{ key, label, unit, kind: 'int'|'float'|'duration'|'enum' }`. Catalogue **fermé** (l'utilisateur
n'en ajoute pas) : `reps`, `weight_kg`, `added_weight_kg`, `assist_weight_kg`, `duration_s`, `distance_m`,
`pace_split_500m`, `speed_kmh`, `watts`, `cadence_rpm`, `cadence_spm`, `incline_pct`, `heart_rate_bpm`,
`rpe` (6–10), `set_type` (`normal|warmup|dropset|failure`).
### Presets de metric_set (choisis à la création d'un équipement) — enum FERMÉ
`strength` (reps, weight_kg, rpe?, set_type?) · `bodyweight` (reps, added_weight_kg?) ·
`assisted` (reps, assist_weight_kg) · `isometric` (duration_s) · `cardio_row` (duration_s, distance_m,
pace_split_500m, cadence_spm, watts) · `cardio_bike` (duration_s, distance_m, watts, cadence_rpm, heart_rate_bpm?) ·
`cardio_run` (duration_s, distance_m, speed_kmh, incline_pct, heart_rate_bpm?) · `cardio_generic`
(duration_s, distance_m, heart_rate_bpm?). `metrics.ts` mappe preset → liste de champs.
### Modèle
- `Equipment` : ajouter `metricSet: MetricSetKey` (défaut `strength`). Seed cardio existants (tapis/vélo/
  rameur/stepper) migrés vers le bon preset au mapping.
- `ExerciseSet` : les champs deviennent le **sous-ensemble** dicté par le metric_set de l'exercice (stockés
  dans le payload générique). Un exercice porte son `metricSet` (hérité de l'équipement, surchargeable).
  Validation **zod par preset** au niveau écran/repository (bornes de sanité par champ).
### UI
- Saisie de série **adaptée** : `SetInput` rend les `Field` correspondant au metric_set (rameur → durée +
  distance + SPM + watts ; muscu → reps + poids + RPE optionnel). Rendu lecture idem dans `/workout/[id]`.
- Création d'équipement (`/gym-edit`) : sélecteur de **preset metric_set** (SegmentedControl/liste), pas de
  champs libres de type.
### Coach (serveur)
- Outils `add_equipment` / `update_equipment` : ajouter un argument `metricSet` (enum fermé, validé zod).
  `buildRecord`/`buildPatch` le persistent. L'IA choisit le preset, jamais un type de champ arbitraire.
### Tests
`metrics.ts` (preset → champs), validation zod par preset (bornes), mapping migration cardio, coach tool metricSet.

## M19 — Feedback scientifique (heuristiques transparentes)
### Module pur — `app/src/features/stats/coaching.ts`
Fonctions pures testées, sorties = liste de `Reco { level: 'good'|'low'|'high'|'info', message, source }` :
- **Volume d'entraînement** : séries/semaine par groupe musculaire (depuis les séances `done` de la semaine)
  vs seuil **ACSM ≥10 séries/sem/muscle** → « sous ton volume cible » / « ok » / (option MEV/MAV/MRV comme
  réglages ajustables, marqués `rp_heuristic`).
- **Protéines** : cible dérivée du poids × plage **ISSN** (1,4–2,0 g/kg en volume ; 2,3–3,1 g/kg si mode
  déficit) vs apport du jour/semaine → « sous la cible ».
- **Calories** : apport vs objectif (`goals`) → surplus/déficit ; rappel des ordres de grandeur (≈500 kcal/j
  de déficit, `nih`).
- **Poids** : **moyenne mobile hebdomadaire** (pas le poids brut) + variation kg/semaine, langage de tendance.
- **Interdit** : toute projection datée / résultat individuel garanti.
### UI
- Cartes sur le Dashboard + réponses enrichies du coach. Chaque reco affiche sa **source** (badge/texte).
- Réglage « objectif » (prise de muscle / perte de gras / maintien) qui pilote les plages (protéines, kcal).
### Tests
`coaching.ts` : chaque heuristique (seuils, plages, tendance), absence de prédiction, tags `source`.

## M20 — Guidage de séance + coach visuel (3D, POC-gated)
### M20.0 — POC 3D (GATE, à faire en premier de M20)
- Objectif : valider sur **device réel** qu'un avatar low-poly (style Mii/Wii Fit, **modèle sourcé** — non
  produit par nous, ex. modèle libre CC/Quaternius/Mixamo humanoïde) + **1–2 animations** rend correctement
  via `expo-gl` + `three` (loader GLTF), à un poids d'asset raisonnable.
- Critère de succès : rendu fluide (≥30 fps) sur l'appareil de l'utilisateur, taille d'asset acceptable,
  pas de crash lié au conflit `expo-gl`/nouvelle arch.
- **Si succès** → on déroule le 3D (M20.2). **Si échec** → fallback documenté vers animations 2D/vidéo
  (l'abstraction player le permet sans réécriture), et on le signale à l'utilisateur.
### M20.1 — Abstraction « player » + guidage audio (indépendant du 3D)
- `WorkoutPlayer` : déroule les exercices/séries d'une séance, gère la **cadence** (métronome audio via
  `expo-av`, comptes/consignes vocales via `expo-speech`), les temps de repos, le passage à l'exercice
  suivant. Interface `ExerciseVisual` avec implémentations interchangeables (`ThreeDVisual` | `LottieVisual`
  | `ImageVisual`).
- La **cadence visuelle** (compte à rebours, tempo) fonctionne même sans 3D.
### M20.2 — Rendu 3D (si POC OK)
- `ThreeDVisual` : rend l'avatar + l'animation correspondant à l'exercice (mapping exercice → clip
  d'animation ; catalogue limité en v1, extensible). Sélection d'animation par `metricSet`/nom d'exercice.
### Dépendances (M20 uniquement)
`expo-gl`, `three` (+ loader GLTF), `expo-av`, `expo-speech` — versions compatibles Expo 57 à épingler au plan.
### Tests
Player (logique de déroulé/cadence/repos, pur, testable) ; le rendu 3D = validation manuelle/POC.

---

## Modèle d'exécution
Identique au chantier précédent : orchestrateur Opus, implémentation par agents **Sonnet** milestone par
milestone, revue par tâche + revue finale ; portes `code-reviewer` + `security-reviewer` (M18 coach) +
`test-runner` + `gate.mjs` vertes avant merge. Branche `feat/seances-v2`. Ordre : **M16 → M17 → M18 → M19 →
M20 (M20.0 POC en premier)**.

## Risques & garde-fous
- **3D instable (amont)** : dé-risqué par le POC M20.0 avant tout investissement lourd ; abstraction player
  garantit un fallback 2D sans réécriture.
- **Poids des assets 3D** vs offline-first : modèle low-poly unique + peu d'animations en v1 ; mesurer au POC.
- **Sur-promesse scientifique** : bannie par design (pas de prédiction ; sources affichées ; heuristiques
  ajustables séparées des seuils solides).
- **Rétro-compatibilité des données** : nouveaux champs additifs + défauts au mapping ; anciens workouts
  restent lisibles (`status:'done'`, `source:'manual'`).
- **Migration metric_set** : les anciennes séries reps/poids restent valides (preset `strength` par défaut).

## Références (recherche 2026-07-12)
- Métriques : FitNotes exercise types ; Hevy/Strong export fields ; Garmin FIT SDK (`record`: speed,
  cadence, grade, hr) ; Strava `getActivityStreams` ; Concept2 PM5 (split/500m, SPM, watts).
- Science : ACSM Progression Models (≥10 séries/sem/muscle) ; Schoenfeld/Grgic/Krieger 2019 (fréquence sans
  effet à volume égal) ; ISSN 2017 protéines 1,4–2,0 (jusqu'à 2,3–3,1 en déficit) ; Morton 2018 (plateau 1,6
  g/kg) ; NIH/Harvard (~500 kcal/j déficit) ; MacroFactor/RP (moyenne poids hebdo). MEV/MAV/MRV = heuristique RP.
- 3D : `@react-three/native` marqué instable en amont ; conflit versions `expo-gl` ; pas de banque
  d'animations d'exercices (Mixamo générique) → POC obligatoire, fallback 2D/vidéo.
