# PROGRESS — mangetout

## État courant
- Branche active : `feat/workouts-gyms` (M6), prête à merger
- Dernier milestone terminé : **6 — Workouts + salles** (vert : tsc + lint + 72 tests)
- Prochain milestone : 7 — Health sync (Health Connect)

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

## En cours / prochaines étapes
- [ ] Milestone 7 : `useHealthData` (couche neutre) → Health Connect Android, permissions, import pas/calories actives.

## Milestones (0→11)
- [x] 0 Setup + PocketBase compose
- [x] 1 Auth OIDC
- [x] 2 Data layer + sync (CRITIQUE)
- [x] 3 Food + barcode (OpenFoodFacts)
- [x] 4 Saisie manuelle + recettes
- [x] 5 Poids / mensurations + graphe
- [x] 6 Workouts + salles
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
- 2026-07-07 : monorepo `app/` + `server/` + `infra/` (sépare bundle app / secrets serveur / infra). Proxy IA = sidecar Node dédié (testable, isole la clé) plutôt que hook Go PocketBase.
- 2026-07-07 : versions vérifiées npm — Expo 57.0.4, RN 0.86.0, React 19.2.3, drizzle 0.45.2, zod 4, pocketbase-sdk 0.27.
- 2026-07-07 : **PocketBase = 0.39.5**, construit depuis le binaire officiel GitHub (multi-arch). L'image `ghcr.io/pocketbase/pocketbase` du brief **n'existe pas** (vérifié) → Dockerfile maison.
- 2026-07-07 : enforcement par hooks Node (portables Windows) ; secret-scan intégré (gitleaks en complément, voir À FAIRE).
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
- [ ] Enregistrement du client OIDC dans **Authelia**.

### Déploiement homelab
- [ ] Mettre PocketBase 0.30.0 + Traefik en service, `pb_data` sur volume persistant, intégrer à la chaîne restic.

### Auth / PocketBase (à décider au déploiement)
- [ ] **`users.createRule`** : la migration durcit list/view/update/delete de `users` en owner-only mais laisse `createRule` inchangé. Décider selon `AUTH_MODE` : OIDC (auto-provisioning à la 1re connexion) vs password (création par l'admin, désactiver le signup public). Pour 2-5 users : privilégier la création admin.
- [ ] Vérifier après `docker compose up` que la migration `1720000000_init_collections.js` s'est appliquée (12 collections + règles parent) et tester une écriture cross-user (doit être refusée).

### Données externes
- [ ] **User-Agent OpenFoodFacts** : remplacer le contact placeholder dans `app/src/features/food/openFoodFacts.ts` (`OFF_USER_AGENT`) par un email/URL réel (règle OFF). Ajouter la mention ODbL « Data from Open Food Facts / ODbL » dans l'écran À propos (M11).

### Outillage recommandé
- [ ] Installer **gitleaks** en pre-commit (complète le secret-scan intégré). Le hook `gate.mjs` a un scanner de secours mais gitleaks couvre plus large.

## Problèmes connus / dettes
- (aucun pour l'instant)
