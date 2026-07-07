import type { QueuedMutation, SyncRecord } from './types';

/**
 * File d'attente hors-ligne des mutations. Quand le homelab est injoignable, les
 * écritures s'y accumulent puis sont rejouées à la reconnexion (dans l'ordre).
 *
 * Coalescence : plusieurs éditions du MÊME enregistrement se réduisent au dernier
 * snapshot (clé = collection:recordId) — on ne rejoue pas 3 fois une même ligne.
 */
export class OfflineQueue {
  private items = new Map<string, QueuedMutation>();

  constructor(initial: QueuedMutation[] = []) {
    for (const m of initial) this.items.set(m.key, m);
  }

  static keyOf(collection: string, recordId: string): string {
    return `${collection}:${recordId}`;
  }

  enqueue(
    collection: string,
    op: 'upsert' | 'delete',
    record: SyncRecord,
    at: number
  ): QueuedMutation {
    const key = OfflineQueue.keyOf(collection, record.id);
    const mutation: QueuedMutation = {
      key,
      collection,
      recordId: record.id,
      op,
      record,
      enqueuedAt: at,
      attempts: 0,
    };
    // Le dernier snapshot supersède les précédents (coalescence).
    this.items.set(key, mutation);
    return mutation;
  }

  /** Mutations en attente, dans l'ordre d'enfilement (FIFO). */
  all(): QueuedMutation[] {
    return [...this.items.values()].sort((a, b) => a.enqueuedAt - b.enqueuedAt);
  }

  size(): number {
    return this.items.size;
  }

  has(collection: string, recordId: string): boolean {
    return this.items.has(OfflineQueue.keyOf(collection, recordId));
  }

  /** Mutation appliquée avec succès → retirée. */
  ack(key: string): void {
    this.items.delete(key);
  }

  /**
   * Échec de rejeu : incrémente le compteur. Au-delà de `maxAttempts`, la mutation
   * est retirée et renvoyée (dead-letter) pour journalisation — pas de boucle infinie.
   */
  fail(key: string, maxAttempts: number): QueuedMutation | null {
    const m = this.items.get(key);
    if (!m) return null;
    m.attempts += 1;
    if (m.attempts >= maxAttempts) {
      this.items.delete(key);
      return m;
    }
    return null;
  }

  /** Sérialisation pour persistance (SQLite / AsyncStorage). */
  serialize(): QueuedMutation[] {
    return this.all();
  }
}
