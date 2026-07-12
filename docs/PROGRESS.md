# PROGRESS — mangetout

## État courant
- Branche active : `feat/seances-v2` (M16→M20), M16→M19 + player prêts à merger (gate --merge vert, revue finale Opus « PRÊT À MERGER » après fix cardio).
- Dernier milestone terminé : **19 — Feedback scientifique** ; **M20 partiel** (logique pure du player). Le reste de M20 (POC 3D + audio) attend un build device.
- Précédemment mergés : M12 salles CRUD, M13 salles IA, M14 markdown coach, M15 thème+refonte.
- Prochain : merge M16→M19+player, puis POC 3D sur device ; déploiement homelab (voir « À FAIRE humain »).
- Total tests : **app 174 · serveur 46** (tsc + lint verts ; gate.mjs --merge vert).

## Fait
- [x] Cadrage : `.gitignore`, `.env.example`, `CLAUDE.md`, `docs/PROGRESS.md`, sous-agents, hooks (validés : destructif bloqué, secret-scan attrape une clé plantée, gate vert)
- [x] M0 app (`app/`) : Expo 57.0.4, expo-router (tabs Accueil/Journal/Séances/Coach/Réglages), thème Apple (tokens light/dark, Inter embarquée, Text/Screen/Card/ProgressBar), TanStack Query, drizzle+expo-sqlite installés, dashboard squelette. **tsc ✓ · eslint ✓ · jest ✓ · expo-doctor 20/20 ✓**
- [x] M0 infra (`infra/`) : Dockerfile PocketBase 0.39.5 (binaire officiel, multi-arch), docker-compose (PocketBase + ai-proxy derrière Traefik, en-têtes sécurité), `restic-backup.sh` (copie à froid pb_data + rétention + check), README déploiement.
- [x] M0 server (`server/`) : squelette proxy IA zéro-dépendance (health + /api/ai/* → 503), Dockerfile. Rempli au M8.
- [x] EAS (`app/eas.json`) : profils development (dev client APK) / preview (APK) / production (AAB), Android only.
- [x] M1 auth : client PocketBase + `AsyncAuthStore` sur **expo-secure-store fragmenté** (payload > 2 Ko), `signInWithOidc` (`authWithOAuth2` + `expo-web-browser`, provider via `AUTH_MODE`/`OIDC_PROVIDER`), fallback `signInWithPassword`, `AuthProvider`/`useAuth`, garde de route (redirection login), écran login Apple + déconnexion dans Réglages. Tests : fragmentation secure-store (round-trip/shrink/clear) + mapping/erreurs auth (12 verts).

- [x] M2 data layer + sync : cache SQLite générique (drizzle `sync_records`/`sync_queue`/`conflicts`/`sync_cursors`), moteur de sync pur & testé (`reconcile` LWW, `sanity` zod+bornes, `OfflineQueue` coalescée, `SyncEngine` pull+push avec journal — **jamais d'écrasement silencieux**), `SyncManager` (persistance file+curseurs), adaptateurs local (drizzle) et remote (PocketBase). Migration PB : 12 collections owner-only + méta de sync. **41 tests** (resync device vierge, hors-ligne, coupure réseau en écriture, conflit concurrent, conflit à horodatage égal, garde-fous sanité).

- [x] M3 food + barcode : client OpenFoodFacts (`openFoodFacts.ts` — User-Agent custom, `fields=`, conversion kJ→kcal, gestion inconnu/incomplet, zod), calcul nutrition pur (`nutrition.ts` — macros au prorata, sommes, Atwater), scan `CameraView` (formats ean13/ean8/upc_a/upc_e), écran journal (repas + totaux + suppression), repository + hooks React Query. **57 tests** (nutrition + mapping/lookup OFF).

- [x] M4 saisie manuelle + recettes : calcul recette pur (`recipes.ts` — macros repas, par portion, poids), aliment manuel + écran `/add-food`, repas réutilisables (`/meals` + composeur `/meal-new`), `MealPicker`/`Field` réutilisables, hooks React Query (foods/meals/saveMeal/addMealToJournal). **61 tests**.

- [x] M5 poids : logique pure (`weight.ts` — tri, stats delta/min/max, géométrie de courbe SVG), `WeightChart` (react-native-svg), écran `/weight` (pesée + historique + tendance), carte dashboard live & cliquable. Singleton `getSyncManager` partagé (une seule file). **67 tests**.

- [x] M6 workouts + salles : catalogue équipement Basic-Fit + seed 2 salles (idempotent), générateur pur contraint au matériel de la salle (greedy couverture, déterministe), repository CRUD (workouts/exercises/sets), onglet Séances (seed + historique) + écran `/workout-new` (choix salle, groupes ciblés, génération/ajout manuel, séries). **72 tests** (générateur).

- [x] M7 health sync : couche NEUTRE `HealthProvider` (extensible HealthKit sans réécriture), provider Health Connect (Android, `getSdkStatus`/`initialize`/`requestPermission`/`aggregateRecord` pas + calories actives), nullProvider (autres OS), sélection par OS, hook `useHealthData`, carte Activité du dashboard live + « Connecter Health Connect ». **75 tests** (sélection provider + null).

- [x] M8 IA texte : proxy Hono (`server/`) — clé OpenRouter **server-only**, garde flag+auth PB+rate-limit, endpoints parse-food/estimate/recipe/meal-plan(+day)/summary/shopping-list/substitutions, sorties **JSON validées zod** (retry sur invalide), cache TTL, prompts versionnés (conception responsable). Client app `aiPost` (jamais OpenRouter en direct) + log NL `/ai-log`. Serveur lancé via **tsx** (pas d'étape build). **16 tests serveur** (rate-limit, cache, extractJson/chatJSON, schémas) + 75 app.

- [x] M9 IA vision : `chatVisionJSON` (image → modèle vision, jamais au texte direct), endpoints `/vision/plate` (items + questions de confirmation), `/vision/label` (OCR étiquette), `/vision/machine` (pipeline perception→DeepSeek→fiche equipment). App : `captureImage` (expo-image-picker), hooks vision, câblage **étiquette→saisie manuelle** (préremplissage) et **machine→equipment** (dans /workout-new). **20 tests serveur**.

- [x] M10 coach agentique : registre d'outils (lecture + action) avec args zod, `runCoach` (boucle tool-calling bornée, reasoning passthrough), lecture owner-scoped, **action = proposition** ; `applyAction` exécute après validation avec `user` = utilisateur vérifié (jamais celui du modèle). Écran Coach (chat + carte de confirmation → apply). **28 tests serveur** (validation, owner-scoping, proposition≠exécution).

- [x] M11 dashboard + polish : dashboard agrégé (kcal/macros du jour vs objectifs avec barres, tendance poids, activité, **streak** calculé), objectifs éditables (Réglages), **synchronisation** auto (montage + retour premier plan) + bouton manuel + statut hors-ligne, écran **À propos** (mention **ODbL** Open Food Facts + note confidentialité IA). **79 tests app** (streak ajouté).

- [x] M12 salles CRUD manuel : repository `addGym/updateGym/deleteGym/updateEquipment/removeEquipment` (soft-delete + cascade équipement), hooks React Query, écran liste `/gyms` + éditeur `/gym-edit` (nom, type, équipement, suppression), points d'entrée Séances + Réglages. Tests repository (5) + cascade.
- [x] M13 salles IA : outils coach action `add_gym/update_gym/delete_gym/add_equipment/remove_equipment`, `applyAction` route **create/update/delete** owner-scoped (`user` = utilisateur vérifié, PATCH sans `user`), ids validés `^[a-z0-9]{15}$` (**anti-injection de filtre PB**, revue sécurité), cascade delete_gym serveur, `proposalSummary` étendu, app déclenche `syncAll()` après apply. Tests serveur (owner-scoping, routage, anti-injection).
- [x] M14 markdown coach : parseur pur `parseMarkdown` (gras/italique/code/listes/titres, robuste aux marqueurs non fermés, 7 tests) + composant `<Markdown>` (kit Text du thème) câblé dans les bulles assistant.
- [x] M15a thème : `ThemeProvider` mode `système|clair|sombre` persisté (expo-secure-store), sélecteur d'apparence dans Réglages. Tests `themeMode` (5).
- [x] M15b refonte visuelle : primitives partagés (`SegmentedControl/Badge/IconButton/ListRow/EmptyState` + helper `withAlpha`), refonte tokens (fonds chauds, ombres douces, variante `danger`+`onDanger` AA en dark, états pressés/focus), polish écrans salles (ListRow/Badge/IconButton).

- [x] M16 clavier coach : `KeyboardAvoidingView` + auto-scroll (bulles plus masquées).
- [x] M17 séances utilisables : modèle `status`/`source`/`at` (rétro-compat), CRUD+duplication repository, écran détail `/workout/[id]` (voir/éditer/statut/dupliquer/supprimer), liste sections À venir/Historique, création date/heure/statut/provenance.
- [x] M18 métriques flexibles : catalogue de champs fermé + presets (`metrics.ts` — strength/bodyweight/assisted/isometric/cardio_row/bike/run/generic), `metricSet` sur équipement + seed cardio, **séries typées** (`fields`), garde-fou `sanity.ts` rétabli (setSchema, optionnalité par preset — cardio partiel valide), outils coach `metricSet` + `update_equipment`.
- [x] M19 feedback scientifique : `coaching.ts` heuristiques **sourcées** (ACSM volume, ISSN protéines, NIH calories, tendance poids) — **jamais de prédiction** ; cartes dashboard + mode objectif (sur `goals`).
- [~] M20 coach visuel : logique pure du player (`player.ts`) faite ; **POC 3D + audio (expo-gl/three/expo-av/expo-speech) à faire sur device** (les deps ne sont pas encore installées).

## Milestones (0→11)
- [x] 0 Setup + PocketBase compose
- [x] 1 Auth OIDC
- [x] 2 Data layer + sync (CRITIQUE)
- [x] 3 Food + barcode (OpenFoodFacts)
- [x] 4 Saisie manuelle + recettes
- [x] 5 Poids / mensurations + graphe
- [x] 6 Workouts + salles
- [x] 7 Health sync (Health Connect)
- [x] 8 IA texte (proxy OpenRouter)
- [x] 9 IA vision (Gemini→DeepSeek)
- [x] 10 Coach IA agentique
- [x] 11 Dashboard + polish
- [x] 12 Salles CRUD manuel
- [x] 13 Salles IA (outils coach)
- [x] 14 Markdown coach
- [x] 15 Thème sélectionnable + refonte visuelle
- [ ] 3 Food + barcode (OpenFoodFacts)
- [ ] 4 Saisie manuelle + recettes
- [ ] 5 Poids / mensurations
- [ ] 6 Workouts + salles
- [ ] 7 Health sync
- [ ] 8 IA texte (proxy OpenRouter)
- [ ] 9 IA vision
- [ ] 10 Coach IA agentique
- [ ] 11 Dashboard + polish

## Décisions
- 2026-07-12 : chantier **M16→M20** (séances v2). Recherche web sourcée (métriques Garmin/Strava/Concept2 ; science ACSM/ISSN/NIH ; 3D). **Modèle de métriques** : catalogue de champs FERMÉ + presets, optionnalité **par preset** (cardio partiel valide). **Feedback = heuristiques sourcées, jamais de prédiction individuelle** (sur-promesse écartée). **Revue finale** : bug Important attrapé (séries cardio/vides droppées silencieusement au push car sanity trop stricte) → corrigé (optionnalité par preset + `SetInput` n'écrit plus `0` sur champ vidé). **3D** : POC-first obligatoire (stack `@react-three/native` instable en amont) ; deps 3D/audio autorisées pour M20 seulement, à installer/valider sur device. Dette différée : validation écran + dead-letter si une série échoue quand même la sanité ; câblage `weightTrend` au dashboard ; dedup constantes de statut. Spec `docs/superpowers/specs/2026-07-12-seances-*-design.md`, plan `docs/superpowers/plans/2026-07-12-seances-v2.md`.
- 2026-07-12 : chantier **M12→M15** (salles CRUD + salles IA + markdown coach + thème/refonte) mené en **subagent-driven** (Opus orchestre, agents Sonnet implémentent milestone par milestone, revue par tâche + revue finale Opus). Spec `docs/superpowers/specs/2026-07-12-*-design.md`, plan `docs/superpowers/plans/2026-07-12-*.md`. **Revue sécurité M13** : validation stricte du format d'`id` d'outil (`^[a-z0-9]{15}$`) fermant une injection de filtre PocketBase sur la cascade `delete_gym` (owner-scoping intact, pas d'escalade inter-user). **Revue finale** : bouton danger rebasculé sur la variante `danger` (contraste AA en dark). Dettes suivies (LOW) : cascade delete_gym IA silencieuse si listing échoue ; libellés a11y partiels ; `proposalSummary` salles générique.
- 2026-07-07 : monorepo `app/` + `server/` + `infra/` (sépare bundle app / secrets serveur / infra). Proxy IA = sidecar Node dédié (testable, isole la clé) plutôt que hook Go PocketBase.
- 2026-07-07 : versions vérifiées npm — Expo 57.0.4, RN 0.86.0, React 19.2.3, drizzle 0.45.2, zod 4, pocketbase-sdk 0.27.
- 2026-07-07 : **PocketBase = 0.39.5**, construit depuis le binaire officiel GitHub (multi-arch). L'image `ghcr.io/pocketbase/pocketbase` du brief **n'existe pas** (vérifié) → Dockerfile maison.
- 2026-07-07 : enforcement par hooks Node (portables Windows) ; secret-scan intégré (gitleaks en complément, voir À FAIRE).
- 2026-07-07 : **revue M10** (coach, sécurité) → verdict ROBUSTE (owner-scoping étanche : `user` toujours = utilisateur vérifié + backstop règle PB ; propose→confirme→applique respecté ; lecture ignore les args du modèle). Corrigés (LOW) : validation du format date (`add_weight_entry`), bornage de l'historique coach (30 msgs / 20k car.). Reportés (LOW/INFO, acceptables pour 2-5 users) : nonce serveur liant `apply` à une proposition (voir « À FAIRE »), qualité des définitions d'outils exposées au modèle.
- 2026-07-07 : **revue M2** (sync + règles PB, adversariale) → corrigés : curseur `>=` inclusif (écritures au même ms plus perdues), curseur ne dépasse pas un record rejeté par sanité (re-tirable), dead-letter journalisé (aucune écriture offline perdue), coercion `clientUpdatedAt` non écrasée par la valeur brute PB (LWW correct), `stableStringify` récursif (plus de faux conflit sur objets imbriqués), where composite PK dans manager, règles PB parent-ownership (equipment/meal_items/food_entries/workouts/exercises/sets) + durcissement `users`. 44 tests.
- 2026-07-07 : **revue M1** (code-reviewer + security-reviewer avant merge) → corrigés : session expirée traitée comme connectée (`isAuthenticated` dérivé de `pb.authStore.isValid`), annulation OIDC bloquant l'UI (race sur `openAuthSessionAsync` cancel/dismiss), flash de contenu protégé (rendu gaté sur `ready`), fragmentation secure-store en OCTETS UTF-8 (pas UTF-16), balayage défensif au logout, validation de `AUTH_MODE`. Sous-agents custom `.claude/agents/` non résolus comme `subagent_type` en session → revues lancées via `general-purpose` avec brief embarqué.
- 2026-07-07 : **contournements de versions** (pièges vérifiés) — (a) `app/.npmrc` `legacy-peer-deps=true` (arbre de peers Expo strict) ; (b) **eslint épinglé à 9.x** (eslint 10 casse `eslint-plugin-react` : `getFilename is not a function`) ; (c) **jest épinglé à 29** (jest-expo 57 est sur les internals jest 29 ; jest 30 → `clearMocksOnScope is not a function`) ; (d) deps ajoutées explicitement : `babel-preset-expo`, `@react-native/jest-preset@0.86.0` ; (e) tests importent les globals depuis `@jest/globals` (tsc strict sans `types` élargi) ; (f) `newArchEnabled` retiré d'`app.json` (nouvelle arch = défaut SDK 57).

## À FAIRE (humain) — arrêts obligatoires
> Ces éléments ne peuvent pas être devinés/inventés. Le code avance avec des placeholders/mocks en attendant.

### Secrets & clés (jamais committés)
- [ ] **Clé OpenRouter** : créer un compte OpenRouter, générer une clé, la mettre dans `server/.env` → `OPENROUTER_API_KEY`. Configurer un **plafond de dépense + alertes** sur le dashboard OpenRouter. Vérifier que le tool-calling + vision sont actifs sur les slugs choisis.
- [ ] **Secret client OIDC** : enregistrer le client `mangetout` dans Authelia (authorization_code + PKCE), récupérer `OIDC_CLIENT_SECRET`, renseigner `OIDC_ISSUER_URL`. Valider le **nom exact du provider OIDC générique** dans PocketBase 0.30.0.
- [ ] **Admin PocketBase** : au 1er lancement, créer l'admin (`PB_ADMIN_EMAIL`/`PB_ADMIN_PASSWORD`) — hors dépôt.
- [ ] **Token de service PocketBase** pour les actions coach owner-scoped (`PB_SERVICE_TOKEN`).
- [ ] **restic** : `RESTIC_REPOSITORY` + `RESTIC_PASSWORD` (Hetzner Storage Box existante).

### Comptes & services externes
- [ ] Compte/projet **EAS** (Expo) pour le dev build + APK/AAB Android.
- [ ] **Health Connect** : modules natifs (`react-native-health-connect`) → nécessitent un **development build** (pas Expo Go). Installer l'app Health Connect sur l'appareil, tester permissions + import pas/calories actives sur device.
- [ ] Enregistrement du client OIDC dans **Authelia**.

### Déploiement homelab
- [ ] Mettre PocketBase 0.30.0 + Traefik en service, `pb_data` sur volume persistant, intégrer à la chaîne restic.

### Auth / PocketBase (à décider au déploiement)
- [ ] **`users.createRule`** : la migration durcit list/view/update/delete de `users` en owner-only mais laisse `createRule` inchangé. Décider selon `AUTH_MODE` : OIDC (auto-provisioning à la 1re connexion) vs password (création par l'admin, désactiver le signup public). Pour 2-5 users : privilégier la création admin.
- [ ] Vérifier après `docker compose up` que la migration `1720000000_init_collections.js` s'est appliquée (12 collections + règles parent) et tester une écriture cross-user (doit être refusée).

### Données externes
- [ ] **User-Agent OpenFoodFacts** : remplacer le contact placeholder dans `app/src/features/food/openFoodFacts.ts` (`OFF_USER_AGENT`) par un email/URL réel (règle OFF). Ajouter la mention ODbL « Data from Open Food Facts / ODbL » dans l'écran À propos (M11).

### Déploiement (outillage prêt — voir docs/DEPLOY.md)
- [x] CI `.github/workflows/build-images.yml` : push ghcr **public amd64** (PocketBase + ai-proxy), via `GITHUB_TOKEN`.
- [x] CI `.github/workflows/build-apk.yml` : APK preview via EAS → artefact (nécessite secret `EXPO_TOKEN` + `eas init`).
- [x] `docs/DEPLOY.md` (checklist + tableau des valeurs) et `docs/DEPLOY_PROMPT.md` (prompt agent homelab, OIDC).
- [x] compose pointe sur les images ghcr (`docker compose pull`), build local en secours ; `eas.json` porte les `EXPO_PUBLIC_*` (à remplacer par tes domaines).
- [ ] **Toi** : activer Actions + rendre les packages publics ; remplir `infra/.env` ; enregistrer le client OIDC Authelia ; `eas init` + secret `EXPO_TOKEN` ; lancer les workflows.

### Outillage recommandé
- [ ] Installer **gitleaks** en pre-commit (complète le secret-scan intégré). Le hook `gate.mjs` a un scanner de secours mais gitleaks couvre plus large.

## Problèmes connus / dettes
- **Vision assiette** : hook `usePlateVision` + endpoint prêts, mais l'UI complète de confirmation (poser les 1-3 questions puis appeler parse-food sur les items confirmés) reste à construire. Étiquette et machine sont câblées de bout en bout.
- **UI IA texte** : seuls parse-food (log NL) et vision sont câblés côté app ; meal-plan/summary/shopping-list/substitutions ont leurs endpoints serveur + client mais pas encore d'écrans dédiés (à faire au fil de l'eau / M11).
- Tests runtime device : scan caméra, Health Connect, sync live PocketBase → nécessitent un dev build (voir « À FAIRE »).
