import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { syncRecords } from '@/db/schema';
import { newId } from '@/lib/id';
import { getSyncManager } from '@/sync/manager';

import { BASIC_FIT_EQUIPMENT, DEFAULT_GYMS } from './equipmentSeed';
import type {
  Equipment,
  EquipmentCategory,
  Exercise,
  ExerciseSet,
  Gym,
  GymType,
  MuscleGroup,
  Workout,
  WorkoutStatus,
  WorkoutSource,
} from './types';

function rows(collection: string) {
  return db
    .select()
    .from(syncRecords)
    .where(and(eq(syncRecords.collection, collection), eq(syncRecords.deleted, false)))
    .all();
}

export function listGyms(): Gym[] {
  return rows('gyms').map((r) => {
    const p = r.payload ?? {};
    return { id: r.id, name: String(p.name ?? ''), gymType: (p.gymType as Gym['gymType']) ?? 'home' };
  });
}

export function listEquipment(gymId: string): Equipment[] {
  return rows('equipment')
    .map((r) => ({ id: r.id, ...(r.payload ?? {}) }) as unknown as Equipment)
    .filter((e) => e.gym === gymId);
}

/** Crée les 2 salles par défaut + seed l'équipement Basic-Fit. Idempotent. */
export async function seedDefaultGyms(userId: string): Promise<void> {
  if (listGyms().length > 0) return;
  const mgr = getSyncManager();
  const now = Date.now();
  const base = { user: userId, clientUpdatedAt: now, deleted: false };

  const basicFitId = newId();
  await mgr.enqueue('gyms', 'upsert', { id: basicFitId, ...DEFAULT_GYMS.basicFit, ...base });
  const homeId = newId();
  await mgr.enqueue('gyms', 'upsert', { id: homeId, ...DEFAULT_GYMS.home, ...base });

  for (const e of BASIC_FIT_EQUIPMENT) {
    await mgr.enqueue('equipment', 'upsert', {
      id: newId(),
      gym: basicFitId,
      name: e.name,
      category: e.category,
      muscleGroups: e.muscleGroups,
      ...base,
    });
  }
}

export async function addEquipment(input: {
  gymId: string;
  name: string;
  category: Equipment['category'];
  muscleGroups: Equipment['muscleGroups'];
  userId: string;
}): Promise<void> {
  await getSyncManager().enqueue('equipment', 'upsert', {
    id: newId(),
    gym: input.gymId,
    name: input.name,
    category: input.category,
    muscleGroups: input.muscleGroups,
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: false,
  });
}

export async function addGym(input: { name: string; gymType: GymType; userId: string }): Promise<string> {
  const id = newId();
  await getSyncManager().enqueue('gyms', 'upsert', {
    id,
    name: input.name,
    gymType: input.gymType,
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: false,
  });
  return id;
}

export async function updateGym(input: {
  id: string;
  name: string;
  gymType: GymType;
  userId: string;
}): Promise<void> {
  await getSyncManager().enqueue('gyms', 'upsert', {
    id: input.id,
    name: input.name,
    gymType: input.gymType,
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: false,
  });
}

/** Soft-delete la salle et cascade sur tout son équipement (jamais de hard-delete). */
export async function deleteGym(input: { id: string; userId: string }): Promise<void> {
  const mgr = getSyncManager();
  const now = Date.now();
  const base = { user: input.userId, clientUpdatedAt: now, deleted: true };

  await mgr.enqueue('gyms', 'upsert', { id: input.id, ...base });

  for (const equipment of listEquipment(input.id)) {
    await mgr.enqueue('equipment', 'upsert', {
      id: equipment.id,
      gym: equipment.gym,
      name: equipment.name,
      category: equipment.category,
      muscleGroups: equipment.muscleGroups,
      ...base,
    });
  }
}

export async function updateEquipment(input: {
  id: string;
  gymId: string;
  name: string;
  category: EquipmentCategory;
  muscleGroups: MuscleGroup[];
  userId: string;
}): Promise<void> {
  await getSyncManager().enqueue('equipment', 'upsert', {
    id: input.id,
    gym: input.gymId,
    name: input.name,
    category: input.category,
    muscleGroups: input.muscleGroups,
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: false,
  });
}

