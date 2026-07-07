import { reconcile } from './reconcile';
import { OfflineQueue } from './queue';
import { sanityCheck } from './sanity';
import type { ConflictEntry, SyncRecord } from './types';

/** Cache local = source de travail hors-ligne (SQLite via drizzle en prod). */
export interface LocalStore {
  list(collection: string): Promise<SyncRecord[]>;
  get(collection: string, id: string): Promise<SyncRecord | null>;
  /** Écrit/écrase localement (les suppressions sont des tombstones deleted=true). */
  upsert(collection: string, record: SyncRecord): Promise<void>;
}

/** Homelab autoritaire (PocketBase). */
export interface RemoteStore {
  reachable(): Promise<boolean>;
  /** Records modifiés depuis le curseur (clientUpdatedAt strictement supérieur). */
  listSince(collection: string, since: number): Promise<SyncRecord[]>;
  get(collection: string, id: string): Promise<SyncRecord | null>;
  upsert(collection: string, record: SyncRecord): Promise<SyncRecord>;
}

/** Journal de conflits : rien n'est jamais perdu silencieusement. */
export interface ConflictJournal {
  record(entry: ConflictEntry): Promise<void>;
}

export interface SyncReport {
  collection: string;
  offline: boolean;
  pulled: number;
  pushed: number;
  conflicts: number;
  /** Rejetés par les garde-fous de sanité. */
  skipped: number;
  /** Nouveau curseur (max clientUpdatedAt observé) à persister. */
  newCursor: number;
}

export interface EngineDeps {
  local: LocalStore;
  remote: RemoteStore;
  journal: ConflictJournal;
  queue: OfflineQueue;
  now: () => number;
  maxAttempts?: number;
}

export class SyncEngine {
  private readonly maxAttempts: number;

  constructor(private readonly deps: EngineDeps) {
    this.maxAttempts = deps.maxAttempts ?? 5;
  }

  /**
   * Synchronise une collection dans les deux sens.
   * Si le homelab est injoignable, on ne touche à rien : les mutations restent
   * en file et seront rejouées plus tard (le local reste la source de travail).
   */
  async syncCollection(collection: string, since: number): Promise<SyncReport> {
    const { local, remote, journal, queue } = this.deps;
    const report: SyncReport = {
      collection,
      offline: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      skipped: 0,
      newCursor: since,
    };

    if (!(await remote.reachable())) {
      report.offline = true;
      return report;
    }

    // --- PULL : intégrer les changements du homelab (curseur inclusif >=) ---
    const remoteChanges = await remote.listSince(collection, since);
    let maxSeen = since;
    // Horodatages de records rejetés (sanité) : le curseur ne doit pas les dépasser,
    // sinon un rejet transitoire (horloge distante déréglée) ne serait jamais re-tiré.
    const blockers: number[] = [];
    for (const r of remoteChanges) {
      maxSeen = Math.max(maxSeen, r.clientUpdatedAt);
      const l = await local.get(collection, r.id);
      const { action } = reconcile(l, r);

      if (action === 'pull') {
        if (this.guard(collection, r, report)) {
          await local.upsert(collection, r);
          report.pulled += 1;
        } else {
          blockers.push(r.clientUpdatedAt);
        }
      } else if (action === 'conflict') {
        report.conflicts += 1;
        await journal.record(this.conflict(collection, r.id, l as SyncRecord, r));
      }
      // 'push' / 'noop' : le local est ≥ récent → traité en phase PUSH ou rien.
    }
    // Curseur = max observé, mais jamais au-delà d'un record rejeté (re-tirable ensuite).
    report.newCursor = blockers.length ? Math.min(maxSeen, Math.min(...blockers) - 1) : maxSeen;

    // --- PUSH : rejouer la file hors-ligne pour cette collection ---
    for (const m of queue.all().filter((x) => x.collection === collection)) {
      const currentRemote = await remote.get(collection, m.recordId);
      const { action } = reconcile(m.record, currentRemote);

      try {
        if (action === 'push') {
          if (!this.guard(collection, m.record, report)) {
            queue.ack(m.key); // données aberrantes : ne pas rejouer indéfiniment
            continue;
          }
          const stored = await remote.upsert(collection, m.record);
          await local.upsert(collection, stored);
          report.pushed += 1;
          queue.ack(m.key);
        } else if (action === 'pull') {
          // Le homelab a une version plus récente (autre device) : LWW → remote gagne,
          // mais on JOURNALISE la version locale écrasée (jamais de perte silencieuse).
          report.conflicts += 1;
          await journal.record(
            this.conflict(collection, m.recordId, m.record, currentRemote as SyncRecord)
          );
          if (this.guard(collection, currentRemote as SyncRecord, report)) {
            await local.upsert(collection, currentRemote as SyncRecord);
          }
          queue.ack(m.key);
        } else if (action === 'conflict') {
          // Même horodatage, contenu divergent : on conserve les deux, l'utilisateur tranche.
          report.conflicts += 1;
          await journal.record(
            this.conflict(collection, m.recordId, m.record, currentRemote as SyncRecord)
          );
          queue.ack(m.key); // stoppe le rejeu ; résolution manuelle ultérieure
        } else {
          queue.ack(m.key); // noop avec remote identique
        }
      } catch {
        // Échec réseau/serveur : on retente plus tard. Au-delà de maxAttempts,
        // la mutation est dead-letter → JOURNALISÉE (jamais perdue silencieusement).
        const dead = queue.fail(m.key, this.maxAttempts);
        if (dead) {
          report.conflicts += 1;
          await journal.record({
            collection,
            recordId: dead.recordId,
            local: dead.record,
            remote: currentRemote,
            detectedAt: this.deps.now(),
            resolved: false,
            kind: 'dead_letter',
          });
        }
      }
    }

    return report;
  }

  private guard(collection: string, record: SyncRecord, report: SyncReport): boolean {
    const violations = sanityCheck(collection, record, this.deps.now());
    if (violations.length > 0) {
      report.skipped += 1;
      return false;
    }
    return true;
  }

  private conflict(
    collection: string,
    recordId: string,
    localRec: SyncRecord,
    remoteRec: SyncRecord | null
  ): ConflictEntry {
    return {
      collection,
      recordId,
      local: localRec,
      remote: remoteRec,
      detectedAt: this.deps.now(),
      resolved: false,
      kind: 'conflict',
    };
  }
}
