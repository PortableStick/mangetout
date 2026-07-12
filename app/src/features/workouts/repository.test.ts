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

import {
  addEquipment,
  addGym,
  createWorkout,
  deleteExercise,
  deleteGym,
  deleteSet,
  deleteWorkout,
  duplicateWorkout,
  listEquipment,
  listSets,
  listWorkouts,
  removeEquipment,
  updateEquipment,
  updateExercise,
  updateGym,
  updateSet,
  updateWorkout,
} from './repository';

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

  it('updateEquipment enfile un upsert equipment avec l’id fourni et le metricSet', async () => {
    await updateEquipment({
      id: 'e5',
      gymId: 'g1',
      name: 'Rameur',
      category: 'cardio',
      muscleGroups: ['cardio'],
      metricSet: 'cardio_row',
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
        metricSet: 'cardio_row',
        user: 'u1',
        deleted: false,
      })
    );
  });

  it('addEquipment enfile un upsert equipment avec le metricSet fourni', async () => {
    mockNewId.mockReturnValue('e6');

    await addEquipment({
      gymId: 'g1',
      name: 'Presse à cuisses',
      category: 'machine',
      muscleGroups: ['legs'],
      metricSet: 'strength',
      userId: 'u1',
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'equipment',
      'upsert',
      expect.objectContaining({
        id: 'e6',
        gym: 'g1',
        name: 'Presse à cuisses',
        category: 'machine',
        muscleGroups: ['legs'],
        metricSet: 'strength',
        user: 'u1',
        deleted: false,
      })
    );
  });

  it('listEquipment mappe un équipement legacy sans metricSet vers le défaut strength', () => {
    mockAll.mockReturnValue([
      { id: 'e7', payload: { gym: 'g1', name: 'Vieux banc', category: 'free_weight', muscleGroups: [] } },
    ]);

    const [e] = listEquipment('g1');

    expect(e).toMatchObject({ id: 'e7', name: 'Vieux banc', metricSet: 'strength' });
  });

  it('listEquipment préserve le metricSet persisté', () => {
    mockAll.mockReturnValue([
      {
        id: 'e8',
        payload: { gym: 'g1', name: 'Rameur', category: 'cardio', muscleGroups: ['cardio'], metricSet: 'cardio_row' },
      },
    ]);

    const [e] = listEquipment('g1');

    expect(e).toMatchObject({ id: 'e8', metricSet: 'cardio_row' });
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

describe('repository — statut/provenance/datetime + CRUD séances', () => {
  beforeEach(() => {
    mockEnqueue.mockReset();
    mockAll.mockReset();
    mockNewId.mockReset();
  });

  it('mapping legacy: workout sans status/source/at → done/manual/at dérivé de date', () => {
    mockAll.mockReturnValue([{ id: 'w0', payload: { date: '2026-01-01', gym: 'g1' } }]);

    const [w] = listWorkouts();

    expect(w).toMatchObject({
      id: 'w0',
      date: '2026-01-01',
      gym: 'g1',
      status: 'done',
      source: 'manual',
      at: '2026-01-01T12:00:00.000Z',
    });
  });

  it('updateWorkout enfile un upsert workouts avec status/source (merge du record existant)', async () => {
    mockAll.mockReturnValue([
      {
        id: 'w1',
        payload: {
          at: '2026-01-01T12:00:00.000Z',
          date: '2026-01-01',
          gym: 'g1',
          notes: 'RAS',
          status: 'done',
          source: 'manual',
        },
      },
    ]);

    await updateWorkout({ id: 'w1', status: 'planned', userId: 'u' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'workouts',
      'upsert',
      expect.objectContaining({ id: 'w1', status: 'planned', gym: 'g1', user: 'u', deleted: false })
    );
  });

  it('deleteWorkout cascade en soft-delete sur exercices + séries', async () => {
    mockAll
      .mockReturnValueOnce([{ id: 'e1', payload: { workout: 'w1', name: 'Squat', position: 0 } }]) // listExercises(w1)
      .mockReturnValueOnce([
        { id: 's1', payload: { exercise: 'e1', reps: 10, weight_kg: 50, position: 0 } },
      ]); // listSets(e1)

    await deleteWorkout({ id: 'w1', userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'workouts',
      'upsert',
      expect.objectContaining({ id: 'w1', user: 'u1', deleted: true })
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      'exercises',
      'upsert',
      expect.objectContaining({ id: 'e1', user: 'u1', deleted: true })
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      'sets',
      'upsert',
      expect.objectContaining({ id: 's1', user: 'u1', deleted: true })
    );
  });

  it('updateExercise enfile un upsert exercises avec merge du record existant', async () => {
    mockAll.mockReturnValue([
      { id: 'e1', payload: { workout: 'w1', name: 'Squat', position: 0, equipment: 'eq1' } },
    ]);

    await updateExercise({ id: 'e1', workout: 'w1', position: 2, userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'exercises',
      'upsert',
      expect.objectContaining({
        id: 'e1',
        workout: 'w1',
        name: 'Squat',
        equipment: 'eq1',
        position: 2,
        user: 'u1',
        deleted: false,
      })
    );
  });

  it('updateExercise préserve `source` du record existant quand non fourni (pas de perte de provenance)', async () => {
    mockAll.mockReturnValue([
      {
        id: 'e1',
        payload: { workout: 'w1', name: 'Squat', position: 0, equipment: 'eq1', source: 'generated' },
      },
    ]);

    await updateExercise({ id: 'e1', workout: 'w1', position: 2, userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'exercises',
      'upsert',
      expect.objectContaining({
        id: 'e1',
        workout: 'w1',
        position: 2,
        source: 'generated',
        user: 'u1',
        deleted: false,
      })
    );
  });

  it('deleteExercise cascade en soft-delete sur ses séries', async () => {
    mockAll.mockReturnValueOnce([
      { id: 's1', payload: { exercise: 'e1', reps: 10, weight_kg: 50, position: 0 } },
    ]); // listSets(e1)

    await deleteExercise({ id: 'e1', userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'exercises',
      'upsert',
      expect.objectContaining({ id: 'e1', user: 'u1', deleted: true })
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      'sets',
      'upsert',
      expect.objectContaining({ id: 's1', user: 'u1', deleted: true })
    );
  });

  it('updateSet enfile un upsert sets avec les champs fournis mergés au record existant (legacy → fields)', async () => {
    mockAll.mockReturnValue([
      { id: 's1', payload: { exercise: 'e1', reps: 10, weight_kg: 50, position: 0 } },
    ]);

    await updateSet({ id: 's1', exercise: 'e1', fields: { reps: 12 }, userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'sets',
      'upsert',
      expect.objectContaining({
        id: 's1',
        exercise: 'e1',
        metricSet: 'strength',
        fields: { reps: 12, weight_kg: 50 },
        position: 0,
        user: 'u1',
        deleted: false,
      })
    );
  });

  it('updateSet accepte un `metricSet` explicite et le persiste', async () => {
    mockAll.mockReturnValue([
      {
        id: 's1',
        payload: { exercise: 'e1', metricSet: 'cardio_row', fields: { duration_s: 1200 }, position: 0 },
      },
    ]);

    await updateSet({
      id: 's1',
      exercise: 'e1',
      fields: { distance_m: 5000 },
      metricSet: 'cardio_row',
      userId: 'u1',
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'sets',
      'upsert',
      expect.objectContaining({
        id: 's1',
        exercise: 'e1',
        metricSet: 'cardio_row',
        fields: { duration_s: 1200, distance_m: 5000 },
        position: 0,
        user: 'u1',
        deleted: false,
      })
    );
  });

  it('listSets mappe un enregistrement legacy `{reps, weight_kg}` (sans `fields`) vers metricSet strength', () => {
    mockAll.mockReturnValue([
      { id: 's1', payload: { exercise: 'e1', reps: 10, weight_kg: 80, position: 0 } },
    ]);

    const [s] = listSets('e1');

    expect(s).toMatchObject({
      id: 's1',
      exercise: 'e1',
      metricSet: 'strength',
      fields: { reps: 10, weight_kg: 80 },
    });
  });

  it('listSets préserve `metricSet` + `fields` déjà typés', () => {
    mockAll.mockReturnValue([
      {
        id: 's1',
        payload: { exercise: 'e1', metricSet: 'cardio_row', fields: { duration_s: 1200, distance_m: 5000 }, position: 0 },
      },
    ]);

    const [s] = listSets('e1');

    expect(s).toMatchObject({
      id: 's1',
      metricSet: 'cardio_row',
      fields: { duration_s: 1200, distance_m: 5000 },
    });
  });

  it('deleteSet enfile un soft-delete sets', async () => {
    await deleteSet({ id: 's1', userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'sets',
      'upsert',
      expect.objectContaining({ id: 's1', user: 'u1', deleted: true })
    );
  });

  it('createWorkout persiste at/date/status/source fournis et propage source aux exercices', async () => {
    mockNewId.mockReturnValueOnce('w1').mockReturnValueOnce('e1').mockReturnValueOnce('s1');

    const id = await createWorkout({
      gymId: 'g1',
      at: '2026-01-01T09:30:00.000Z',
      status: 'planned',
      source: 'generated',
      exercises: [
        { name: 'Squat', equipmentId: 'eq1', sets: [{ metricSet: 'strength', fields: { reps: 10, weight_kg: 50 } }] },
      ],
      userId: 'u1',
    });

    expect(id).toBe('w1');
    expect(mockEnqueue).toHaveBeenCalledWith(
      'workouts',
      'upsert',
      expect.objectContaining({
        id: 'w1',
        at: '2026-01-01T09:30:00.000Z',
        date: '2026-01-01',
        gym: 'g1',
        status: 'planned',
        source: 'generated',
        user: 'u1',
        deleted: false,
      })
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      'exercises',
      'upsert',
      expect.objectContaining({ id: 'e1', workout: 'w1', name: 'Squat', source: 'generated', user: 'u1' })
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      'sets',
      'upsert',
      expect.objectContaining({
        id: 's1',
        exercise: 'e1',
        metricSet: 'strength',
        fields: { reps: 10, weight_kg: 50 },
        user: 'u1',
      })
    );
  });

  it('createWorkout avec une série `metric_set` non-strength (cardio) upserte metricSet + fields', async () => {
    mockNewId.mockReturnValueOnce('w9').mockReturnValueOnce('e9').mockReturnValueOnce('s9');

    await createWorkout({
      gymId: 'g1',
      exercises: [
        {
          name: 'Rameur',
          equipmentId: 'eq-rameur',
          sets: [{ metricSet: 'cardio_row', fields: { duration_s: 1200, distance_m: 5000 } }],
        },
      ],
      userId: 'u1',
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'sets',
      'upsert',
      expect.objectContaining({
        id: 's9',
        exercise: 'e9',
        metricSet: 'cardio_row',
        fields: { duration_s: 1200, distance_m: 5000 },
        user: 'u1',
      })
    );
  });

  it('createWorkout sans at/status/source applique les défauts (maintenant, done, manual)', async () => {
    mockNewId.mockReturnValueOnce('w2');

    const id = await createWorkout({ gymId: 'g1', exercises: [], userId: 'u1' });

    expect(id).toBe('w2');
    const [, , payload] = mockEnqueue.mock.calls[0]! as [string, string, Record<string, unknown>];
    expect(payload.status).toBe('done');
    expect(payload.source).toBe('manual');
    expect(typeof payload.at).toBe('string');
    expect(payload.date).toBe((payload.at as string).slice(0, 10));
  });

  it('createWorkout avec `at` dans le futur applique le défaut de statut `planned`', async () => {
    mockNewId.mockReturnValueOnce('w3');
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await createWorkout({ gymId: 'g1', at: future, exercises: [], userId: 'u1' });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'workouts',
      'upsert',
      expect.objectContaining({ id: 'w3', at: future, status: 'planned', source: 'manual' })
    );
  });

  it('duplicateWorkout crée un nouveau workout planned et copie exos/séries avec nouveaux ids', async () => {
    mockAll
      .mockReturnValueOnce([
        {
          id: 'w1',
          payload: {
            at: '2026-01-01T12:00:00.000Z',
            date: '2026-01-01',
            gym: 'g1',
            notes: 'RAS',
            status: 'done',
            source: 'generated',
          },
        },
      ]) // listWorkouts (pour retrouver w1)
      .mockReturnValueOnce([
        { id: 'e1', payload: { workout: 'w1', name: 'Squat', position: 0, equipment: 'eq1' } },
      ]) // listExercises(w1)
      .mockReturnValueOnce([
        { id: 's1', payload: { exercise: 'e1', reps: 10, weight_kg: 50, position: 0 } },
      ]); // listSets(e1)

    mockNewId.mockReturnValueOnce('w2').mockReturnValueOnce('e2').mockReturnValueOnce('s2');

    const newWorkoutId = await duplicateWorkout({
      id: 'w1',
      at: '2026-02-01T09:00:00.000Z',
      status: 'planned',
      userId: 'u1',
    });

    expect(newWorkoutId).toBe('w2');
    expect(mockEnqueue).toHaveBeenCalledWith(
      'workouts',
      'upsert',
      expect.objectContaining({
        id: 'w2',
        status: 'planned',
        source: 'generated',
        gym: 'g1',
        user: 'u1',
        deleted: false,
      })
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      'exercises',
      'upsert',
      expect.objectContaining({ id: 'e2', workout: 'w2', name: 'Squat', user: 'u1' })
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      'sets',
      'upsert',
      expect.objectContaining({
        id: 's2',
        exercise: 'e2',
        metricSet: 'strength',
        fields: { reps: 10, weight_kg: 50 },
        user: 'u1',
      })
    );
  });
});
