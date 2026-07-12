import { describe, expect, it, vi } from 'vitest';

import { applyAction, buildRecord } from './execute.ts';
import { runCoach } from './engine.ts';
import { isAction, TOOLS, validateToolCall } from './tools.ts';

const NOW = 1_700_000_000_000;
const ctx = { userId: 'realUser', token: 'tok', fetchImpl: undefined as unknown as typeof fetch };

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
    expect(validateToolCall('update_gym', { id: 'g1', name: 'New' }).ok).toBe(true);
    expect(validateToolCall('update_gym', { id: 'g1' }).ok).toBe(false);
  });

  it('delete_gym / remove_equipment exigent un id', () => {
    expect(validateToolCall('delete_gym', { id: 'g1' }).ok).toBe(true);
    expect(validateToolCall('delete_gym', {}).ok).toBe(false);
    expect(validateToolCall('remove_equipment', { id: 'e1' }).ok).toBe(true);
  });

  it('add_equipment valide catégorie + gymId', () => {
    expect(
      validateToolCall('add_equipment', { gymId: 'g1', name: 'Presse', category: 'machine', muscleGroups: ['legs'] }).ok
    ).toBe(true);
    expect(
      validateToolCall('add_equipment', { gymId: 'g1', name: 'X', category: 'invalid', muscleGroups: [] }).ok
    ).toBe(false);
  });

  it('les nouveaux outils salles sont des actions avec op', () => {
    for (const t of ['add_gym', 'update_gym', 'delete_gym', 'add_equipment', 'remove_equipment']) {
      expect(TOOLS[t]?.kind).toBe('action');
      expect(['create', 'update', 'delete']).toContain(TOOLS[t]?.op);
    }
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
