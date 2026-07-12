import { describe, expect, it, vi } from 'vitest';

import { applyAction, buildRecord } from './execute.ts';
import { proposalSummary, runCoach } from './engine.ts';
import { isAction, TOOLS, validateToolCall } from './tools.ts';

const NOW = 1_700_000_000_000;
const ctx = { userId: 'realUser', token: 'tok', fetchImpl: undefined as unknown as typeof fetch };
// Ids au format newId() (app/src/lib/id.ts) : exactement 15 caractères [a-z0-9].
const GYM_ID = 'gym123456789012';
const EQ_ID = 'eq1234567890123';

describe('coach tools', () => {
  it('classe lecture vs action', () => {
    expect(isAction('get_goals')).toBe(false);
    expect(isAction('add_food_entry')).toBe(true);
  });

  it('valide les arguments et rejette l’inconnu', () => {
    expect(validateToolCall('inconnu', {}).ok).toBe(false);
    expect(
      validateToolCall('add_weight_entry', { weight_kg: 78 }).ok
    ).toBe(true);
    expect(validateToolCall('add_weight_entry', { weight_kg: 5 }).ok).toBe(false); // hors bornes
  });
});

describe('owner-scoping', () => {
  it('buildRecord force user = utilisateur vérifié (ignore un user injecté par le modèle)', () => {
    const rec = buildRecord(
      'add_food_entry',
      { user: 'attacker', name: 'x', quantity_g: 100, mealType: 'lunch', kcal: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
      'realUser',
      NOW
    );
    expect(rec.user).toBe('realUser');
    expect(rec.estimated).toBe(true);
  });
});

describe('applyAction', () => {
  it('rejette une action inconnue', async () => {
    const res = await applyAction('nope', {}, ctx, NOW);
    expect(res.ok).toBe(false);
  });

  it('rejette des arguments invalides sans appeler PocketBase', async () => {
    const fetchImpl = vi.fn();
    const res = await applyAction('add_weight_entry', { weight_kg: 3 }, { ...ctx, fetchImpl: fetchImpl as unknown as typeof fetch }, NOW);
    expect(res.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('écrit un enregistrement owner-scoped en cas de succès', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'rec1' }) })) as unknown as typeof fetch;
    const res = await applyAction('add_weight_entry', { weight_kg: 78 }, { ...ctx, fetchImpl }, NOW);
    expect(res).toEqual({ ok: true, id: 'rec1' });
    const body = JSON.parse((fetchImpl as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0]![1].body);
    expect(body.user).toBe('realUser');
    expect(body.weight_kg).toBe(78);
  });
});