/** Soft-delete un équipement (jamais de hard-delete). */
export async function removeEquipment(input: { id: string; userId: string }): Promise<void> {
  await getSyncManager().enqueue('equipment', 'upsert', {
    id: input.id,
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: true,
  });
}

export interface WorkoutDraft {
  gymId: string;
  date: string;
  notes?: string;
  exercises: {
    name: string;
    equipmentId?: string;
    sets: { reps: number; weight_kg: number }[];
  }[];
  userId: string;
}

/** Persiste une séance complète : workout + exercises + sets. */
export async function createWorkout(draft: WorkoutDraft): Promise<string> {
  const mgr = getSyncManager();
  const now = Date.now();
  const base = { user: draft.userId, clientUpdatedAt: now, deleted: false };
  const workoutId = newId();

  await mgr.enqueue('workouts', 'upsert', {
    id: workoutId,
    date: draft.date,
    gym: draft.gymId,
    notes: draft.notes ?? '',
    ...base,
  });

  for (let i = 0; i < draft.exercises.length; i++) {
    const ex = draft.exercises[i]!;
    const exerciseId = newId();
    await mgr.enqueue('exercises', 'upsert', {
      id: exerciseId,
      workout: workoutId,
      equipment: ex.equipmentId ?? '',
      name: ex.name,
      position: i,
      ...base,
    });
    for (let s = 0; s < ex.sets.length; s++) {
      const set = ex.sets[s]!;
      await mgr.enqueue('sets', 'upsert', {
        id: newId(),
        exercise: exerciseId,
        reps: set.reps,
        weight_kg: set.weight_kg,
        position: s,
        ...base,
      });
    }
  }
  return workoutId;
}

/** Mappe un record brut vers `Workout`, avec défauts rétro-compatibles pour les anciens enregistrements
 * (qui n'ont que `date`, sans `at`/`status`/`source`). */
function mapWorkout(r: { id: string; payload: unknown }): Workout {
  const p = (r.payload ?? {}) as Record<string, unknown>;
  const at = (p.at as string | undefined) ?? `${p.date as string}T12:00:00.000Z`;
  return {
    id: r.id,
    ...p,
    at,
    date: at.slice(0, 10) || (p.date as string),
    status: (p.status as WorkoutStatus | undefined) ?? 'done',
    source: (p.source as WorkoutSource | undefined) ?? 'manual',
  } as unknown as Workout;
}

