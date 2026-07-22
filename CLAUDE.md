# CLAUDE.md — mangetout

> Contexte durable du projet. **Lu en premier à chaque session** (avec `docs/PROGRESS.md`) au lieu de re-scanner le code. Spec complète : `.claude/PROJECT_BRIEF.md`.

## Mission
App mobile **Android** (v1) de suivi fitness & calorique, **offline-first**, backend **auto-hébergé** (homelab autoritaire). Cross-platform proprement pour un ajout iOS ultérieur (différé). Dépôt **PUBLIC** → **zéro secret** committé, jamais.

## Stack verrouillée (vérifiée sur npm le 2026-07-07)
| Domaine | Choix | Version épinglée |
|---|---|---|
| Framework | Expo SDK | **57.0.3** (RN 0.86.0, React 19.2) |
| Langage | TypeScript strict | — |
| Routing | expo-router (file-based) | — |
| DB locale (cache offline) | expo-sqlite + drizzle-orm | drizzle **0.45.2** |
| État serveur/cache | TanStack Query | (pas de Redux) |
| Backend (source de vérité) | PocketBase (Docker, Traefik) | **0.39.5** (pré-1.0, épinglé ; build depuis binaire officiel) |
| Auth | Authelia OIDC (authz_code+PKCE) via SDK PocketBase | flag `AUTH_MODE` (oidc\|password) |
| Scan | expo-camera `CameraView` (`ean13/ean8/upc_a/upc_e`) | — |
| Nutrition externe | OpenFoodFacts (User-Agent custom, `fields=`) | ODbL — attribution obligatoire |
| Santé (Android) | react-native-health-connect + expo-health-connect | via `useHealthData` (couche neutre) |
| Build | EAS Build **Android only** (dev client + APK/AAB) | minSdkVersion **26** |
| IA | OpenRouter (1 clé, côté serveur) : texte `deepseek/deepseek-v4-flash`, vision `google/gemini-2.5-flash` | flag `AI_ENABLED` |

## Structure du dépôt (monorepo)
```
mangetout/
├─ app/            # Expo/RN — l'application mobile
├─ server/         # Proxy IA sidecar (Node, détient la clé OpenRouter) — derrière Traefik
├─ infra/          # docker-compose (PocketBase+Traefik), migrations PB, restic backup
├─ docs/           # PROGRESS.md + docs techniques
├─ ai/prompts/     # prompts IA versionnés (jamais en dur dans le code)
├─ .claude/        # agents/, hooks/, settings.json, PROJECT_BRIEF.md
├─ CLAUDE.md
└─ .env.example
```

## Conventions
- **Unités** : métriques (kg, cm, kcal, g). **Langue** : FR par défaut. **Dark mode** natif complet.
- **UI** : design system **volt/ink/bone** (dark-only) depuis la refonte M21→M24. Fonds `ink` quasi-noirs, texte `bone` (os), **accent unique `volt` `#CDFB49`** ; signaux warn/fail/rest. Look plat : **hairline borders, zéro ombre portée** (glow volt seul). Typo : **Anton** (titres, MAJUSCULES), **Archivo** (corps), **IBM Plex Mono** (labels/unités/données, uppercase, tabular). Radii serrés (0/4/8/12), contrastes AA. Source unique : `app/src/theme/tokens.ts` + kit `app/src/components/ui/`. Handoff de référence : `Mangetout Design System-handoff.zip` (gitignoré). *(Ancienne direction « Apple/iOS clair » abandonnée.)*
- **Commits** : Conventional Commits, messages FR impératifs concis. Petits & fréquents.
- **Branches** : une par milestone (`chore/setup`, `feat/auth-oidc`, `feat/data-layer`, `feat/food-barcode`, `feat/manual-entry`, `feat/weight`, `feat/workouts-gyms`, `feat/health-sync`, `feat/ai-text`, `feat/ai-vision`, `feat/ai-coach`, `feat/dashboard`, `chore/polish`). Merge sur `main` seulement si **vert**.
- **Nommage fichiers** : composants `PascalCase.tsx`, hooks `useXxx.ts`, modules `kebab` ou `camel` cohérents par dossier.
- **Secrets** : `.env` gitignoré ; `EXPO_PUBLIC_*` = valeurs publiques embarquées (jamais secrètes) ; clé IA **server only**.

## Pièges de versions (ne pas régresser)
- `app/.npmrc` : `legacy-peer-deps=true` (arbre de peers Expo). Garder pour les installs.
- **eslint 9.x** (pas 10 : casse eslint-plugin-react). **jest 29** (pas 30 : jest-expo 57 = internals jest 29).
- Deps explicites requises : `babel-preset-expo`, `@react-native/jest-preset@0.86.0`. Tests : importer les globals depuis `@jest/globals`.
- `app.json` : pas de `newArchEnabled` (nouvelle arch = défaut SDK 57).

## État : milestones 0→11 terminés (code + tests verts). Reste : dev build device, déploiement homelab, secrets (voir docs/PROGRESS.md « À FAIRE humain »).