describe('outils salles/équipement', () => {
  it('add_gym exige nom + type valides', () => {
    expect(validateToolCall('add_gym', { name: 'Home', gymType: 'home' }).ok).toBe(true);
    expect(validateToolCall('add_gym', { name: '', gymType: 'home' }).ok).toBe(false);
    expect(validateToolCall('add_gym', { name: 'X', gymType: 'gym' }).ok).toBe(false);
  });

  it('update_gym exige un id + au moins un champ', () => {
    expect(validateToolCall('update_gym', { id: GYM_ID, name: 'New' }).ok).toBe(true);
    expect(validateToolCall('update_gym', { id: GYM_ID }).ok).toBe(false);
  });

  it('delete_gym / remove_equipment exigent un id', () => {
    expect(validateToolCall('delete_gym', { id: GYM_ID }).ok).toBe(true);
    expect(validateToolCall('delete_gym', {}).ok).toBe(false);
    expect(validateToolCall('remove_equipment', { id: EQ_ID }).ok).toBe(true);
  });

  it('add_equipment valide catégorie + gymId', () => {
    expect(
      validateToolCall('add_equipment', { gymId: GYM_ID, name: 'Presse', category: 'machine', muscleGroups: ['legs'] }).ok
    ).toBe(true);
    expect(
      validateToolCall('add_equipment', { gymId: GYM_ID, name: 'X', category: 'invalid', muscleGroups: [] }).ok
    ).toBe(false);
  });

  it('rejette un id malformé (anti-injection de filtre PocketBase)', () => {
    const injected = 'x" || user!=""';
    expect(validateToolCall('delete_gym', { id: injected }).ok).toBe(false);
    expect(validateToolCall('delete_gym', { id: 'abc' }).ok).toBe(false); // trop court
    expect(validateToolCall('update_gym', { id: injected, name: 'New' }).ok).toBe(false);
    expect(validateToolCall('remove_equipment', { id: injected }).ok).toBe(false);
    expect(validateToolCall('remove_equipment', { id: 'abc' }).ok).toBe(false);
    expect(
      validateToolCall('add_equipment', { gymId: injected, name: 'X', category: 'machine', muscleGroups: [] }).ok
    ).toBe(false);
    // un id valide de 15 caractères [a-z0-9] reste accepté
    expect(validateToolCall('delete_gym', { id: GYM_ID }).ok).toBe(true);
  });

  it('les nouveaux outils salles sont des actions avec op', () => {
    for (const t of ['add_gym', 'update_gym', 'delete_gym', 'add_equipment', 'remove_equipment']) {
      expect(TOOLS[t]?.kind).toBe('action');
      expect(['create', 'update', 'delete']).toContain(TOOLS[t]?.op);
    }
  });

  it('proposalSummary couvre les actions salles', () => {
    expect(proposalSummary('add_gym', { name: 'Home', gymType: 'home' })).toContain('Home');
    expect(proposalSummary('delete_gym', { id: 'x' })).toMatch(/[Ss]upprimer/);
    expect(proposalSummary('add_equipment', { name: 'Presse' })).toContain('Presse');
  });
});