export function listWorkouts(): Workout[] {
  return rows('workouts')
    .map(mapWorkout)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function listExercises(workoutId: string): Exercise[] {
  return rows('exercises')
    .map((r) => ({ id: r.id, ...(r.payload ?? {}) }) as unknown as Exercise)
    .filter((e) => e.workout === workoutId)
    .sort((a, b) => a.position - b.position);
}

export function listSets(exerciseId: string): ExerciseSet[] {
  return rows('sets')
    .map((r) => ({ id: r.id, ...(r.payload ?? {}) }) as unknown as ExerciseSet)
    .filter((s) => s.exercise === exerciseId)
    .sort((a, b) => a.position - b.position);
}

/** Met à jour une séance : ne remplace que les champs fournis, merge avec le record existant. */
export async function updateWorkout(input: {
  id: string;
  at?: string;
  gym?: string;
  notes?: string;
  status?: WorkoutStatus;
  source?: WorkoutSource;
  userId: string;
}): Promise<void> {
  const current = listWorkouts().find((w) => w.id === input.id);
  const at = input.at ?? current?.at;
  await getSyncManager().enqueue('workouts', 'upsert', {
    id: input.id,
    at,
    date: at ? at.slice(0, 10) : current?.date,
    gym: input.gym ?? current?.gym,
    notes: input.notes ?? current?.notes,
    status: input.status ?? current?.status ?? 'planned',
    source: input.source ?? current?.source ?? 'manual',
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: false,
  });
}

/** Soft-delete une séance et cascade sur ses exercices + séries (jamais de hard-delete). */
export async function deleteWorkout(input: { id: string; userId: string }): Promise<void> {
  const mgr = getSyncManager();
  const now = Date.now();
  const base = { user: input.userId, clientUpdatedAt: now, deleted: true };

  await mgr.enqueue('workouts', 'upsert', { id: input.id, ...base });

  for (const exercise of listExercises(input.id)) {
    await mgr.enqueue('exercises', 'upsert', {
      id: exercise.id,
      workout: exercise.workout,
      equipment: exercise.equipment,
      name: exercise.name,
      position: exercise.position,
      ...base,
    });

    for (const set of listSets(exercise.id)) {
      await mgr.enqueue('sets', 'upsert', {
        id: set.id,
        exercise: set.exercise,
        reps: set.reps,
        weight_kg: set.weight_kg,
        position: set.position,
        ...base,
      });
    }
  }
}

/** Met à jour un exercice : ne remplace que les champs fournis, merge avec le record existant. */
export async function updateExercise(input: {
  id: string;
  workout: string;
  name?: string;
  equipment?: string;
  position?: number;
  userId: string;
}): Promise<void> {
  const current = listExercises(input.workout).find((e) => e.id === input.id);
  await getSyncManager().enqueue('exercises', 'upsert', {
    id: input.id,
    workout: input.workout,
    equipment: input.equipment ?? current?.equipment,
    name: input.name ?? current?.name,
    position: input.position ?? current?.position ?? 0,
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: false,
  });
}

/** Soft-delete un exercice et cascade sur ses séries (jamais de hard-delete). */
export async function deleteExercise(input: { id: string; userId: string }): Promise<void> {
  const mgr = getSyncManager();
  const now = Date.now();
  const base = { user: input.userId, clientUpdatedAt: now, deleted: true };

  await mgr.enqueue('exercises', 'upsert', { id: input.id, ...base });

  for (const set of listSets(input.id)) {
    await mgr.enqueue('sets', 'upsert', {
      id: set.id,
      exercise: set.exercise,
      reps: set.reps,
      weight_kg: set.weight_kg,
      position: set.position,
      ...base,
    });
  }
}

/** Met à jour une série : merge `fields` (ex. reps/weight_kg) avec le record existant. */
export async function updateSet(input: {
  id: string;
  exercise: string;
  fields: Record<string, number | string>;
  position?: number;
  userId: string;
}): Promise<void> {
  const current = listSets(input.exercise).find((s) => s.id === input.id);
  await getSyncManager().enqueue('sets', 'upsert', {
    id: input.id,
    exercise: input.exercise,
    reps: current?.reps,
    weight_kg: current?.weight_kg,
    position: input.position ?? current?.position ?? 0,
    ...input.fields,
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: false,
  });
}

/** Soft-delete une série (jamais de hard-delete). */
export async function deleteSet(input: { id: string; userId: string }): Promise<void> {
  await getSyncManager().enqueue('sets', 'upsert', {
    id: input.id,
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: true,
  });
}

/** Duplique une séance (+ exercices + séries) avec de nouveaux ids. Retourne l'id de la nouvelle séance. */
export async function duplicateWorkout(input: {
  id: string;
  at: string;
  status: WorkoutStatus;
  userId: string;
}): Promise<string> {
  const mgr = getSyncManager();
  const now = Date.now();
  const base = { user: input.userId, clientUpdatedAt: now, deleted: false };
  const source = listWorkouts().find((w) => w.id === input.id);
  const newWorkoutId = newId();

  await mgr.enqueue('workouts', 'upsert', {
    id: newWorkoutId,
    at: input.at,
    date: input.at.slice(0, 10),
    gym: source?.gym,
    notes: source?.notes,
    status: input.status,
    source: source?.source ?? 'manual',
    ...base,
  });

  for (const exercise of listExercises(input.id)) {
    const newExerciseId = newId();
    await mgr.enqueue('exercises', 'upsert', {
      id: newExerciseId,
      workout: newWorkoutId,
      equipment: exercise.equipment,
      name: exercise.name,
      position: exercise.position,
      source: exercise.source,
      ...base,
    });

    for (const set of listSets(exercise.id)) {
      await mgr.enqueue('sets', 'upsert', {
        id: newId(),
        exercise: newExerciseId,
        reps: set.reps,
        weight_kg: set.weight_kg,
        position: set.position,
        ...base,
      });
    }
  }

  return newWorkoutId;
}
