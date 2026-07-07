/**
 * Contrat de synchronisation. Le homelab (PocketBase) est la source autoritaire ;
 * le SQLite local est un cache. Réconciliation last-write-wins sur `clientUpdatedAt`,
 * avec garde-fous et JAMAIS d'écrasement silencieux en cas de conflit ambigu.
 */

/** Métadonnées de sync présentes sur toute entité synchronisable. */
export interface SyncMeta {
  /** Identifiant stable (généré côté client, accepté tel quel par PocketBase). */
  id: string;
  /** Horodatage epoch ms de la dernière écriture — clé du last-write-wins. */
  clientUpdatedAt: number;
  /** Tombstone : suppression logique (jamais de hard-delete côté sync). */
  deleted: boolean;
}

/** Un enregistrement synchronisable = métadonnées + champs métier arbitraires. */
export type SyncRecord = SyncMeta & Record<string, unknown>;

/** Décision de réconciliation pour une paire (local, remote). */
export type ReconcileAction = 'push' | 'pull' | 'noop' | 'conflict';

export interface ReconcileResult {
  action: ReconcileAction;
  reason: string;
}

/** État d'une mutation dans la file hors-ligne. */
export interface QueuedMutation {
  /** Clé unique de la mutation (permet dédup/coalescence). */
  key: string;
  collection: string;
  recordId: string;
  op: 'upsert' | 'delete';
  /** Snapshot du record au moment de la mutation (déjà validé). */
  record: SyncRecord;
  enqueuedAt: number;
  attempts: number;
}

/** Entrée du journal (aucune donnée n'est perdue). */
export interface ConflictEntry {
  collection: string;
  recordId: string;
  local: SyncRecord;
  /** Version distante ; null pour un dead-letter (échec de push répété). */
  remote: SyncRecord | null;
  detectedAt: number;
  resolved: boolean;
  /** `conflict` = divergence ; `dead_letter` = mutation abandonnée après N échecs. */
  kind: 'conflict' | 'dead_letter';
}
