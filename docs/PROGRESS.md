# PROGRESS — mangetout

## État courant
- Branche active : `chore/setup`
- Dernier milestone terminé : — (cadrage en cours)
- Prochain milestone : 0 — Setup projet + PocketBase compose

## Fait
- [x] Cadrage : `.gitignore` (secrets, pb_data, builds), `.env.example` (placeholders, zéro secret)
- [x] `CLAUDE.md` (stack épinglée vérifiée npm 2026-07-07, conventions, schéma PB, délégation)
- [x] Sous-agents `.claude/agents/` : explore, code-reviewer, security-reviewer, test-runner (Sonnet, RO sauf test-runner)
- [x] Hooks `.claude/settings.json` : guard-bash (destructif + porte commit/merge), post-edit (lint), gate (secret-scan+typecheck+lint+tests)

## En cours / prochaines étapes
- [ ] Milestone 0 : scaffold Expo SDK 57 (`app/`), ESLint/Prettier, drizzle+expo-sqlite, TanStack Query, EAS config Android, `infra/` compose PocketBase 0.30.0 + restic

## Milestones (0→11)
- [ ] 0 Setup + PocketBase compose
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
- 2026-07-07 : versions épinglées vérifiées sur npm — Expo 57.0.3, RN 0.86.0, drizzle 0.45.2. PocketBase 0.30.0 (à re-vérifier au déploiement).
- 2026-07-07 : enforcement par hooks Node (portables Windows) ; secret-scan intégré en fallback (gitleaks recommandé en complément, voir À FAIRE).

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
