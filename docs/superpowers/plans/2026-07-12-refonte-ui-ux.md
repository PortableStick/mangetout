# Refonte UI/UX (design system volt/ink/bone) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps en checkbox.
> Source design : `Mangetout Design System-handoff.zip` extrait dans le scratchpad `.../scratchpad/handoff/mangetout-design-system/project/`.

**Goal:** Traduire le design system volt/ink/bone (JSX web + CSS) en React Native : thème + polices,
kit de composants, écrans (Today/Session/Coach/Moves + cohérence), coach 3D.

**Architecture:** Source unique = `app/src/theme/tokens.ts` + kit `app/src/components/ui/*`. Dark-only.
Polices via `@expo-google-fonts/*` + `expo-font`. 3D via `three`+`expo-gl` (port de CoachRig).

**Tech Stack:** Expo 57 / RN 0.86 / React 19, expo-router, react-native-svg (déjà présent), jest 29.

## Global Constraints
- Expo SDK 57 / RN 0.86 / React 19. eslint 9, jest 29 (globals `@jest/globals`).
- **Identité (handoff, verbatim)** : ink `#0B0C0A/#121310/#1A1C17/#24261F/#32352B` ; bone `#F4F3EC/#C9C8BE/#8B8A80/#5C5B52` ;
  volt `#CDFB49` (hover `#DCFF6E`, press `#B7E436`, dim `rgba(205,251,73,0.12)`, on-volt `#0B0C0A`) ;
  signaux warn `#FFB03A` / fail `#FF5C48` / rest `#6FA8FF` (+ `-dim` à 0.12). Bordures hairline
  `rgba(244,243,236,0.08)` / strong `0.16`. **Zéro ombre portée** (glow volt `0 0 24px rgba(205,251,73,0.25)`).
- **Polices** : display `Anton` (UPPERCASE only), body `Archivo` (400/500/600/700 + italic 400), mono `IBM Plex Mono` (400/500/600).
- **Échelle typo (px)** : mega 96, display-1 56, display-2 40, title 24, body-lg 18, body-md 15, body-sm 13, label 11 ; leading display 0.92 / tight 1.15 / body 1.5 ; tracking label 0.14em ; **mono/label = UPPERCASE**, chiffres data = `tabular-nums` (`fontVariant: ['tabular-nums']`).
- **Radii** : 0/4/8/12/full (full = pilules/points only, jamais boutons). **Spacing** base-4 (4..80). Press **scale 0.97**.
- **Dark-only** : `useTheme()`/`theme.mode` gardent leur API mais renvoient toujours le schéma sombre.
- Aucune couleur en dur dans les composants/écrans (tout via `theme`). Langue FR, unités métriques.
- Commits Conventional Commits FR. Un milestone n'est « fait » que vert (typecheck+lint+tests) avant merge.
- Commande : `cd app && npm run typecheck && npm run lint && npm test`.

---

## M21 — Fondation : thème + polices + Text

### Task 21.1 : Réécriture des tokens
**Files:** Modify `app/src/theme/tokens.ts` ; Test `app/src/theme/tokens.test.ts` (adapter).
**Produces:** `palettes` (schéma sombre unique aux clés volt/ink/bone/signal — voir mapping), `typography`
(variants avec fontFamily/fontSize/lineHeight/letterSpacing/textTransform), `spacing`, `radius`, `fontFamily`,
`effects` (glow volt, press scale, durations, hairline borders), et helpers (`withAlpha` conservé).
- [ ] **Étape 1 (tests)** : adapter `tokens.test.ts` — vérifier que la palette expose les clés attendues
  (`background`=ink-0, `surface`=ink-2, `text`=bone-0, `textSecondary`=bone-1, `textTertiary`=bone-2,
  `accent`=volt, `onAccent`=on-volt, `accentMuted`=volt-dim, `success`=volt, `warning`=warn, `danger`=fail,
  `separator`=hairline, + nouvelles `borderStrong`, `signalRest`, `surfaceRaised`, `surfaceHover`). Vérifier
  radii (0/4/8/12/999) et échelle typo (mega=96…label=11). Conserver les clés `Palette` existantes
  consommées par le kit actuel (ne rien retirer sans migrer) — **ajouter/remapper, pas casser**.
