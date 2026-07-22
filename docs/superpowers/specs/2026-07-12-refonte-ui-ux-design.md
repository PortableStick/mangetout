# Design — Refonte UI/UX « mangetout » (design system volt/ink/bone)

> Date : 2026-07-12 · Auteur : orchestrateur (Opus) · Statut : validé pour planification
> Source : handoff `Mangetout Design System-handoff.zip` (racine). Milestones **M21 → M24**, exécution
> subagent-driven (Opus orchestre, agents Sonnet implémentent, portes qualité vertes avant merge).

## Contexte & objectif
L'utilisateur fournit un **design system complet** (tokens CSS, guidelines, composants JSX web, écrans
d'app) et demande d'implémenter cette UI/UX **complètement** dans l'app React Native. Le DS est écrit en
JSX web + CSS variables → il faut le **traduire** en RN (pas de réutilisation directe).

### Identité (rupture assumée avec l'ancien « Apple clean »)
Look **« tracker de muscu mécanique »**, **sombre only**, plat, à fort contraste :
- **Couleurs** : `ink` (fonds quasi-noirs chauds `#0B0C0A`→`#32352B`), `bone` (textes os `#F4F3EC`→`#5C5B52`),
  **`volt` `#CDFB49`** (accent unique, vert-citron fluo), signaux `warn #FFB03A` / `fail #FF5C48` /
  `rest #6FA8FF` (+ variantes `-dim`). Bordures hairline, **zéro ombre portée** (glow volt seulement).
- **Typo** : `Anton` (display, TOUJOURS majuscules, gros chiffres), `Archivo` (corps), `IBM Plex Mono`
  (labels/eyebrows/unités/données, uppercase, tracking large, chiffres tabulaires). Échelle mega 96 →
  label 11. `leading-display 0.92`.
- **Formes** : radii serrés (0/4/8/12/full-pour-pilules-seulement), spacing base-4, hit target 44, canvas 430.
- **Motion** : rapide/mécanique (120/200/350ms, `ease-out` cubic, **press scale 0.97**, pas de bounce).

### Décisions (l'utilisateur a dit « tu gères »)
1. **Adoption complète** de l'identité volt/ink/bone. Elle **supersède** la directive « Apple/iOS » de
   `CLAUDE.md` → mettre à jour la section UI de `CLAUDE.md` en fin de chantier.
2. **Dark-only** : le handoff ne fournit aucune palette claire. L'app devient sombre par défaut ; le
   sélecteur clair/sombre (M15a) est **neutralisé** (thème unique). Pas d'invention de palette claire.
3. **Nouvelles dépendances polices** : `@expo-google-fonts/anton`, `@expo-google-fonts/archivo`,
   `@expo-google-fonts/ibm-plex-mono` (+ `expo-font` déjà présent). Nécessaires à l'identité.
4. **Coach 3D (`CoachRig`)** : c'est un rig Three.js **procédural** (athlète + machines low-poly, liseré
   volt via EdgesGeometry, chorégraphies par tempo) — pas de modèle externe. Il **incarne** le coach 3D de
   M20 : on le porte en `three`+`expo-gl` (fondation validée par le POC `feat/coach-3d`). La logique de
   chorégraphie (`tempoPhase`, `solveLeg`, `EX.*`) est portable telle quelle ; seul le rendu (three UMD +
   DOM) est à retraduire. **Device-gated.**
5. **Validation** : thème/polices/écrans/3D ne se valident visuellement qu'au **build device** — les portes
   automatiques restent JS-level (typecheck/lint/tests). Checkpoints device aux bornes de milestone.

### Non-objectifs (v1)
- `Tooltip` (pas de hover tactile) → remplacé par de l'aide inline / différé.
- `Select`/`Dialog`/`Toast` créés **au besoin** des écrans, pas spéculativement.
- Pas de reskin pixel-perfect de TOUS les écrans en une passe — priorité aux écrans designés
  (Today/Session/Coach/Moves) ; les autres héritent du kit + polish ciblé.

## Traduction — mapping (source → RN)
| DS | Cible RN |
|---|---|
| tokens/*.css | `app/src/theme/tokens.ts` (réécriture) + `ThemeProvider` |
| Button/Card/Badge/IconButton/Input | **adapter** `app/src/components/ui/*` |
| StatCard/ProgressRing/SetRow/Tabs/Tag/Switch/Checkbox/Radio | **créer** (RN, `react-native-svg` déjà présent pour ProgressRing) |
| Dialog/Toast/Select | créer au besoin (Modal / provider / bottom-sheet) |
| TodayScreen | `app/app/(tabs)/index.tsx` |
| SessionScreen | `app/app/workout/[id].tsx` (hero numéral, rest-timer, SetRow) — rejoint le player M20 |
| CoachScreen | `app/app/(tabs)/coach.tsx` (chat + hero CoachCore) |
| MovesScreen | **nouveau** `app/app/moves.tsx` (démo mouvement 3D + chips exos + tempo + cue) |
| CoachRig (CoachCore/MovementDemo) | `three`+`expo-gl` (port), device-gated (M24) |

## Milestones
- **M21 — Fondation** : réécrire `tokens.ts` (volt/ink/bone, typo, radii, effects), charger les 3 polices,
  adapter `ThemeProvider` (dark-only) + `Text` (variants display/title/body/label/mono, uppercase display).
  Tous les écrans existants doivent continuer de compiler/rendre (couleurs mappées). Tests tokens.
- **M22 — Kit UI** : adapter Button/Card/Badge/IconButton/Field(→Input) ; créer StatCard, ProgressRing,
  SetRow, Tabs, Tag, Switch, Checkbox, Radio. Fidélité aux `.prompt.md`/`.d.ts` du handoff. Smoke/logique.
- **M23 — Écrans** : retraduire Today (dashboard), Session (workout/[id]), Coach (chat+hero), créer Moves ;
  puis passe de cohérence sur les écrans restants (journal, workouts, weight, gyms, réglages, login…).
- **M24 — Coach 3D** : porter `CoachRig` (CoachCore idle pour le chat + MovementDemo pour Moves) en
  three/expo-gl, chorégraphies par tempo. S'appuie sur le POC `feat/coach-3d`. Device-gated.

## Modèle d'exécution & branche
Branche `feat/refonte-ui-ux` (depuis `main`). Orchestrateur Opus + agents Sonnet, revue par tâche + revue
finale, portes `code-reviewer` (+ `security-reviewer` si surface sensible) + `test-runner` + `gate.mjs`
vertes avant merge. Ordre M21→M22→M23→M24 (M24 device-gated, en dernier). Checkpoint device après M21
(polices/couleurs) et à chaque écran majeur.

## Risques & garde-fous
- **Fidélité visuelle non vérifiable sans device** → livrer des increments buildables, checkpoints device.
- **Régression massive** (tout l'app change de thème) : concentrer dans `tokens.ts` + kit (source unique) ;
  garder les écrans minces ; M21 doit laisser l'app compilable/verte même avant le restyle des écrans.
- **Polices** : fallback système si non chargées ; charger via `expo-font`/`useFonts` au démarrage (splash).
- **Dark-only** : neutraliser proprement le toggle M15a sans casser `useTheme()`/`theme.mode` (garder l'API,
  renvoyer toujours le schéma sombre) pour ne pas casser les consommateurs.
- **3D** : device-gated ; fallback 2D déjà prévu (M20) si perfs insuffisantes.
