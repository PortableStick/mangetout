import { and, eq } from 'drizzle-orm';

import type { LocalStore } from '@/sync/engine';
import type { SyncRecord } from '@/sync/types';

import { db } from './client';
import { syncRecords, type SyncRecordRow } from './schema';

function toRecord(row: SyncRecordRow): SyncRecord {
  return {
    id: row.id,
    clientUpdatedAt: row.clientUpdatedAt,
    deleted: row.deleted,
    ...(row.payload ?? {}),
  };
}

function split(record: SyncRecord): { payload: Record<string, unknown> } & {
  id: string;
  clientUpdatedAt: number;
  deleted: boolean;
} {
  const { id, clientUpdatedAt, deleted, ...payload } = record;
  return { id, clientUpdatedAt, deleted, payload };
}

/** Adaptateur LocalStore adossé au cache SQLite (drizzle). */
export const localStore: LocalStore = {
  async list(collection) {
    return db
      .select()
      .from(syncRecords)
      .where(eq(syncRecords.collection, collection))
      .all()
      .map(toRecord);
  },

  async get(collection, id) {
    const row = db
      .select()
      .from(syncRecords)
      .where(and(eq(syncRecords.collection, collection), eq(syncRecords.id, id)))
      .get();
    return row ? toRecord(row) : null;
  },

  async upsert(collection, record) {
    const { id, clientUpdatedAt, deleted, payload } = split(record);
    const userId = typeof payload.user === 'string' ? payload.user : null;
    db.insert(syncRecords)
      .values({ collection, id, userId, payload, clientUpdatedAt, deleted, syncStatus: 'synced' })
      .onConflictDoUpdate({
        target: [syncRecords.collection, syncRecords.id],
        set: { payload, userId, clientUpdatedAt, deleted, syncStatus: 'synced' },
      })
      .run();
  },
};
