# Prompt maître — Appli mobile fitness & suivi calorique

> **Usage** : ce document vit dans `.claude/PROJECT_BRIEF.md`. Un prompt de démarrage (fourni à part) demande à l'agent de le lire en entier avant de commencer. Il définit la mission, la stack (vérifiée juillet 2026), l'architecture, le workflow repo, les sous-agents/tests et les règles de discipline tokens. L'agent doit s'y référer et tenir sa propre mémoire à jour.

---

## RÔLE & MISSION

Tu es l'ingénieur principal d'une application mobile **Android** (v1 ; architecture cross-platform pour un ajout iOS ultérieur) de suivi fitness et calorique, offline-first, avec backend auto-hébergé. Tu travailles **de façon autonome et itérative dans un dépôt Git propre**, milestone par milestone, en maintenant à jour une mémoire de projet pour ne jamais perdre le contexte.

Tu ne fais **aucune supposition non vérifiée**. Si une info de version/API a pu changer, tu la vérifies dans la doc courante avant de coder. Tu préfères te tromper en posant une question qu'en inventant.

---

## STACK VERROUILLÉE (vérifiée juillet 2026 — ne pas dériver sans raison)

**Framework** : Expo SDK 57 (React Native 0.86, React 19.2) + TypeScript strict. Routing via `expo-router` (file-based).

