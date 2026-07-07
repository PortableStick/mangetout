import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { syncRecords } from '@/db/schema';
import { newId } from '@/lib/id';
import { getSyncManager } from '@/sync/manager';

import { sortByDate, type WeightEntry } from './weight';

export async function addWeightEntry(input: {
  date: string;
  weight_kg: number;
  measurements?: Record<string, number>;
  userId: string;
}): Promise<WeightEntry> {
  const entry: WeightEntry = {
    id: newId(),
    date: input.date,
    weight_kg: input.weight_kg,
    measurements: input.measurements,
  };
  await getSyncManager().enqueue('weight_entries', 'upsert', {
    ...entry,
    user: input.userId,
    clientUpdatedAt: Date.now(),
    deleted: false,
  });
  return entry;
}

export function listWeightEntries(): WeightEntry[] {
  const rows = db
    .select()
    .from(syncRecords)
    .where(and(eq(syncRecords.collection, 'weight_entries'), eq(syncRecords.deleted, false)))
    .all();
  return sortByDate(rows.map((r) => ({ id: r.id, ...(r.payload ?? {}) }) as unknown as WeightEntry));
}
