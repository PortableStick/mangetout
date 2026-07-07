import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Schéma du cache local (SQLite via drizzle). Le local est un CACHE offline :
 * la source de vérité durable est PocketBase sur le homelab. On stocke les entités
 * de façon générique (collection + id + payload JSON) — la couche sync manipule des
 * `SyncRecord` homogènes ; les formes typées métier vivent en TS/zod au niveau des écrans.
 */

/** Cache des enregistrements synchronisables (toutes collections). */
export const syncRecords = sqliteTable(
  'sync_records',
  {
    collection: text('collection').notNull(),
    id: text('id').notNull(),
    userId: text('user_id'),
    /** Champs métier sérialisés (hors métadonnées de sync). */
    payload: text('payload', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
    clientUpdatedAt: integer('client_updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
    /** État local : 'synced' | 'pending' (mutation en attente de push). */
    syncStatus: text('sync_status').notNull().default('synced'),
  },
  (t) => [primaryKey({ columns: [t.collection, t.id] })]
);

/** File d'attente des mutations hors-ligne (persistance de OfflineQueue). */
export const syncQueue = sqliteTable('sync_queue', {
  key: text('key').primaryKey(),
  collection: text('collection').notNull(),
  recordId: text('record_id').notNull(),
  op: text('op').notNull(),
  record: text('record', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  enqueuedAt: integer('enqueued_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
});

/** Journal de conflits (aucune donnée perdue ; résolution utilisateur ultérieure). */
export const conflicts = sqliteTable('conflicts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  collection: text('collection').notNull(),
  recordId: text('record_id').notNull(),
  local: text('local', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  remote: text('remote', { mode: 'json' }).$type<Record<string, unknown>>(),
  detectedAt: integer('detected_at').notNull(),
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
  kind: text('kind').notNull().default('conflict'),
});

/** Curseur de pull par collection (max clientUpdatedAt déjà intégré). */
export const syncCursors = sqliteTable('sync_cursors', {
  collection: text('collection').primaryKey(),
  cursor: integer('cursor').notNull().default(0),
});

export type SyncRecordRow = typeof syncRecords.$inferSelect;
export type SyncQueueRow = typeof syncQueue.$inferSelect;
export type ConflictRow = typeof conflicts.$inferSelect;
