# Salles (CRUD + IA), markdown coach, thème & refonte — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ajouter la gestion manuelle des salles (CRUD + équipement), permettre à l'IA coach de modifier
les salles (propose→confirme→applique), rendre le markdown proprement dans le chat coach, et rendre le
thème choisissable (clair/sombre/système) avec une refonte visuelle affirmée.

**Architecture:** Écriture locale optimiste via `getSyncManager().enqueue` (SQLite + file de push) pour le
manuel ; actions IA écrites côté serveur (PocketBase) puis rapatriées par `syncAll()`. Markdown = parseur
maison pur + composant de rendu. Thème = mode persisté dans `ThemeProvider`. Refonte concentrée dans
`tokens.ts` + kit `components/ui/` (source unique) pour se propager aux écrans.

**Tech Stack:** Expo 57 / RN 0.86 / React 19, expo-router, drizzle + expo-sqlite, TanStack Query, zod,
Hono (serveur), PocketBase. Tests : jest 29 (globals via `@jest/globals`).

## Global Constraints
- **Expo SDK 57.0.4 / RN 0.86.0 / React 19.2** — ne pas modifier ces versions.
- **eslint 9.x, jest 29** — ne pas monter de version. Tests importent les globals depuis `@jest/globals`.
- **Zéro nouvelle dépendance** : markdown = maison ; animations = `Pressable` + `Animated` RN et/ou
  `react-native-reanimated` **déjà présent** (transitif d'expo-router). Aucune install.
- **Langue FR**, unités métriques. Dark mode complet. Style Apple clean, accent vert.
- **Owner-scoping** : côté serveur le champ `user` est TOUJOURS `ctx.userId`, jamais une valeur du modèle.
- **Soft-delete** partout (`deleted:true`), jamais de hard-delete. `clientUpdatedAt = Date.now()` à chaque écriture.
- **Commits** : Conventional Commits, messages FR impératifs concis. Un milestone n'est « fait » que
  vert (typecheck + lint + tests) avant merge, avec code-reviewer + security-reviewer.
- **Commandes** : app `cd app && npm run typecheck && npm run lint && npm test` · serveur
  `cd server && npm run typecheck && npm test`.

---

## M12 — Salles : CRUD manuel

### Task 12.1 : Repository CRUD salles + équipement

**Files:**
- Modify: `app/src/features/workouts/repository.ts`
- Test: `app/src/features/workouts/repository.test.ts` (créer)

**Interfaces — Produces:**
- `addGym(input: { name: string; gymType: GymType; userId: string }): Promise<string>` (retourne l'id)
- `updateGym(input: { id: string; name: string; gymType: GymType; userId: string }): Promise<void>`
- `deleteGym(input: { id: string; userId: string }): Promise<void>` (soft-delete + cascade équipement)
- `updateEquipment(input: { id: string; gymId: string; name: string; category: EquipmentCategory; muscleGroups: MuscleGroup[]; userId: string }): Promise<void>`
- `removeEquipment(input: { id: string; userId: string }): Promise<void>`

**Consumes:** `getSyncManager().enqueue(collection, 'upsert', record)`, `newId()`, `listGyms()`,
`listEquipment(gymId)`, types `Gym`/`Equipment`/`GymType` de `./types`.

- [ ] **Step 1 : Test qui échoue** — `repository.test.ts`. Mocker le sync manager pour capturer les
  `enqueue`. Pattern :

```ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const enqueue = jest.fn(async () => {});
const gyms: any[] = [];
const equipment: any[] = [];

jest.mock('@/sync/manager', () => ({ getSyncManager: () => ({ enqueue }) }));
jest.mock('@/lib/id', () => ({ newId: () => 'ID' }));
// listGyms/listEquipment lisent la db → mocker le module db ou exposer via injection.
// Suivre le pattern déjà utilisé dans les autres *.test.ts du repo pour le mock db.

import { addGym, deleteGym } from './repository';

beforeEach(() => enqueue.mockClear());

it('addGym enfile un upsert gyms avec user et deleted=false', async () => {
  await addGym({ name: 'Salle A', gymType: 'home', userId: 'u1' });
  expect(enqueue).toHaveBeenCalledWith('gyms', 'upsert',
    expect.objectContaining({ name: 'Salle A', gymType: 'home', user: 'u1', deleted: false }));
});

it('deleteGym cascade en soft-delete sur l’équipement de la salle', async () => {
  // arrange: listEquipment renvoie 2 items pour la salle g1
  await deleteGym({ id: 'g1', userId: 'u1' });
  const collections = enqueue.mock.calls.map((c) => [c[0], (c[2] as any).id, (c[2] as any).deleted]);
  expect(collections).toEqual(expect.arrayContaining([
    ['gyms', 'g1', true],
    ['equipment', expect.any(String), true],
  ]));
});
```

> Note : reproduire exactement le mécanisme de mock de `db`/`listEquipment` utilisé par les autres tests
> du dossier (regarder `generator.test.ts` / `nutrition.test.ts` pour la convention). Si `listEquipment`
> lit `db` directement, injecter un helper mockable ou mocker `@/db/client`.

- [ ] **Step 2 : Lancer, vérifier l'échec** — `cd app && npm test -- repository` → FAIL (fonctions absentes).

- [ ] **Step 3 : Implémenter** dans `repository.ts` (aligné sur `addEquipment` existant) :

```ts
export async function addGym(input: { name: string; gymType: GymType; userId: string }): Promise<string> {
  const id = newId();
  await getSyncManager().enqueue('gyms', 'upsert', {
    id, name: input.name, gymType: input.gymType,
    user: input.userId, clientUpdatedAt: Date.now(), deleted: false,
  });
  return id;
}

export async function updateGym(input: { id: string; name: string; gymType: GymType; userId: string }): Promise<void> {
  await getSyncManager().enqueue('gyms', 'upsert', {
    id: input.id, name: input.name, gymType: input.gymType,
    user: input.userId, clientUpdatedAt: Date.now(), deleted: false,
  });
}

export async function deleteGym(input: { id: string; userId: string }): Promise<void> {
  const mgr = getSyncManager();
  const now = Date.now();
  for (const e of listEquipment(input.id)) {
    await mgr.enqueue('equipment', 'upsert', { id: e.id, gym: e.gym, name: e.name,
      category: e.category, muscleGroups: e.muscleGroups,
      user: input.userId, clientUpdatedAt: now, deleted: true });
  }
  await mgr.enqueue('gyms', 'upsert', { id: input.id,
    user: input.userId, clientUpdatedAt: now, deleted: true });
}

export async function updateEquipment(input: { id: string; gymId: string; name: string;
  category: Equipment['category']; muscleGroups: Equipment['muscleGroups']; userId: string }): Promise<void> {
  await getSyncManager().enqueue('equipment', 'upsert', {
    id: input.id, gym: input.gymId, name: input.name, category: input.category,
    muscleGroups: input.muscleGroups, user: input.userId, clientUpdatedAt: Date.now(), deleted: false });
}

export async function removeEquipment(input: { id: string; userId: string }): Promise<void> {
  await getSyncManager().enqueue('equipment', 'upsert', {
    id: input.id, user: input.userId, clientUpdatedAt: Date.now(), deleted: true });
}
```

> `GymType` doit être importé depuis `./types` en haut du fichier (ajouter à l'import existant).

- [ ] **Step 4 : Lancer, vérifier le succès** — `cd app && npm test -- repository` → PASS.
- [ ] **Step 5 : Commit** — `git add app/src/features/workouts/repository.* && git commit -m "feat(salles): CRUD repository salles + équipement (soft-delete cascade)"`

### Task 12.2 : Hooks React Query salles

**Files:**
- Modify: `app/src/features/workouts/useWorkouts.ts`

**Interfaces — Produces:** `useAddGym()`, `useUpdateGym()`, `useDeleteGym()`, `useUpdateEquipment()`,
`useRemoveEquipment()` — mutations calquées sur `useAddEquipment` (injecte `user.id`, invalide
`['gyms']` et/ou `['equipment', gymId]`).
**Consumes:** fonctions de Task 12.1, `useAuth()`, `useMutation`/`useQueryClient`.

- [ ] **Step 1 : Implémenter** (pas de test unitaire dédié — hooks minces ; couverts en smoke plus tard). Exemple :

```ts
export function useAddGym() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { name: string; gymType: GymType }) => addGym({ ...input, userId: user?.id ?? '' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['gyms'] }),
  });
}
// idem useUpdateGym, useDeleteGym (invalide ['gyms'] et ['equipment']),
// useUpdateEquipment / useRemoveEquipment (invalide ['equipment', gymId]).
```

> Importer les nouvelles fonctions + `GymType` depuis `./repository` / `./types`.

- [ ] **Step 2 : Typecheck** — `cd app && npm run typecheck` → OK.
- [ ] **Step 3 : Commit** — `git commit -am "feat(salles): hooks React Query CRUD salles"`

### Task 12.3 : Écran liste `/gyms`

**Files:**
- Create: `app/app/gyms.tsx`
- Modify: `app/app/(tabs)/workouts.tsx` (lien « Gérer les salles »), `app/app/(tabs)/settings.tsx` (lien)

**Interfaces — Consumes:** `useGyms()`, `useEquipment()`, `useRouter()`, kit UI (`Screen/Card/Text/Button`),
`useTheme()`. **Produces:** route `/gyms`, navigue vers `/gym-edit?id=`.

- [ ] **Step 1 : Implémenter `gyms.tsx`** : titre « Salles », bouton « + » (comme
  [workouts.tsx](../../../app/app/(tabs)/workouts.tsx) l'en-tête à pastille) → `router.push('/gym-edit')`.
  Liste des salles : `Card` cliquable par salle → `router.push({ pathname: '/gym-edit', params: { id: g.id } })`,
  affichant nom, badge type (Basic-Fit=chain « Salle » / home « Perso »), et nb d'équipements
  (`useEquipment(g.id).data?.length`). État vide si aucune salle → bouton vers seed existant.
- [ ] **Step 2 : Ajouter les points d'entrée** : dans `workouts.tsx` un `Button variant="ghost"
  label="Gérer les salles"` → `/gyms` ; dans `settings.tsx` un `Button variant="ghost" label="Mes salles"`
  → `/gyms` (près du bouton « À propos »).
- [ ] **Step 3 : Vérifier** — `cd app && npm run typecheck && npm run lint` → OK.
- [ ] **Step 4 : Commit** — `git add app/app && git commit -m "feat(salles): écran liste /gyms + points d'entrée"`

### Task 12.4 : Écran édition `/gym-edit` (création/édition + équipement + suppression)

**Files:**
- Create: `app/app/gym-edit.tsx`

**Interfaces — Consumes:** `useLocalSearchParams()` (id optionnel), `useGyms`/`useEquipment`,
`useAddGym/useUpdateGym/useDeleteGym/useUpdateEquipment/useRemoveEquipment/useAddEquipment`,
`MUSCLE_LABELS` + types. **Produces:** route `/gym-edit`.

- [ ] **Step 1 : Implémenter** : champ nom (`Field`), sélection type (deux `Button` toggles ou
  `SegmentedControl` de Task 15b si déjà dispo — sinon toggles simples pour l'instant). Section
  « Équipement » listant `useEquipment(id)` avec, par item, édition (nom/catégorie/groupes) et retrait
  (`useRemoveEquipment`), plus un formulaire d'ajout (`useAddEquipment`). En mode édition : bouton
  « Supprimer la salle » (danger) avec `Alert.alert` de confirmation → `useDeleteGym` puis `router.back()`.
  En création : « Créer la salle » → `useAddGym` puis rester pour ajouter l'équipement (naviguer vers
  l'édition avec le nouvel id) ou `router.back()`.
- [ ] **Step 2 : Vérifier** — `cd app && npm run typecheck && npm run lint` → OK.
- [ ] **Step 3 : Commit** — `git commit -am "feat(salles): écran /gym-edit (création/édition, équipement, suppression)"`

### Task 12.5 : Porte qualité M12
- [ ] `cd app && npm run typecheck && npm run lint && npm test` → tout vert.
- [ ] Dispatch code-reviewer (diff M12) + corriger les findings bloquants.
- [ ] Commit des corrections éventuelles.

---

## M13 — Salles : outils IA (propose→confirme→applique)

### Task 13.1 : Définitions d'outils salles (serveur)

**Files:**
- Modify: `server/src/coach/tools.ts`
- Test: `server/src/coach/tools.test.ts` (ou fichier de tests coach existant)

**Interfaces — Produces (ajouts à `TOOLS`):** `add_gym`, `update_gym`, `delete_gym`, `add_equipment`,
`remove_equipment`. Étend `ToolDef` avec un champ optionnel `op?: 'create' | 'update' | 'delete'`
(défaut `create` pour les actions existantes).
**Consumes:** `z`, `ToolDef`, `validateToolCall` existants.

- [ ] **Step 1 : Test qui échoue** — valider les args de chaque nouvel outil :

```ts
import { describe, it, expect } from '@jest/globals';
import { validateToolCall, TOOLS } from './tools.ts';

it('add_gym exige nom + type valides', () => {
  expect(validateToolCall('add_gym', { name: 'Home', gymType: 'home' }).ok).toBe(true);
  expect(validateToolCall('add_gym', { name: '', gymType: 'home' }).ok).toBe(false);
  expect(validateToolCall('add_gym', { name: 'X', gymType: 'gym' }).ok).toBe(false);
});
it('update_gym exige un id + au moins un champ', () => {
  expect(validateToolCall('update_gym', { id: 'g1', name: 'New' }).ok).toBe(true);
  expect(validateToolCall('update_gym', { id: 'g1' }).ok).toBe(false);
});
it('delete_gym / remove_equipment exigent un id', () => {
  expect(validateToolCall('delete_gym', { id: 'g1' }).ok).toBe(true);
  expect(validateToolCall('delete_gym', {}).ok).toBe(false);
});
it('les nouveaux outils salles sont des actions', () => {
  for (const t of ['add_gym','update_gym','delete_gym','add_equipment','remove_equipment'])
    expect(TOOLS[t].kind).toBe('action');
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `cd server && npm test -- tools` → FAIL.
- [ ] **Step 3 : Implémenter** dans `tools.ts` :

```ts
const GYM_TYPE = z.enum(['chain', 'home']);
const CATEGORY = z.enum(['machine', 'free_weight', 'cardio', 'functional']);
const MUSCLES = z.array(z.string()).max(20);

// dans TOOLS :
add_gym: { kind: 'action', collection: 'gyms', op: 'create',
  description: 'Crée une salle',
  args: z.object({ name: z.string().min(1).max(80), gymType: GYM_TYPE }) },
update_gym: { kind: 'action', collection: 'gyms', op: 'update',
  description: 'Modifie une salle (nom et/ou type)',
  args: z.object({ id: z.string().min(1), name: z.string().min(1).max(80).optional(), gymType: GYM_TYPE.optional() })
    .refine((v) => v.name !== undefined || v.gymType !== undefined, { message: 'au moins un champ' }) },
delete_gym: { kind: 'action', collection: 'gyms', op: 'delete',
  description: 'Supprime une salle (et son équipement)',
  args: z.object({ id: z.string().min(1) }) },
add_equipment: { kind: 'action', collection: 'equipment', op: 'create',
  description: 'Ajoute du matériel à une salle',
  args: z.object({ gymId: z.string().min(1), name: z.string().min(1).max(80), category: CATEGORY, muscleGroups: MUSCLES }) },
remove_equipment: { kind: 'action', collection: 'equipment', op: 'delete',
  description: 'Retire du matériel',
  args: z.object({ id: z.string().min(1) }) },
```

> Ajouter `op?: 'create' | 'update' | 'delete';` à l'interface `ToolDef`.

- [ ] **Step 4 : Lancer, vérifier le succès** — `cd server && npm test -- tools` → PASS.
- [ ] **Step 5 : Commit** — `git add server/src/coach && git commit -m "feat(coach): outils action salles/équipement (create/update/delete)"`

### Task 13.2 : Exécution create/update/delete owner-scoped (serveur)

**Files:**
- Modify: `server/src/coach/execute.ts`
- Test: `server/src/coach/execute.test.ts` (ou fichier coach existant)

**Interfaces — Produces:** `applyAction` gère les 3 opérations selon `TOOLS[tool].op`. `buildRecord`
étendu pour `add_gym`/`add_equipment`. Nouvelle fonction interne `buildPatch(tool, args, now)` pour update/delete.
**Consumes:** `TOOLS`, `validateToolCall`, `pbFetch`, `ctx.userId`.

- [ ] **Step 1 : Test qui échoue** — vérifier le routage et l'invariant `user` :

```ts
import { describe, it, expect, jest } from '@jest/globals';
import { applyAction } from './execute.ts';

function fakeFetch(capture: any[]) {
  return jest.fn(async (url: string, init: any) => {
    capture.push({ url, method: init.method, body: JSON.parse(init.body ?? '{}') });
    return { ok: true, json: async () => ({ id: 'new' }) } as any;
  });
}

it('add_gym POST avec user = contexte, jamais du modèle', async () => {
  const calls: any[] = [];
  const ctx = { userId: 'real', token: 't', fetchImpl: fakeFetch(calls) };
  await applyAction('add_gym', { name: 'H', gymType: 'home', user: 'HACKER' }, ctx as any, 1_000);
  expect(calls[0].method).toBe('POST');
  expect(calls[0].url).toContain('/collections/gyms/records');
  expect(calls[0].body.user).toBe('real'); // pas 'HACKER'
});

it('update_gym PATCH sans champ user', async () => {
  const calls: any[] = [];
  const ctx = { userId: 'real', token: 't', fetchImpl: fakeFetch(calls) };
  await applyAction('update_gym', { id: 'g1', name: 'New', user: 'HACKER' }, ctx as any, 1_000);
  expect(calls[0].method).toBe('PATCH');
  expect(calls[0].url).toContain('/collections/gyms/records/g1');
  expect(calls[0].body).not.toHaveProperty('user');
  expect(calls[0].body.name).toBe('New');
});

it('delete_gym PATCH deleted=true', async () => {
  const calls: any[] = [];
  const ctx = { userId: 'real', token: 't', fetchImpl: fakeFetch(calls) };
  await applyAction('delete_gym', { id: 'g1' }, ctx as any, 1_000);
  expect(calls.some((c) => c.url.endsWith('/records/g1') && c.method === 'PATCH' && c.body.deleted === true)).toBe(true);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `cd server && npm test -- execute` → FAIL.
- [ ] **Step 3 : Implémenter** dans `execute.ts` :
  - Étendre `buildRecord` : `case 'add_gym': return { ...base, name: args.name, gymType: args.gymType };`
    et `case 'add_equipment': return { ...base, gym: args.gymId, name: args.name, category: args.category, muscleGroups: args.muscleGroups };`
  - Ajouter `buildPatch` :

```ts
function buildPatch(tool: string, args: Record<string, unknown>, now: number): Record<string, unknown> {
  if (tool === 'delete_gym' || tool === 'remove_equipment') return { deleted: true, clientUpdatedAt: now };
  if (tool === 'update_gym') {
    const patch: Record<string, unknown> = { clientUpdatedAt: now };
    if (args.name !== undefined) patch.name = args.name;
    if (args.gymType !== undefined) patch.gymType = args.gymType;
    return patch; // JAMAIS de champ user
  }
  return { clientUpdatedAt: now };
}
```
  - Réécrire `applyAction` pour brancher sur `def.op` :

```ts
const op = def.op ?? 'create';
if (op === 'create') {
  const body = buildRecord(tool, v.args as any, ctx.userId, now);
  const res = await pbFetch(ctx, `/api/collections/${def.collection}/records`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) return { ok: false, error: `PocketBase ${res.status}` };
  const rec = (await res.json()) as { id?: string };
  return { ok: true, id: rec.id ?? '' };
}
const id = (v.args as any).id as string;
// delete_gym : cascade équipement de la salle avant de supprimer la salle
if (tool === 'delete_gym') {
  const listRes = await pbFetch(ctx, `/api/collections/equipment/records?filter=${encodeURIComponent(`gym="${id}"`)}&perPage=200`, { method: 'GET' });
  if (listRes.ok) {
    const { items = [] } = (await listRes.json()) as { items?: { id: string }[] };
    for (const it of items)
      await pbFetch(ctx, `/api/collections/equipment/records/${it.id}`, { method: 'PATCH', body: JSON.stringify({ deleted: true, clientUpdatedAt: now }) });
  }
}
const patch = buildPatch(tool, v.args as any, now);
const res = await pbFetch(ctx, `/api/collections/${def.collection}/records/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
if (!res.ok) return { ok: false, error: `PocketBase ${res.status}` };
return { ok: true, id };
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `cd server && npm test -- execute` → PASS.
- [ ] **Step 5 : Commit** — `git commit -am "feat(coach): applyAction route create/update/delete owner-scoped"`

### Task 13.3 : Résumés de proposition (serveur)

**Files:**
- Modify: `server/src/coach/engine.ts` (fonction `proposalSummary`)

- [ ] **Step 1 : Étendre `proposalSummary`** avec un cas lisible FR par outil, ex :
  `add_gym` → `Créer la salle « ${args.name} »`, `update_gym` → `Modifier la salle`, `delete_gym` →
  `Supprimer la salle`, `add_equipment` → `Ajouter « ${args.name} »`, `remove_equipment` →
  `Retirer un équipement`. Garder un défaut générique.
- [ ] **Step 2 : Test** (si suite coach couvre proposalSummary) — assert que `runCoach` renvoie
  `type:'proposal'` avec un `summary` non vide pour `add_gym`. Sinon smoke via test existant.
- [ ] **Step 3 : Vérifier** — `cd server && npm run typecheck && npm test` → OK.
- [ ] **Step 4 : Commit** — `git commit -am "feat(coach): résumés de proposition pour les actions salles"`

### Task 13.4 : Sync après apply (app)

**Files:**
- Modify: `app/app/(tabs)/coach.tsx` (fonction `confirm`) **ou** `app/src/features/ai/useAi.ts` (`useApplyAction`)

**Interfaces — Consumes:** `getSyncManager().syncAll()`.

- [ ] **Step 1 : Modifier `useApplyAction`** (préférable — centralisé) : en `onSuccess`, `await
  getSyncManager().syncAll()` puis `qc.invalidateQueries()`. Si `useApplyAction` n'a pas de `qc`,
  l'ajouter. Le `confirm()` de `coach.tsx` invalide déjà via `qc.invalidateQueries()` — remplacer ce
  point par le déclenchement sync dans le hook pour éviter la double invalidation.

```ts
// useAi.ts — dans useApplyAction
onSuccess: async () => {
  await getSyncManager().syncAll().catch(() => undefined);
  void qc.invalidateQueries();
},
```

- [ ] **Step 2 : Vérifier** — `cd app && npm run typecheck && npm run lint` → OK.
- [ ] **Step 3 : Commit** — `git commit -am "feat(coach): rapatrie les actions IA via syncAll après apply"`

### Task 13.5 : Porte qualité M13
- [ ] `cd server && npm run typecheck && npm test` + `cd app && npm run typecheck && npm run lint && npm test` → vert.
- [ ] Dispatch **security-reviewer** (M13 = surface sensible : owner-scoping, PATCH/DELETE) + code-reviewer.
- [ ] Corriger les findings bloquants + commit.

---

## M14 — Rendu markdown propre dans le chat coach

### Task 14.1 : Parseur markdown pur

**Files:**
- Create: `app/src/features/ai/markdown.ts`
- Test: `app/src/features/ai/markdown.test.ts`

**Interfaces — Produces:**
```ts
export type Span = { t: 'text' | 'bold' | 'italic' | 'code'; s: string };
export type MdBlock =
  | { type: 'p'; spans: Span[] }
  | { type: 'h'; level: 1 | 2 | 3; spans: Span[] }
  | { type: 'ul'; items: Span[][] }
  | { type: 'ol'; items: Span[][] };
export function parseMarkdown(text: string): MdBlock[];
```

- [ ] **Step 1 : Tests qui échouent** :

```ts
import { describe, it, expect } from '@jest/globals';
import { parseMarkdown } from './markdown';

it('gras et italique inline', () => {
  expect(parseMarkdown('a **b** c')).toEqual([
    { type: 'p', spans: [{ t: 'text', s: 'a ' }, { t: 'bold', s: 'b' }, { t: 'text', s: ' c' }] },
  ]);
  expect(parseMarkdown('_i_')).toEqual([{ type: 'p', spans: [{ t: 'italic', s: 'i' }] }]);
});

it('code inline', () => {
  expect(parseMarkdown('`x`')).toEqual([{ type: 'p', spans: [{ t: 'code', s: 'x' }] }]);
});

it('titres', () => {
  expect(parseMarkdown('## Titre')).toEqual([{ type: 'h', level: 2, spans: [{ t: 'text', s: 'Titre' }] }]);
});

it('liste à puces et numérotée', () => {
  expect(parseMarkdown('- a\n- b')).toEqual([{ type: 'ul', items: [[{ t: 'text', s: 'a' }], [{ t: 'text', s: 'b' }]] }]);
  expect(parseMarkdown('1. a\n2. b')).toEqual([{ type: 'ol', items: [[{ t: 'text', s: 'a' }], [{ t: 'text', s: 'b' }]] }]);
});

it('marqueur non fermé → texte brut, jamais d’exception', () => {
  expect(parseMarkdown('a **b')).toEqual([{ type: 'p', spans: [{ t: 'text', s: 'a **b' }] }]);
});

it('chaîne vide → []', () => {
  expect(parseMarkdown('')).toEqual([]);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `cd app && npm test -- markdown` → FAIL.
- [ ] **Step 3 : Implémenter** : découper en lignes → regrouper en blocs (titre `^#{1,3}\s`, item de liste
  `^[-*]\s` ou `^\d+\.\s`, ligne vide = séparateur, sinon paragraphe — lignes contiguës jointes par espace).
  Pour l'inline, un scanner qui reconnaît dans l'ordre `` `code` ``, `**bold**`, `*italic*`/`_italic_` ;
  si un marqueur ouvrant n'a pas de fermant, l'émettre comme texte littéral (accumuler et ne jamais lever).
  Renvoyer `[]` sur chaîne vide/espaces.
- [ ] **Step 4 : Lancer, vérifier le succès** — `cd app && npm test -- markdown` → PASS.
- [ ] **Step 5 : Commit** — `git add app/src/features/ai/markdown.* && git commit -m "feat(coach): parseur markdown pur (gras/italique/code/listes/titres)"`

### Task 14.2 : Composant `<Markdown>` + câblage coach

**Files:**
- Create: `app/src/components/ui/Markdown.tsx`
- Modify: `app/app/(tabs)/coach.tsx`

**Interfaces — Consumes:** `parseMarkdown`, `Text` du thème, `useTheme`. **Produces:** `<Markdown>{content}</Markdown>`.

- [ ] **Step 1 : Implémenter `Markdown.tsx`** : `parseMarkdown(children)` → rendre chaque bloc. Spans :
  `text` → `Text variant="body"` ; `bold` → même Text avec `fontFamily` semibold/bold ; `italic` →
  `fontStyle:'italic'` ; `code` → fond `surfaceMuted`, police mono (`Platform.select` monospace),
  padding léger. Titres → `title3`/`headline`. Listes → puce `•` / index + span, espacement `spacing.xs`.
- [ ] **Step 2 : Câbler dans `coach.tsx`** : remplacer `<Text variant="body">{b.content}</Text>` par, pour
  les bulles **assistant uniquement**, `<Markdown>{b.content}</Markdown>` ; garder `Text` brut pour `role==='user'`.
- [ ] **Step 3 : Vérifier** — `cd app && npm run typecheck && npm run lint && npm test` → OK.
- [ ] **Step 4 : Commit** — `git add app/src/components/ui/Markdown.tsx app/app/\(tabs\)/coach.tsx && git commit -m "feat(coach): rendu markdown dans les bulles assistant"`

### Task 14.3 : Porte qualité M14
- [ ] Suite app verte + code-reviewer sur le diff → corrections + commit.

---

## M15 — Thème sélectionnable + refonte visuelle

### Task 15a.1 : Mode de thème persisté

**Files:**
- Modify: `app/src/theme/ThemeProvider.tsx`
- Create: `app/src/theme/themeMode.ts` (persistance) + `app/src/theme/themeMode.test.ts`

**Interfaces — Produces:**
- `themeMode.ts` : `type ThemeMode = 'system' | 'light' | 'dark'`; `loadThemeMode(): Promise<ThemeMode>`;
  `saveThemeMode(m: ThemeMode): Promise<void>` (via `expo-secure-store`, clé `theme_mode`, défaut `system`).
- `ThemeProvider` expose `mode: ThemeMode` et `setMode(m: ThemeMode): void` dans le contexte `Theme`.

- [ ] **Step 1 : Test qui échoue** (`themeMode.test.ts`) : mock d'`expo-secure-store` (get/set), round-trip
  `saveThemeMode('dark')` → `loadThemeMode()` renvoie `'dark'` ; valeur absente → `'system'` ; valeur
  invalide → `'system'`.
- [ ] **Step 2 : Lancer, échec** — `cd app && npm test -- themeMode` → FAIL.
- [ ] **Step 3 : Implémenter `themeMode.ts`** (getItemAsync/setItemAsync, garde sur les 3 valeurs).
- [ ] **Step 4 : Étendre `ThemeProvider`** : state `mode` (chargé via `loadThemeMode` dans un `useEffect`,
  défaut `'system'`), `scheme = mode === 'system' ? (system ?? 'light') : mode`. `setMode` met à jour le
  state + `saveThemeMode`. Ajouter `mode`/`setMode` au type `Theme` et à la valeur mémoïsée (deps `[scheme, mode]`).
- [ ] **Step 5 : Lancer, succès** — `cd app && npm test -- themeMode` + `npm run typecheck` → OK.
- [ ] **Step 6 : Commit** — `git add app/src/theme && git commit -m "feat(thème): mode système/clair/sombre persisté"`

### Task 15a.2 : Sélecteur de thème dans Réglages

**Files:**
- Modify: `app/app/(tabs)/settings.tsx`

- [ ] **Step 1 : Ajouter une `Card` « Apparence »** avec 3 boutons segmentés (Système / Clair / Sombre)
  liés à `theme.mode` / `theme.setMode` (mettre en surbrillance l'actif via `accent`/`accentMuted`).
  Utiliser `SegmentedControl` si Task 15b.1 est déjà faite ; sinon 3 `Button` toggles.
- [ ] **Step 2 : Vérifier** — `cd app && npm run typecheck && npm run lint` → OK.
- [ ] **Step 3 : Commit** — `git commit -am "feat(thème): sélecteur d'apparence dans Réglages"`

### Task 15b.1 : Primitives UI partagés

**Files:**
- Create: `app/src/components/ui/SegmentedControl.tsx`, `Badge.tsx`, `IconButton.tsx`, `ListRow.tsx`, `EmptyState.tsx`
- Test: `app/src/components/ui/ui.test.tsx` (smoke render de chaque primitive)

**Interfaces — Produces:**
- `SegmentedControl<T>({ options: {label:string; value:T}[]; value:T; onChange:(v:T)=>void })`
- `Badge({ label:string; tone?: 'neutral'|'accent'|'success'|'warning'|'danger' })`
- `IconButton({ name:IoniconName; onPress; accessibilityLabel; tone? })`
- `ListRow({ title; subtitle?; right?; onPress? })`
- `EmptyState({ icon; title; subtitle?; action? })`

- [ ] **Step 1 : Smoke tests** — rendre chaque primitive via `@testing-library/react-native` si présent,
  sinon un simple appel de fonction/rendu sans crash (suivre la convention de test des composants existants).
- [ ] **Step 2 : Implémenter** chaque primitive avec le `useTheme()` (tokens), `Pressable` pour les états
  pressés (opacité ~0.6). Réutiliser `Text` du thème.
- [ ] **Step 3 : Refactor** : remplacer les toggles de type de salle (`/gym-edit`), le choix Système/
  Clair/Sombre (Réglages) et les états vides répétés (Séances, Journal, Coach) par ces primitives.
- [ ] **Step 4 : Vérifier** — `cd app && npm run typecheck && npm run lint && npm test` → OK.
- [ ] **Step 5 : Commit** — `git add app/src/components/ui && git commit -m "feat(ui): primitives partagés (SegmentedControl, Badge, IconButton, ListRow, EmptyState)"`

### Task 15b.2 : Refonte des tokens + kit

**Files:**
- Modify: `app/src/theme/tokens.ts`, `app/src/components/ui/{Button,Card,Field,Screen,Text,ProgressBar}.tsx`

- [ ] **Step 0 : Charger le skill frontend-design** avant toute décision visuelle.
- [ ] **Step 1 : Retravailler `tokens.ts`** (source unique) : affiner palettes light/dark (fonds neutres,
  usage accent), ombres `sm/md/lg`, éventuels ajustements de l'échelle typo (rester dans Inter). Ne PAS
  casser les clés de `Palette` consommées ailleurs (ajouter, ne pas retirer sans migrer les usages).
- [ ] **Step 2 : Polir le kit** : états pressés (`Pressable`), rayons/ombres cohérents, `Card` en couches,
  `Button` variantes homogènes. Micro-transitions sobres via `react-native-reanimated` (déjà présent) si utile.
- [ ] **Step 3 : Vérifier** — `cd app && npm run typecheck && npm run lint && npm test` → OK. Vérifier
  visuellement clair + sombre (dev client si dispo, sinon revue statique).
- [ ] **Step 4 : Commit** — `git commit -am "feat(ui): refonte tokens + kit (couleur, typo, élévations, interactions)"`

### Task 15b.3 : Polish par écran
- [ ] Passe ciblée sur Séances, Journal, Coach, Réglages, Dashboard, `/gyms`, `/gym-edit` : espacements,
  états vides (`EmptyState`), lignes (`ListRow`), badges — cohérence avec le kit refondu. Commits petits par écran.

### Task 15.Q : Porte qualité M15
- [ ] Suite app verte + code-reviewer (large diff visuel) → corrections + commit.

---

## Intégration finale
- [ ] Sur `feat/gyms-and-polish` : `node .claude/hooks/gate.mjs --merge` (typecheck + lint + tests app & serveur).
- [ ] code-reviewer + security-reviewer sur le diff complet de la branche.
- [ ] Mettre à jour `docs/PROGRESS.md` (M12→M15 : faits, décisions, tests). Mettre à jour le User-Agent
  OFF ? (hors périmètre — ne pas toucher.)
- [ ] Merge sur `main` seulement si vert.

## Self-review (couverture spec)
- Salles CRUD manuel → M12 (12.1–12.4). ✓
- IA modifie les salles (create/update/delete + équipement, owner-scoped) → M13 (13.1–13.4). ✓
- Markdown propre coach → M14. ✓
- Thème choisissable clair/sombre/système → M15a. ✓
- Refonte visuelle → M15b. ✓
- Sync après action IA → 13.4. ✓ · Cascade soft-delete → 12.1 + 13.2. ✓ · Invariant `user` → 13.2 (testé). ✓