## Commandes utiles
- App : `cd app && npm run typecheck` · `npm run lint` · `npm test` · `npx expo start --dev-client`
- Server : `cd server && npm run typecheck && npm test` (run : `npm run dev` / prod `tsx src/index.ts`)
- Server : `cd server && npm run typecheck && npm test`
- Porte qualité (manuelle) : `node .claude/hooks/gate.mjs --merge`
- Infra : `cd infra && docker compose up -d` (voir `infra/README.md`)

## Schéma collections PocketBase (source de vérité durable)
Toutes owner-scoped (`user` = relation vers `users`), règles d'accès `@request.auth.id = user.id`. Champs sync communs : `id`, `user`, `created`, `updated`, `deleted` (soft-delete), `client_updated_at` (last-write-wins).
- `users` — compte (via OIDC Authelia ou password).
- `foods` — aliment (nom, marque, macros /100g, source: off|manual|ai, barcode?, off_data_json?).
- `food_entries` — ligne de journal (date, meal_type: breakfast|lunch|dinner|snack, food, quantity_g, macros calculées, estimated: bool).
- `meals` — repas/recette réutilisable (nom, portions).
- `meal_items` — composant d'un `meal` (meal, food, quantity_g).
- `weight_entries` — poids/mensuration (date, weight_kg, measurements_json?).
- `gyms` — salle (nom, type: chain|home). Seed : **Basic-Fit** (chain) + **Salle perso** (home).
- `equipment` — matériel rattaché à un `gym` (nom canonique, muscle_groups[], category).
- `workouts` — séance (date, gym, notes).
- `exercises` — exercice d'une séance (workout, equipment?, name, order).
- `sets` — série (exercise, reps, weight_kg, order).
- `goals` — objectifs (kcal, protein_g, carbs_g, fat_g, weight_target_kg?, mode?: gain|cut|maintain).
- `meal_plans` — plan IA généré (semaine, json, éditable, régénérable par jour).

## Architecture & décisions clés
- **Homelab (PocketBase) = autoritaire.** SQLite local = cache offline. Sync last-write-wins sur `clientUpdatedAt`, file d'attente hors-ligne, réconciliation avec garde-fous (validation schéma + bornes sanité + journal de conflits, **jamais d'écrasement silencieux**). Rien en local-only.
  - Cache local **générique** (`src/db/schema.ts` : `sync_records` = collection+id+payload JSON, + `sync_queue`/`conflicts`/`sync_cursors`) — pas de table typée par entité ; formes métier en TS/zod au niveau des écrans. Moteur pur & DI dans `src/sync/` (`reconcile`, `sanity`, `queue`, `engine`, `manager`), adaptateurs `src/db/localStore.ts` (drizzle) + `remoteStore.ts` (PocketBase). Collections PB : `infra/pocketbase/pb_migrations/`.
- **IA** : app → proxy `server/` (détient la clé) → OpenRouter. Pipeline vision : image → Gemini (perception, sortie structurée) → DeepSeek (raisonnement). Sorties **JSON strict validées zod**. Cache + rate-limit par user.
- **Coach agentique** : function calling DeepSeek, outils lecture + action **owner-scoped exécutés serveur**, **propose→confirme→applique** (jamais de modif silencieuse).
- **Couche santé** : `useHealthData` neutre → Health Connect (Android). iOS/HealthKit = future implémentation, pas de réécriture.

## Politique de délégation aux sous-agents (`.claude/agents/`)
- **Orchestrateur (Opus, cette session)** : archi, décisions, séquencement, **toutes les écritures de code de prod**, commits/merges.
- **`explore`** (Sonnet, RO) : localiser/comprendre du code sans polluer le contexte orchestrateur.
- **`code-reviewer`** (Sonnet, RO) : qualité + anti-slop, **avant chaque merge**.
- **`security-reviewer`** (Sonnet, RO) : sécurité défensive, **avant chaque merge**.
- **`test-runner`** (Sonnet, Bash+écriture tests) : écrit/lance les tests du cœur.
- Contrainte Claude Code : un sous-agent ne peut pas en lancer un autre, ni afficher de prompt de permission → RO sauf test-runner (commandes de test pré-autorisées dans `settings.json`).
- **Escalade Opus** ponctuelle pour une tâche précise si Sonnet cale (sync/conflits complexes).

## Enforcement (hooks — `.claude/settings.json`)
- **PreToolUse Bash/PowerShell** → `guard-bash.mjs` : bloque commandes destructrices ; sur `git commit`/`git merge` lance `gate.mjs`.
- **PostToolUse Edit/Write** → `post-edit-check.mjs` : ESLint sur le fichier touché (signal).
- **`gate.mjs`** : commit → secret-scan + typecheck + lint ; merge → + tests. Lenient si workspace/outil absent.
- Un milestone n'est « fait » que **vert** (typecheck + lint + tests) avant merge.

## Règles token (rappel)
Lis CLAUDE.md + PROGRESS.md d'abord. Un milestone à la fois. Pas de sur-explication. N'invente pas d'API (vérifie la doc courante). Commit tôt et souvent. Tests sur les parties risquées. Edits ciblés, pas de régénération de fichiers entiers.