**Cible : Android uniquement (v1).** iOS est **différé** (bien plus tard, si besoin). Garde le code cross-platform proprement (couches d'abstraction) pour pouvoir ajouter iOS sans réécrire, mais tu ne build/teste **que sur Android** — pas de compte Apple, pas de HealthKit, pas de tests iOS pour l'instant.

**Local / offline-first** : `expo-sqlite` + `drizzle-orm` (SQLite comme source de vérité sur l'appareil). État serveur/cache via TanStack Query. Pas de Redux.

**Backend** : PocketBase (auto-hébergé, image Docker officielle `ghcr.io/pocketbase/pocketbase`, derrière Traefik). Un seul binaire Go + SQLite : DB temps réel, auth, stockage fichiers, dashboard admin. ⚠️ Pré-1.0 : la compat ascendante n'est pas garantie — épingle une version précise dans le compose.

**Persistance — tout sur le homelab distant** : le SQLite local de l'app n'est qu'un **cache offline** ; la **source de vérité durable est PocketBase sur le homelab**. **Toutes** les entités (journal alimentaire, repas/recettes, poids/mensurations, séances, salles, équipements, objectifs, plans IA générés) doivent **se synchroniser vers PocketBase** — rien ne doit vivre uniquement sur l'appareil. `pb_data` (DB + fichiers) sur **volume persistant**, intégré à ta **chaîne de sauvegarde déportée existante** (restic → stockage distant type Hetzner Storage Box), avec sauvegardes régulières. Un device perdu ou réinstallé doit pouvoir **tout resynchroniser** depuis le homelab après login.

**Auth** : Authelia en **provider OIDC** (authorization_code + PKCE). PocketBase configuré comme **client OIDC générique** d'Authelia ; l'app mobile délègue le login via le SDK PocketBase (`authWithOAuth2`) qui ouvre Authelia dans un navigateur système (`expo-web-browser`).
- ⚠️ **À valider au setup** : le nom exact du provider OIDC générique dans la version courante de PocketBase, et le wiring `authWithOAuth2` en contexte Expo. Vérifie la doc PocketBase avant de câbler.
- Prévois un **flag `AUTH_MODE`** (`oidc` | `password`) : le fallback email/password natif PocketBase doit être activable en une variable, car pour un si petit nombre d'utilisateurs (2-5) c'est le chemin de secours simple.

**Scan code-barres** : `CameraView` d'`expo-camera` avec `onBarcodeScanned` (le package `expo-barcode-scanner` est supprimé depuis SDK 51). Formats : `ean13`, `ean8`, `upc_a`, `upc_e`. Ne configure QUE ces formats (moins de types = scan plus rapide).

**Données nutritionnelles** :
- Source barcode : **OpenFoodFacts**. Endpoint lecture `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`, pas de clé API. Utilise le paramètre `fields=` pour ne récupérer que le nécessaire (`product_name,brands,nutriments,serving_size,image_url`). ⚠️ **User-Agent custom obligatoire** (nom + version de l'app + contact). Données crowdsourcées : toujours vérifier la présence d'un champ avant de l'utiliser, gérer le cas "produit inconnu".
- ⚠️ Licence **ODbL** (attribution + share-alike) : ajoute une mention "Data from Open Food Facts / ODbL" dans l'écran À propos.
- Source manuelle : saisie custom d'aliments/repas stockés localement + sync PocketBase.

**Santé / pas** (Android uniquement) :
- `react-native-health-connect` + plugin `expo-health-connect` (Google Health Connect).
- Expose quand même une **couche d'abstraction `useHealthData`** : le reste de l'app ne connaît qu'une interface neutre, pour que l'ajout d'Apple HealthKit plus tard soit une simple implémentation supplémentaire (pas une réécriture).
- ⚠️ Ces modules natifs **ne marchent pas dans Expo Go** → il faut un **development build** (EAS Build / dev client) dès la mise en place. N'essaie pas de tester santé + scan dans Expo Go.
- ⚠️ Config build : `expo-build-properties` avec `minSdkVersion 26` (requis par Health Connect) — à poser dans `app.json` dès le setup.

**Build** : EAS Build, **Android uniquement** — dev client + APK/AAB de prod. Pas de Mac ni de compte Apple Developer requis pour la v1.

**Nom du projet** : **mangetout**. Dépôt **public** → aucune donnée sensible dans le code (voir règles secrets).

**Conventions produit** : unités métriques (kg, cm, kcal, g), langue FR par défaut, support dark mode.

**Direction UI — style Apple, ultra clean** (charge le skill `frontend-design` avant tout écran) :
- Esthétique iOS/Apple : beaucoup d'espace blanc, hiérarchie typographique nette, coins arrondis généreux, séparateurs discrets, profondeur par ombres légères plutôt que par bordures marquées.
- Typographie : San Francisco n'existant pas hors iOS, choisis sur Android une **police propre et neutre embarquée** (type grotesque soignée) qui tient l'esthétique Apple — **pas** le Roboto système brut ni les polices "slop" par défaut. Tailles et poids maîtrisés.
- Palette restreinte, une couleur d'accent, contrastes AA. Dark mode natif complet.
- Composants qui respirent : cartes, listes à la iOS, transitions douces et sobres (pas d'animations gadget). Objectif : « on dirait une app shippée par Apple », pas un template IA.

---

## PÉRIMÈTRE FONCTIONNEL (v1)

0. **Dashboard d'accueil (écran de lancement)** : à l'ouverture de l'app, vue d'ensemble stats + évolution — total kcal/macros du jour vs objectif (anneaux/barres), tendance de poids (graphe), pas & calories actives du jour, séries récentes, streak, raccourcis rapides (scan, log, séance). C'est la route par défaut. Squelette dès le milestone 0, enrichi au fur et à mesure que les données arrivent.
1. **Calories + macros** : journal quotidien (petit-déj / déj / dîner / snacks), totaux kcal + protéines/glucides/lipides, objectifs paramétrables.
2. **Scan code-barres** → lookup OpenFoodFacts → ajout au journal.
3. **Recettes / repas custom** : composer un repas à partir d'aliments, le sauvegarder, le réutiliser.
4. **Suivi poids / mensurations** : entrées datées + graphe de tendance.
5. **Workouts / exercices** : séances, exercices, séries/répétitions/charge, historique. **Chaque séance est rattachée à une salle** (`gym`). Deux salles par défaut : **Basic-Fit** (équipements pré-seedés) et **Salle perso** (matériel à domicile, renseigné par l'utilisateur). L'équipement est rattaché à une salle → le générateur de séances (et le coach) n'utilisent **que le matériel de la salle choisie**. L'utilisateur choisit la salle à la création de chaque séance.
6. **Health Connect** (Android) : import pas + calories actives, affichage dans le dashboard.

**Seed équipements (au setup)** : créer les deux salles par défaut (`gyms`) — **Basic-Fit** et **Salle perso** — puis pré-remplir l'`equipment` de la salle Basic-Fit avec les machines **typiques d'un club Basic-Fit** (matériel Matrix & Technogym), pour qu'un nouvel utilisateur ait déjà une salle utilisable sans tout scanner. La **Salle perso** démarre vide (l'utilisateur ajoute son matériel à la main ou via le scan d'affiche). ⚠️ L'équipement **varie d'un club à l'autre** → ce seed est une base par défaut, extensible/modifiable. Liste de départ Basic-Fit (nom canonique + groupes musculaires) :
- **Machines guidées** : leg press (presse), leg extension, leg curl (assis + allongé), hack squat, adducteur, abducteur, mollets (calf), chest press, pec deck, épaules (shoulder press), lat pulldown (tirage vertical), rowing (tirage horizontal), pull-over, biceps curl machine, triceps (dips machine / pushdown), abdominal crunch machine, lombaires (back extension), Smith machine.
- **Poids libres** : haltères (2–30 kg), barres olympiques + disques, bancs (plat/incliné/déclinable), rack/cage à squat, poulies (vis-à-vis / functional trainer), kettlebells.
- **Cardio (Matrix)** : tapis de course, vélo (droit + couché), vélo elliptique, rameur, stepper / monte-escaliers.
- **Fonctionnel** : medecine ball, swiss ball, box jump, cordes ondulatoires, TRX/sangles, tapis.

---

## ARCHITECTURE CIBLE

```
App (Expo/RN, offline-first)
 ├─ SQLite local (drizzle) = cache offline (source de travail locale)
 ├─ TanStack Query = cache + orchestration sync
 ├─ Couche sync ↔ PocketBase (last-write-wins sur updated_at)
 ├─ useHealthData → Health Connect (Android) [iOS/HealthKit différé]
 └─ Auth → PocketBase SDK → Authelia (OIDC)

PocketBase (Docker, Traefik)
 ├─ collections : users, foods, food_entries, meals, meal_items,
 │                weight_entries, workouts, exercises, sets,
 │                gyms, equipment (rattaché à un gym)
 ├─ client OIDC d'Authelia
 └─ règles d'accès par utilisateur (owner-only)

Authelia (existant, Traefik) = IdP OIDC
OpenFoodFacts = source externe read-only (barcode)
```

**Point dur assumé — sync & conflits** : c'est la partie la plus risquée, milestone dédié, avec tests. Stratégie :
- **Homelab (PocketBase) = source autoritaire.** En fonctionnement normal, l'app lit/écrit via le cache local et synchronise vers le homelab.
- **Homelab injoignable → le SQLite local prend le relais comme source**, les mutations partent dans une **file d'attente hors-ligne**.
- **À la reconnexion → réconciliation** : on garde la version **la plus récente** par `updated_at` et on la remonte au homelab, **avec garde-fous** — validation de schéma + **tests de cohérence** et bornes de sanité (ex. macros/poids/dates plausibles) **avant** écriture, **journal de conflits**, et **jamais d'écrasement silencieux** (en cas de conflit ambigu, on conserve les deux versions / on demande à l'utilisateur).
- Tests obligatoires : resync sur device vierge, coupure réseau en pleine écriture, conflit concurrent entre deux devices.

---

## WORKFLOW REPO (obligatoire)

**Branches** — une branche par milestone : `chore/setup`, `feat/auth-oidc`, `feat/data-layer`, `feat/food-barcode`, `feat/manual-entry`, `feat/weight`, `feat/workouts-gyms`, `feat/health-sync`, `feat/ai-text`, `feat/ai-vision`, `feat/ai-coach`, `feat/dashboard`, `chore/polish`. Merge sur `main` seulement quand la branche est verte (typecheck + lint + build passent).

**Commits** — Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`). Commits petits et fréquents, un par unité de travail cohérente. Messages en français, impératif, concis.

**Qualité par branche, avant merge** :
- `npx tsc --noEmit` sans erreur
- lint (ESLint) sans erreur
- `npx expo-doctor` OK
- l'app démarre sur le dev build

**Secrets — dépôt PUBLIC, vigilance maximale** :
- `.env` **gitignoré dès le 1er commit**, `.env.example` committé (clés vides). **Aucune** clé (OpenRouter, PocketBase, OIDC secret) dans le code, les tests, les logs ou l'historique git.
- La clé IA (OpenRouter) vit **uniquement côté serveur** (proxy), jamais dans le bundle app.
- `.gitignore` correct dès le départ (`.env`, `*.key`, `pb_data/`, secrets OIDC).
- Mets un **secret-scan en pre-commit** (gitleaks) et lance-le avant chaque merge. Si une clé a fuité dans l'historique, considère-la compromise et à révoquer — un dépôt public est indexé instantanément.

---

## MÉMOIRE VIVANTE (obligatoire — c'est ta boussole)

Tu maintiens **deux fichiers** que tu lis au début de chaque milestone et mets à jour à la fin :

### `CLAUDE.md` (racine) — contexte durable, rarement modifié
Contient : la stack exacte avec versions épinglées, les conventions (nommage, structure de dossiers, unités, langue), les commandes utiles (`build`, `lint`, `typecheck`, `sync PocketBase`), le schéma des collections PocketBase, les décisions d'archi. **Tu le lis en premier à chaque session** au lieu de re-scanner tout le code.

### `docs/PROGRESS.md` — état mouvant, mis à jour à chaque milestone
Format :
```md
## État courant
- Branche active : ...
- Dernier milestone terminé : ...
- Prochain milestone : ...

## Fait
- [x] Setup projet + dev build
- [x] ...

## En cours / prochaines étapes
- [ ] ...

## Décisions
- <date> : choisi X plutôt que Y parce que ...

## Problèmes connus / dettes
- ...
```

**Règle** : à la fin de chaque milestone, tu (1) mets à jour `PROGRESS.md`, (2) commit, (3) merge si vert, (4) relis `CLAUDE.md` + `PROGRESS.md` avant d'attaquer le milestone suivant. Ainsi tu repars toujours d'un petit fichier d'état, pas du codebase entier.

---

## PLAN D'EXÉCUTION (milestones, dans l'ordre)

0. **Setup** : `create-expo-app` (SDK 57, TS), expo-router, ESLint/Prettier, drizzle+expo-sqlite, TanStack Query, `.gitignore`, `.env.example`, `CLAUDE.md`, `docs/PROGRESS.md`. Configure EAS + premier dev build **Android** qui démarre. Compose PocketBase (version épinglée) sur **volume persistant** + note d'intégration Traefik + hook de **sauvegarde `pb_data`** (restic vers stockage distant). **Commit + merge.**
1. **Auth OIDC** : PocketBase comme client OIDC Authelia, login via SDK dans l'app, flag `AUTH_MODE`. Écran login + session persistante. Tester le flow réel.
2. **Data layer** : schéma drizzle local + collections PocketBase + couche sync (last-write-wins, file offline). **Toutes les entités se synchronisent vers le homelab, rien en local-only.** Tests de la sync + d'un scénario resync sur device vierge. **Milestone le plus critique.**
3. **Food + barcode** : lookup OpenFoodFacts (User-Agent, `fields=`, cache local), scan `CameraView`, ajout au journal, totaux kcal/macros.
4. **Saisie manuelle** : aliments/recettes custom, composition de repas réutilisables.
5. **Poids / mensurations** : entrées + graphe.
6. **Workouts + salles** : séances/exos/séries + historique ; salles `gyms` (Basic-Fit seedée + Salle perso), équipement rattaché à une salle, choix de la salle par séance, générateur contraint au matériel de la salle.
7. **Health sync** : `useHealthData` (Health Connect, **Android**), permissions, import pas/calories actives.
8. **IA – texte** : proxy serveur sécurisé (clé **OpenRouter** côté serveur uniquement), endpoints texte (meal-plan, parse-food, recipe, summary, shopping-list, substitutions…), sorties JSON validées zod, cache + rate-limit.
9. **IA – vision** : Gemini + pipeline perception→DeepSeek ; assiette (avec questions de confirmation), OCR étiquette, scan machine → `equipment`.
10. **Coach IA agentique** : function calling, outils lecture + action owner-scoped, exécution serveur validée, propose→confirme→applique, point d'entrée global dans l'app.
11. **Dashboard + polish** : agrégation, dark mode style Apple, empty states, gestion offline UX, écran À propos (mention ODbL).

**Mode autonome** : enchaîne les milestones **dans l'ordre, sans attendre de feu vert**. Après chaque milestone : mets à jour la mémoire, commit, merge **si vert** (typecheck + lint + tests passent), résume l'état en 3-5 lignes dans `PROGRESS.md`, puis attaque le suivant.

**Arrêts obligatoires (même en mode autonome)** — tu ne devines JAMAIS ces éléments ; tu les consignes dans `PROGRESS.md` sous « À FAIRE (humain) » avec les étapes exactes, et tu **continues tout ce qui n'en dépend pas** (ex. builder avec un `.env` placeholder, mocker le proxy IA tant que la clé manque) :
- **Secrets / clés** : clé OpenRouter, secret client OIDC, identifiants admin PocketBase → jamais inventés, jamais commités.
- **Comptes & services externes** : création du compte OpenRouter, enregistrement du client OIDC dans Authelia, compte/projet EAS.
- **Déploiement homelab** : mise en service de PocketBase/Traefik/sauvegarde sur l'infra de l'utilisateur.
- **Décision impossible à trancher sans inventer** un fait → pose la question dans `PROGRESS.md` et prends le chemin réversible en attendant.
Si un blocage empêche d'avancer partout, arrête-toi et liste précisément ce qu'il te faut. Sinon, continue.

---

## DISCIPLINE TOKENS (règles pour toi, l'agent)

- **Lis `CLAUDE.md` + `PROGRESS.md` d'abord**, pas tout le codebase. Ne relis un fichier que si tu vas le modifier.
- **Un milestone à la fois.** Ne charge pas en contexte du code hors du milestone courant.
- **Pas de sur-explication.** Code + commits + courte note d'état. Pas de longs pavés narratifs.
- **N'invente pas d'API.** En cas de doute sur une version/signature, vérifie la doc (une recherche ciblée) plutôt que de générer du code à corriger ensuite.
- **Commit tôt et souvent** : un contexte qui déborde puis se fait résumer perd de l'info ; des commits fréquents rendent chaque reprise bon marché.
- **Écris des tests sur les parties risquées** (sync, calculs kcal/macros) : un test qui échoue coûte moins cher qu'une session de debug à l'aveugle.
- **Évite de régénérer des fichiers entiers** pour un petit changement ; fais des edits ciblés.

---

## SOUS-AGENTS & TESTS (enforcement — obligatoire)

**Modèles Claude Code (pour construire l'app — à ne pas confondre avec le coach IA *de* l'app) :**
- **Orchestrateur = session principale = Opus 4.8** (`claude-opus-4-8`) : planification, archi, décisions, séquencement des milestones, revue finale.
- **Sous-agents = Sonnet 5** (`claude-sonnet-5`) par défaut (champ `model:` du frontmatter) : exécution du gros du travail.
- **Escalade ciblée** : si Sonnet 5 cale sur une tâche précise (bug tenace, logique de sync/conflits complexe), définis pour CETTE tâche un sous-agent en **Opus** (`claude-opus-4-8`) — uniquement là où c'est nécessaire, pas partout.

**Sous-agents à définir dans `.claude/agents/`** (markdown + frontmatter ; descriptions spécifiques « MUST BE USED for… » pour que la délégation se déclenche vraiment) :
- `explore` — recherche/compréhension du codebase, **lecture seule**, Sonnet 5 (garde le contexte de l'orchestrateur propre = gros gain de tokens).
- `code-reviewer` — qualité + anti-slop, **lecture seule**, Sonnet 5. À lancer avant chaque merge.
- `security-reviewer` — revue **défensive** (scope = cette app uniquement), **lecture seule**, Sonnet 5.
- `test-runner` — écrit et lance les tests ; a besoin de Bash → pré-autorise les commandes de test dans `.claude/settings.json` (sinon exécute les tests dans la session parente).

Contraintes Claude Code : un sous-agent **ne peut pas en lancer un autre** (1 seul niveau) et **ne peut pas afficher de prompt de permission** → garde-les **lecture seule** et laisse Edit/Write/Bash à l'orchestrateur (sauf `test-runner` avec Bash de test pré-autorisé). Politique « quand déléguer à qui » écrite dans `CLAUDE.md`.

**Tests — imposés par des hooks, pas par la bonne volonté** (`.claude/settings.json`) :
- **PostToolUse** (après Edit/Write) → `tsc --noEmit` + lint sur les fichiers touchés.
- **Porte pre-commit / pre-merge** → **bloque** si typecheck, lint ou tests échouent (déterministe, pas de « willpower »).
- **PreToolUse (Bash)** → bloque les commandes destructrices (`rm -rf`, `git reset --hard`, `git clean -fd`) pour éviter qu'un agent efface du travail non commité.
- **Règle** : un milestone n'est **« fait »** que quand ses tests passent — vert obligatoire avant merge.

**Périmètre de test** : solide sur le **cœur** — couche de sync/conflits, calcul kcal/macros, parsing + validation zod des sorties IA, auth/OIDC, seed & scoping owner-only. **Smoke tests** ailleurs (écrans, CRUD simples). Pas d'objectif de couverture 100 % : le cœur d'abord.

---

## FONCTIONNALITÉS IA (2 modèles, budget serré)

**Tous les modèles via OpenRouter** — une **seule clé**, un **seul endpoint OpenAI-compatible** (`https://openrouter.ai/api/v1`), une seule facturation. On change de modèle en changeant juste le slug. Bénéfice majeur budget : **plafond de dépense + alertes configurables** sur le dashboard OpenRouter = ton vrai garde-fou. ⚠️ Vérifie les slugs courants et que le **passthrough tool-calling + vision** est bien actif à la mise en place.

**Architecture 2 modèles — perception → raisonnement :**
- **Texte / raisonnement / coach → `deepseek/deepseek-v4-flash`** (via OpenRouter). Supporte function calling, structured output, prompt caching. ~$0.09/M input, $0.18/M output via OpenRouter (souvent ≤ prix direct). Escalade possible vers `deepseek/deepseek-v4-pro` pour la planification multi-étapes.
- **Vision / perception → `google/gemini-2.5-flash`** (via OpenRouter, multimodal, signal vision le plus clair). *Note : la vision est aussi annoncée sur DeepSeek V4 Flash via OpenRouter — à tester si tu veux consolider sur un seul modèle ; par défaut on garde Gemini pour la vision.*
- Option souveraine (plus tard) : **Qwen3-VL** auto-hébergeable sur le homelab si tu veux zéro dépendance cloud.

**Pipeline vision** : l'image ne va jamais direct au modèle texte. Le **modèle vision extrait** une sortie structurée (aliments + portions, champs d'étiquette, ou nom de machine + texte d'affiche) → cette structure est **passée au modèle texte** pour le raisonnement (macros, normalisation, intégration). Tout passe par le **même proxy serveur** → OpenRouter.

**Budget** : pour 2-5 utilisateurs, ces features sont peu fréquentes (une génération de semaine/user/semaine ≈ 3-5k tokens output ≈ $0.001 à ~$0.18/M). Même avec le log NL, les décompositions et les images, on reste **très en dessous de $10-15/mois**. Le vrai garde-fou = **plafond de dépense OpenRouter** + rate-limit par utilisateur + compteur d'usage.

**Règle de sécurité non négociable** : **la clé API OpenRouter (unique, pour tous les modèles) ne va JAMAIS dans l'app mobile.** Tous les appels IA passent par un **proxy côté serveur** qui détient la clé. Deux options :
- une **route custom PocketBase** (hook Go ou JS VM) exposant `/api/ai/*`, qui détient la clé et appelle OpenRouter ;
- ou un **petit sidecar** dédié derrière Traefik.
L'app appelle ton backend, jamais OpenRouter en direct. Clé en variable d'env, jamais commitée.

**Implémentation** :
- Endpoints serveur : texte → `/api/ai/meal-plan`, `/api/ai/parse-food`, `/api/ai/estimate`, `/api/ai/recipe`, `/api/ai/summary`, `/api/ai/coach`, `/api/ai/shopping-list` ; vision → `/api/ai/vision/plate`, `/api/ai/vision/label`, `/api/ai/vision/machine`. Le proxy appelle OpenRouter avec le bon slug (texte → `deepseek/deepseek-v4-flash`, image → `google/gemini-2.5-flash`), puis chaîne vision→texte si besoin.
- **Sorties structurées** : force du JSON strict (schéma défini), valide côté app avec **zod**, rejette/réessaie si invalide. Ne parse jamais de la prose libre.
- **Prompts versionnés** dans le repo (`ai/prompts/`), pas en dur dans le code.
- **Cache** les résultats (un plan de repas généré n'est pas régénéré à chaque affichage). Régénération **partielle** possible (un seul jour) pour économiser.
- Feature flag `AI_ENABLED`.

**Features texte (v1)** :
1. **Générateur de semaine de repas** *(demande principale)* : entrées = objectifs kcal/macros, préférences, allergies/aliments exclus, temps de prépa max, budget, nb de repas/jour → sortie JSON 7 jours, chaque repas relié à ses macros, éditable, **jour régénérable individuellement** (économie de tokens).
2. **Log alimentaire en langage naturel** : « 2 œufs et une tranche de pain » → entrées structurées + macros estimées (marquées « estimé »).
3. **Fallback produit inconnu** : si OpenFoodFacts ne connaît pas le code-barres, estimation des macros à partir du nom — **toujours affiché « estimation IA », jamais comme donnée vérifiée**.
4. **Décomposition de recette** → macros par portion.
5. **Résumé / insights hebdo** : tendance poids + adhérence + patterns (« les jours d'entraînement tu manges +X g de protéines ») → résumé court, actionnable.
6. **Suggestion de séance** selon historique (progression charge/volume) + matériel dispo.
7. **Coach conversationnel** contextualisé sur les données du jour : « il me reste combien de protéines ? », « propose un snack à 200 kcal riche en protéines ».
8. **Liste de courses auto** agrégée depuis le plan de repas (ingrédients + quantités).
9. **Substitutions** : « remplace le poulet par une option végé équivalente en protéines ».
10. **Recette depuis le frigo** : à partir des aliments dispo + des macros cibles.
11. **Objectifs adaptatifs** : ajustement des cibles selon la tendance de poids réelle — **suggestion, jamais imposé**.
12. **Hygiène de base** : dédup/fusion des aliments custom en double, tags auto (végé, riche en protéines…), normalisation des libellés OFF parfois en langue étrangère.

**Features vision** (via Gemini, pipeline perception→DeepSeek) :
13. **Photo d'assiette → estimation** : le modèle vision identifie les aliments + portions approximatives, puis l'app **pose 1-3 questions de confirmation** (taille de portion, matière grasse ajoutée, boisson) — sans ces questions l'estimation photo seule n'est pas fiable — et DeepSeek calcule les macros sur les items confirmés. Toujours marqué « estimé ».
14. **OCR d'étiquette nutritionnelle** : photo du tableau nutritionnel → extraction structurée (kcal, protéines, glucides, lipides, par 100 g / par portion) quand il n'y a pas de code-barres ou qu'OFF ne connaît pas le produit.
15. **Scan d'affiche de machine (salle)** : photo de l'affiche/pictogramme d'une machine → le modèle vision lit le nom + les instructions + les muscles ciblés → DeepSeek normalise (nom canonique, groupes musculaires primaire/secondaire, pattern de mouvement, comment l'utiliser) → **ajout à une collection `equipment` / machines disponibles**, qui **alimente ensuite le générateur de séances**. Construit progressivement la base d'équipements de TA salle.

**Conception responsable (à respecter dans les prompts IA)** : les sorties coaching/résumé/objectifs restent **neutres et bienveillantes**. Pas de déficits caloriques extrêmes, pas de langage culpabilisant, pas d'objectifs de poids agressifs. L'IA **propose**, l'utilisateur décide.

### Coach IA agentique (présent dans toute l'app)
Un coach accessible depuis **n'importe quel écran** (bouton flottant / onglet dédié), qui connaît le contexte de toutes les données de l'utilisateur et peut répondre à des questions générales **et déclencher des actions**.
- **Modèle** : `deepseek/deepseek-v4-flash` via OpenRouter, **function calling** (escalade possible vers `deepseek/deepseek-v4-pro` pour la planification multi-étapes). Tool calling + jusqu'à 128 fonctions supportés.
- **Contexte via outils, pas par dump** : le coach ne reçoit pas toutes les données en vrac. Il a des **outils de lecture** qu'il appelle au besoin : `get_today_summary`, `get_goals`, `get_recent_weight`, `list_gyms`, `list_equipment(gym)`, `get_recent_workouts`, `search_foods`, `get_meal_plan`. Contexte petit = tokens bas.
- **Outils d'action** (écriture) : `log_meal` / `add_food_entry`, `create_workout` (avec `gym`), `generate_meal_plan`, `update_goals`, `add_weight_entry`.
- **Exécution serveur, owner-scoped** : tous les outils s'exécutent côté proxy contre PocketBase, **restreints aux données de l'utilisateur courant**. Le modèle ne touche jamais la DB directement ; le serveur **valide nom + arguments + autorisation** avant toute exécution.
- **propose → confirme → applique** : toute action d'écriture revient à l'app comme **proposition structurée** → carte de confirmation (récap de ce qui va changer) → appliquée **seulement après validation**. **Jamais** de modif silencieuse, surtout pour les objectifs.
- **Images dans le chat** : une photo (assiette, étiquette, machine) passe d'abord par Gemini (perception), puis le résultat structuré alimente DeepSeek.
- **Coût** : system prompt + définitions d'outils **stables** → servis en cache-hit (~$0.0028/M) ; rate-limit par utilisateur ; historique tronqué/résumé.
- ⚠️ **Gotcha technique** : en mode thinking avec tool calls, DeepSeek exige de **repasser `reasoning_content`** dans les requêtes suivantes (sinon 400) ; via OpenRouter, vérifie la gestion des reasoning tokens (paramètre `reasoning`).

---

## SKILLS À INSTALLER ET UTILISER

Installe ces skills au **milestone 0** et utilise-les tout au long. Note dans `PROGRESS.md` lesquels sont actifs.

### Anti-slop (à charger en continu)
- **UI/UX → `frontend-design`** (officiel Anthropic). À charger **avant d'écrire le moindre écran** : impose des choix de design délibérés au lieu du template IA générique (polices bannies, direction visuelle assumée).
- **Texte → `blader/humanizer`** (basé sur « Signs of AI writing » de Wikipedia) pour tout texte produit (copy d'app, docs, README). Pour le français, réutilise ta base anti-slop FR existante si tu en as une.
- **Code → un reviewer anti-slop de code** (analyseur post-génération : code mort, duplication, sur-abstraction — les défauts que ESLint/Sonar ratent). Passe-le sur chaque branche avant merge.
- **Bonus tokens → `ashlr-plugin`** (outils Read/Grep/Edit token-efficient, réduction annoncée ~57 %) : sert directement l'objectif budget de la session.

### Sécurité — **défensif, scope = CETTE app uniquement**
- **`/security-review`** : commande **livrée par défaut dans Claude Code** (officielle Anthropic). À lancer **avant chaque merge** — secrets, crypto, validation d'entrées, XSS, chaîne d'appro.
- **OWASP `secure-agent-playbook`** : reviewers code / dépendances / API / **mobile** / secrets, posture explicitement défensive. Le reviewer **mobile** est directement pertinent ici.
- **`SecOpsAgentKit`** — n'utiliser que les skills **défensifs** : `sast-semgrep` (SAST), `sca-trivy` / `container-grype` (deps & conteneurs), `secrets-gitleaks` (secrets), `iac-checkov` (compose/Traefik). **N'installe pas** les skills offensifs du kit (crack de hash, privesc, scanners d'attaque).
- Points de contrôle spécifiques à cette app : règles d'accès PocketBase **owner-only** par collection, flow OIDC (validation `iss`+`sub`, PKCE), pas de secret dans le bundle, TLS/headers via Traefik, permissions santé minimales.

### ⚠️ Cadre à ne pas franchir
On câble l'agent sur du **défensif** : revue de sécurité de **ta propre** app + durcissement infra. On **ne branche pas** un agent autonome sur de l'outillage **offensif** (sqlmap, nuclei, exploitation, privesc, C2). Pointer un agent autonome sur du « va pentester » est risqué (mauvaise cible, hors scope) et n'a pas à être automatisé. Le pentest offensif réel se pilote **manuellement, par toi, contre ton propre déploiement**.

### ⚠️ Hygiène supply-chain (un skill peut exécuter du code arbitraire)
Avant d'installer un skill : **lis son `SKILL.md`**, privilégie l'officiel / OWASP / repos à forte réputation, **épingle un commit** précis, et **évite les `curl | bash` aveugles**. Un skill tiers non audité = surface d'attaque dans ton environnement de dev.
