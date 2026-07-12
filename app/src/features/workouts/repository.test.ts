import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockEnqueue = jest.fn<(...a: unknown[]) => Promise<void>>();
jest.mock('@/sync/manager', () => ({
  getSyncManager: () => ({ enqueue: (...a: unknown[]) => mockEnqueue(...(a as [])) }),
}));

const mockAll = jest.fn<() => unknown[]>();
jest.mock('@/db/client', () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ all: () => mockAll() }) }) }) },
}));

const mockNewId = jest.fn<() => string>();
jest.mock('@/lib/id', () => ({ newId: () => mockNewId() }));

import { addGym, deleteGym, removeEquipment, updateEquipment, updateGym } from './repository';

describe('repository — CRUD salles & équipement', () => {
  beforeEach(() => {
    mockEnqueue.mockReset();
    mockAll.mockReset();
    mockNewId.mockReset();
  });

  it('addGym enfile un upsert gyms et retourne l’id créé', async () => {
    mockNewId.mockReturnValue('g1');
    const id = await addGym({ name: 'Basic-Fit Rennes', gymType: 'chain', userId: 'u1' });

    expect(id).toBe('g1');
    expect(mockEnqueue).toHaveBeenCalledWith(
      'gyms',
      'upsert',
      expect.objectContaining({
        id: 'g1',
        name: 'Basic-Fit Rennes',
        gymType: 'chain',
        user: 'u1',
        deleted: false,
      })
    );
    const payload = mockEnqueue.mock.calls[0]![2] as { clientUpdatedAt: number };
    expect(typeof payload.clientUpdatedAt).toBe('number');
  });

  it('updateGym enfile un upsert gyms avec l’id fourni', async () => {
    await updateGym({ id: 'g2', name: 'Salle perso', gymType: 'home', userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'gyms',
      'upsert',
      expect.objectContaining({
        id: 'g2',
        name: 'Salle perso',
        gymType: 'home',
        user: 'u1',
        deleted: false,
      })
    );
  });

  it('deleteGym soft-delete la salle ET cascade sur son équipement', async () => {
    mockAll.mockReturnValue([
      {
        id: 'e1',
        payload: { gym: 'g3', name: 'Presse à cuisses', category: 'machine', muscleGroups: ['legs'] },
      },
      {
        id: 'e2',
        payload: { gym: 'other-gym', name: 'Rameur', category: 'cardio', muscleGroups: ['cardio'] },
      },
    ]);

    await deleteGym({ id: 'g3', userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'gyms',
      'upsert',
      expect.objectContaining({ id: 'g3', user: 'u1', deleted: true })
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      'equipment',
      'upsert',
      expect.objectContaining({
        id: 'e1',
        gym: 'g3',
        name: 'Presse à cuisses',
        category: 'machine',
        muscleGroups: ['legs'],
        user: 'u1',
        deleted: true,
      })
    );
    expect(mockEnqueue).not.toHaveBeenCalledWith(
      'equipment',
      'upsert',
      expect.objectContaining({ id: 'e2' })
    );
  });

  it('updateEquipment enfile un upsert equipment avec l’id fourni', async () => {
    await updateEquipment({
      id: 'e5',
      gymId: 'g1',
      name: 'Rameur',
      category: 'cardio',
      muscleGroups: ['cardio'],
      userId: 'u1',
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'equipment',
      'upsert',
      expect.objectContaining({
        id: 'e5',
        gym: 'g1',
        name: 'Rameur',
        category: 'cardio',
        muscleGroups: ['cardio'],
        user: 'u1',
        deleted: false,
      })
    );
  });

  it('removeEquipment enfile un soft-delete equipment', async () => {
    await removeEquipment({ id: 'e9', userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'equipment',
      'upsert',
      expect.objectContaining({ id: 'e9', user: 'u1', deleted: true })
    );
  });
});
