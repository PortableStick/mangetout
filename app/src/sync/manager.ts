import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { localStore } from '@/db/localStore';
import { remoteStore } from '@/db/remoteStore';
import { conflicts, syncCursors, syncQueue, syncRecords } from '@/db/schema';

import { SYNC_COLLECTIONS } from './collections';
import { SyncEngine, type ConflictJournal, type SyncReport } from './engine';
import { OfflineQueue } from './queue';
import type { QueuedMutation, SyncRecord } from './types';

/** Journal de conflits persistant (table `conflicts`). */
const conflictJournal: ConflictJournal = {
  async record(e) {
    db.insert(conflicts)
      .values({
        collection: e.collection,
        recordId: e.recordId,
        local: e.local,
        remote: e.remote ?? null,
        detectedAt: e.detectedAt,
        resolved: e.resolved,
        kind: e.kind,
      })
      .run();
  },
};

function loadQueue(): OfflineQueue {
  const rows = db.select().from(syncQueue).all();
  const items: QueuedMutation[] = rows.map((r) => ({
    key: r.key,
    collection: r.collection,
    recordId: r.recordId,
    op: r.op as 'upsert' | 'delete',
    record: r.record as unknown as SyncRecord,
    enqueuedAt: r.enqueuedAt,
    attempts: r.attempts,
  }));
  return new OfflineQueue(items);
}

function persistQueue(queue: OfflineQueue): void {
  // File courte (2-5 utilisateurs) : réécriture complète, simple et sûre.
  db.delete(syncQueue).run();
  for (const m of queue.serialize()) {
    db.insert(syncQueue)
      .values({
        key: m.key,
        collection: m.collection,
        recordId: m.recordId,
        op: m.op,
        record: m.record,
        enqueuedAt: m.enqueuedAt,
        attempts: m.attempts,
      })
      .run();
  }
}

function getCursor(collection: string): number {
  const row = db.select().from(syncCursors).where(eq(syncCursors.collection, collection)).get();
  return row?.cursor ?? 0;
}

function setCursor(collection: string, cursor: number): void {
  db.insert(syncCursors)
    .values({ collection, cursor })
    .onConflictDoUpdate({ target: syncCursors.collection, set: { cursor } })
    .run();
}

/**
 * Orchestre la synchronisation de toutes les collections avec le homelab.
 * Charge la file depuis SQLite, lance le moteur, persiste file + curseurs.
 */
export class SyncManager {
  private queue = loadQueue();
  private engine = new SyncEngine({
    local: localStore,
    remote: remoteStore,
    journal: conflictJournal,
    queue: this.queue,
    now: () => Date.now(),
  });

  /** Écrit une mutation locale (optimiste) et l'enfile pour le prochain push. */
  async enqueue(collection: string, op: 'upsert' | 'delete', record: SyncRecord): Promise<void> {
    const payload: SyncRecord = op === 'delete' ? { ...record, deleted: true } : record;
    await localStore.upsert(collection, payload);
    // PK composite (collection, id) : filtrer sur les deux.
    db.update(syncRecords)
      .set({ syncStatus: 'pending' })
      .where(and(eq(syncRecords.collection, collection), eq(syncRecords.id, record.id)))
      .run();
    this.queue.enqueue(collection, op, payload, Date.now());
    persistQueue(this.queue);
  }

  /** Cycle de synchronisation complet (toutes collections). */
  async syncAll(): Promise<SyncReport[]> {
    const reports: SyncReport[] = [];
    for (const collection of SYNC_COLLECTIONS) {
      const report = await this.engine.syncCollection(collection, getCursor(collection));
      if (!report.offline) setCursor(collection, report.newCursor);
      reports.push(report);
    }
    persistQueue(this.queue);
    return reports;
  }
}