- [ ] **Étape 2** : `cd app && npm test -- tokens` → échec.
- [ ] **Étape 3** : réécrire `tokens.ts` :
  - `palettes.dark` (et `palettes.light` = alias vers dark pour ne pas casser `useColorScheme`) avec le
    mapping ci-dessus + `fontFamily` = `{ display:'Anton_400Regular', body:'Archivo_400Regular',
    medium:'Archivo_500Medium', semibold:'Archivo_600SemiBold', bold:'Archivo_700Bold', mono:'IBMPlexMono_400Regular',
    monoMedium:'IBMPlexMono_500Medium' }`.
  - `typography` : nouveaux variants — `display` (Anton, 40, lh 0.92, uppercase), `displayLg` (Anton 56),
    `mega` (Anton 96), `title` (Archivo 600, 24), `body`/`bodyLg`/`bodySm` (Archivo), `label` (mono 11,
    uppercase, tracking 0.14em), `mono` (IBM Plex Mono). **Conserver** aussi les anciens noms utilisés par
    les écrans (`largeTitle`, `headline`, `subhead`, `footnote`, `caption`, `title3`, `callout`) en les
    RE-MAPPANT sur la nouvelle identité (ex. `largeTitle`→Anton uppercase, `headline`→Archivo 600,
    `footnote`→Archivo/mono sm) pour que les écrans existants restent cohérents sans réécriture immédiate.
  - `radius` = { sm:4, md:8, lg:12, xl:12, pill:999 } (serrer). `spacing` inchangé (base-4, étendre si besoin).
  - `shadow(scheme, level)` : renvoyer un objet **plat** (pas d'ombre portée) — élévation via
    `surface`/hairline ; exposer un helper `voltGlow` pour l'accent (shadowColor volt, radius 24, opacity ~0.25).
  - Garder `withAlpha` (avec sa garde regex).
- [ ] **Étape 4** : `npm test -- tokens && typecheck && lint` verts (⚠️ le typecheck de tout l'app doit
  passer : si des écrans référencent une clé de palette retirée, la remapper, pas la supprimer).
- [ ] **Étape 5** : Commit `feat(refonte): tokens volt/ink/bone (thème sombre, typo Anton/Archivo/Mono)`.

### Task 21.2 : Chargement des polices
**Files:** Modify `app/app/_layout.tsx` (ou là où `useFonts`/Inter est chargé), `app/package.json`.
- [ ] **Étape 1** : `cd app && npx expo install @expo-google-fonts/anton @expo-google-fonts/archivo @expo-google-fonts/ibm-plex-mono`
  (versions compatibles SDK 57 ; si un package n'existe pas sous ce nom, vérifier le nom exact npm).
- [ ] **Étape 2** : LIRE le layout racine — repérer le `useFonts({...})` actuel (Inter). Ajouter les
  familles : `Anton_400Regular`, `Archivo_400Regular/500Medium/600SemiBold/700Bold`, `IBMPlexMono_400Regular/500Medium/600SemiBold`.
  Conserver le gating splash tant que `!fontsLoaded`. (Garder Inter si encore référencé, sinon retirer.)
- [ ] **Étape 3** : `typecheck && lint && test` verts. (Rendu réel = device.)
- [ ] **Étape 4** : Commit `feat(refonte): charge les polices Anton/Archivo/IBM Plex Mono`.

### Task 21.3 : ThemeProvider dark-only + Text
**Files:** Modify `app/src/theme/ThemeProvider.tsx`, `app/src/components/ui/Text.tsx`.
- [ ] **Étape 1** : `ThemeProvider` — `scheme` forcé à `'dark'` (ignorer `useColorScheme`/`mode` pour le
  rendu, mais **garder** `mode`/`setMode` dans l'API pour ne pas casser Réglages ; `colors` = `palettes.dark`).
  Documenter en commentaire que l'app est dark-only (identité DS).
- [ ] **Étape 2** : `Text` — supporter les nouveaux variants (display/displayLg/mega/title/label/mono) en
  plus des anciens (remappés en 21.1) ; ajouter une prop `mono?`/`uppercase?` si utile ; `tabular` pour
  `fontVariant:['tabular-nums']` sur les données. Ne pas casser l'API `variant`/`color` existante.
- [ ] **Étape 3** : `typecheck && lint && test` verts.
- [ ] **Étape 4** : Commit `feat(refonte): thème sombre unique + Text (variants display/label/mono/tabular)`.

### Task 21.Q : Porte qualité M21
- [ ] Suite app verte + code-reviewer (diff M21) → corrections + commit. **Checkpoint device recommandé**
  (l'utilisateur build pour voir polices + couleurs) avant M22.

---

## M22 — Kit UI (adapter + créer) — outline (à détailer en tâches au démarrage de M22)
Adapter (fidélité `.d.ts`/`.prompt.md`) : **Button** (`size sm/md/lg`=36/44/52, `icon`, `fullWidth`, variant
`primary`=volt plein, press 0.97, copie impérative), **Card** (ink-2, hairline, radius 8, **flat**, prop
`accent` = bord+glow volt, `onPress`), **Badge** (tones `neutral/volt/warn/fail/rest`, mono uppercase),
**IconButton** (variants `primary/secondary/ghost`, tailles), **Field→Input** (eyebrow mono, `unit` suffixe,
`error` fail-red, focus volt).
Créer : **StatCard** (label mono + value display + unit + delta coloré ; priorité haute), **ProgressRing**
(react-native-svg, `strokeLinecap="butt"`, tones), **SetRow** (index 01.., poids+unité, reps, `@RPE`,
status pending/done/pr/fail, action LOG), **Tabs** (underline volt, labels mono uppercase), **Tag** (chip
filtre, `selected`=volt plein, `onRemove`), **Switch/Checkbox/Radio** (volt/ink, coins carrés). Chaque
composant : fidèle au handoff, tokens only, smoke/logique testée. `Dialog/Toast/Select` créés au besoin M23.

## M23 — Écrans — outline
- **Today** → `(tabs)/index.tsx` : header logo+date mono, eyebrow volt + titre display uppercase, Card séance
  (liste exos mono tabulaire + Button lg "Démarrer"), grille StatCard, Card insight coach.
- **Session** → `workout/[id].tsx` : header IconButton back + compteur mono + Badge, titre display, **hero
  numéral mega** (charge courante), rest-timer (signal-rest + barre), liste SetRow (LOG sur la série
  courante), insight. Converge avec le player M20.
- **Coach** → `(tabs)/coach.tsx` : hero CoachCore (placeholder 2D tant que M24 pas fait) + chat (bulles user
  volt-dim à droite, coach ink-2 à gauche) + input + IconButton send. Réutilise le markdown existant.
- **Moves** → nouveau `app/app/moves.tsx` : zone démo (placeholder tant que M24) + chips exos + sélecteur de
  tempo (4 presets) + cue. Point d'entrée depuis Session/Coach.
- **Cohérence** : passe ciblée sur journal, workouts, weight, gyms, réglages, login, about — héritent du kit ;
  ajuster titres (display uppercase), labels (mono), cartes (flat), retirer/neutraliser le toggle thème.

## M24 — Coach 3D (CoachRig → RN) — outline, device-gated
Porter la logique de `CoachRig.jsx` : chorégraphies `EX.*`/`tempoPhase`/`solveLeg` (portables), construction
procédurale (athlète + dumbbell/butterfly/rower low-poly + liseré volt via EdgesGeometry) en `three`+`expo-gl`
(base POC `feat/coach-3d`). Exposer `CoachCore` (idle, pour le chat) et `MovementDemo` (pour Moves, piloté par
tempo). Fallback 2D si perfs insuffisantes. Validation device.

## Self-review (couverture spec)
- Thème/polices/Text → M21. ✓ · Kit (5 adaptés + 9 créés) → M22. ✓ · Écrans designés + cohérence → M23. ✓ ·
  Coach 3D procédural → M24. ✓ · Dark-only + toggle neutralisé → 21.3 + M23. ✓ · MAJ CLAUDE.md → M23/fin. ✓