describe('applyAction — salles/équipement (create/update/delete owner-scoped)', () => {
  it('add_gym : POST create, body.user forcé (ignore un user injecté par le modèle)', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'gym1' }) })) as unknown as typeof fetch;
    const res = await applyAction(
      'add_gym',
      { name: 'Basic-Fit', gymType: 'chain', user: 'HACKER' },
      { ...ctx, fetchImpl },
      NOW
    );
    expect(res).toEqual({ ok: true, id: 'gym1' });
    const calls = (fetchImpl as unknown as { mock: { calls: [string, { method: string; body: string }][] } }).mock.calls;
    expect(calls[0]![0]).toContain('/collections/gyms/records');
    expect(calls[0]![1].method).toBe('POST');
    const body = JSON.parse(calls[0]![1].body);
    expect(body.user).toBe('realUser');
    expect(body.name).toBe('Basic-Fit');
  });

  it('add_equipment : POST create vers equipment, body.gym = gymId', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'eq1' }) })) as unknown as typeof fetch;
    const res = await applyAction(
      'add_equipment',
      { gymId: GYM_ID, name: 'Presse', category: 'machine', muscleGroups: ['legs'] },
      { ...ctx, fetchImpl },
      NOW
    );
    expect(res).toEqual({ ok: true, id: 'eq1' });
    const calls = (fetchImpl as unknown as { mock: { calls: [string, { method: string; body: string }][] } }).mock.calls;
    expect(calls[0]![0]).toContain('/collections/equipment/records');
    expect(calls[0]![1].method).toBe('POST');
    const body = JSON.parse(calls[0]![1].body);
    expect(body.user).toBe('realUser');
    expect(body.gym).toBe(GYM_ID);
  });

  it('update_gym : PATCH sans champ user, avec les champs fournis', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: GYM_ID }) })) as unknown as typeof fetch;
    const res = await applyAction('update_gym', { id: GYM_ID, name: 'Nouveau nom' }, { ...ctx, fetchImpl }, NOW);
    expect(res).toEqual({ ok: true, id: GYM_ID });
    const calls = (fetchImpl as unknown as { mock: { calls: [string, { method: string; body: string }][] } }).mock.calls;
    expect(calls[0]![0]).toContain(`/collections/gyms/records/${GYM_ID}`);
    expect(calls[0]![1].method).toBe('PATCH');
    const body = JSON.parse(calls[0]![1].body);
    expect(body.user).toBeUndefined();
    expect(body.name).toBe('Nouveau nom');
  });

  it('delete_gym : liste l’équipement de la salle puis soft-delete équipements + salle', async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      if (init?.method === 'GET' || init === undefined) {
        return { ok: true, status: 200, json: async () => ({ items: [{ id: 'eq1' }, { id: 'eq2' }] }) };
      }
      return { ok: true, status: 200, json: async () => ({ id: GYM_ID }) };
    }) as unknown as typeof fetch;
    const res = await applyAction('delete_gym', { id: GYM_ID }, { ...ctx, fetchImpl }, NOW);
    expect(res).toEqual({ ok: true, id: GYM_ID });
    // 1 GET (liste équipement) + 2 PATCH équipements + 1 PATCH salle
    expect(calls.length).toBe(4);
    expect(calls[0]![0]).toContain('/collections/equipment/records');
    const patchCalls = calls.slice(1);
    expect(patchCalls[0]![0]).toContain('/collections/equipment/records/eq1');
    expect(patchCalls[1]![0]).toContain('/collections/equipment/records/eq2');
    expect(patchCalls[2]![0]).toContain(`/collections/gyms/records/${GYM_ID}`);
    for (const [, init] of patchCalls) {
      expect(init?.method).toBe('PATCH');
      const body = JSON.parse(init!.body as string);
      expect(body.deleted).toBe(true);
      expect(body.user).toBeUndefined();
    }
  });

  it('remove_equipment : PATCH deleted:true sans champ user', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: EQ_ID }) })) as unknown as typeof fetch;
    const res = await applyAction('remove_equipment', { id: EQ_ID }, { ...ctx, fetchImpl }, NOW);
    expect(res).toEqual({ ok: true, id: EQ_ID });
    const call = (fetchImpl as unknown as { mock: { calls: [string, { method: string; body: string }][] } }).mock.calls[0]!;
    expect(call[0]).toContain(`/collections/equipment/records/${EQ_ID}`);
    expect(call[1].method).toBe('PATCH');
    const body = JSON.parse(call[1].body);
    expect(body.deleted).toBe(true);
    expect(body.user).toBeUndefined();
  });

  it('add_food_entry reste en POST create, non régressé', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'fe1' }) })) as unknown as typeof fetch;
    const res = await applyAction(
      'add_food_entry',
      { name: 'Pomme', quantity_g: 100, mealType: 'lunch', kcal: 52, protein_g: 0, carbs_g: 14, fat_g: 0 },
      { ...ctx, fetchImpl },
      NOW
    );
    expect(res).toEqual({ ok: true, id: 'fe1' });
    const call = (fetchImpl as unknown as { mock: { calls: [string, { method: string; body: string }][] } }).mock.calls[0]!;
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body);
    expect(body.user).toBe('realUser');
  });
});

describe('runCoach', () => {
  const chat = (message: object) =>
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message }] }) })) as unknown as typeof fetch;

  it('une action → proposition, JAMAIS exécutée', async () => {
    const fetchImpl = chat({
      role: 'assistant',
      content: '',
      tool_calls: [
        { id: 't1', function: { name: 'add_weight_entry', arguments: '{"weight_kg":80}' } },
      ],
    });
    const res = await runCoach([{ role: 'user', content: 'note mon poids 80' }], ctx, NOW, fetchImpl);
    expect(res.type).toBe('proposal');
    if (res.type === 'proposal') {
      expect(res.tool).toBe('add_weight_entry');
      expect(res.summary).toContain('80');
    }
  });

  it('un message simple est renvoyé tel quel', async () => {
    const fetchImpl = chat({ role: 'assistant', content: 'Salut !' });
    const res = await runCoach([{ role: 'user', content: 'coucou' }], ctx, NOW, fetchImpl);
    expect(res).toEqual({ type: 'message', text: 'Salut !' });
  });
});
