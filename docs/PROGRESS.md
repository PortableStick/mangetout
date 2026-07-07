# PROGRESS — mangetout

## État courant
- Branche active : `chore/setup` (cadrage + M0), prête à merger sur `main`
- Dernier milestone terminé : **0 — Setup projet + PocketBase compose** (vert : typecheck + lint + tests + expo-doctor 20/20)
- Prochain milestone : 1 — Auth OIDC (Authelia via PocketBase)

## Fait
- [x] Cadrage : `.gitignore`, `.env.example`, `CLAUDE.md`, `docs/PROGRESS.md`, sous-agents, hooks (validés : destructif bloqué, secret-scan attrape une clé plantée, gate vert)
- [x] M0 app (`app/`) : Expo 57.0.4, expo-router (tabs Accueil/Journal/Séances/Coach/Réglages), thème Apple (tokens light/dark, Inter embarquée, Text/Screen/Card/ProgressBar), TanStack Query, drizzle+expo-sqlite installés, dashboard squelette. **tsc ✓ · eslint ✓ · jest ✓ · expo-doctor 20/20 ✓**
- [x] M0 infra (`infra/`) : Dockerfile PocketBase 0.39.5 (binaire officiel, multi-arch), docker-compose (PocketBase + ai-proxy derrière Traefik, en-têtes sécurité), `restic-backup.sh` (copie à froid pb_data + rétention + check), README déploiement.
- [x] M0 server (`server/`) : squelette proxy IA zéro-dépendance (health + /api/ai/* → 503), Dockerfile. Rempli au M8.
- [x] EAS (`app/eas.json`) : profils development (dev client APK) / preview (APK) / production (AAB), Android only.

## En cours / prochaines étapes
- [ ] Milestone 1 : PocketBase client OIDC Authelia, login SDK dans l'app (`authWithOAuth2` + expo-web-browser), flag `AUTH_MODE`, session persistante (expo-secure-store).

## Milestones (0→11)
- [x] 0 Setup + PocketBase compose
- [ ] 1 Auth OIDC
- [ ] 2 Data layer + sync (CRITIQUE)
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

### Outillage recommandé
- [ ] Installer **gitleaks** en pre-commit (complète le secret-scan intégré). Le hook `gate.mjs` a un scanner de secours mais gitleaks couvre plus large.

## Problèmes connus / dettes
- (aucun pour l'instant)
