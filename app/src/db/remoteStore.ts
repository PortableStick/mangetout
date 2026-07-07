import { ClientResponseError } from 'pocketbase';

import type { RemoteStore } from '@/sync/engine';
import type { SyncRecord } from '@/sync/types';
import { pb } from '@/lib/pocketbase';

// Champs système PocketBase à ne pas confondre avec le contenu métier.
const PB_SYSTEM = new Set(['collectionId', 'collectionName', 'created', 'updated', 'expand']);

const PB_META = new Set(['id', 'clientUpdatedAt', 'deleted']);

function toRecord(pbRecord: Record<string, unknown>): SyncRecord {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(pbRecord)) {
    if (!PB_SYSTEM.has(k) && !PB_META.has(k)) out[k] = v;
  }
  // Coercions APRÈS le spread : les métadonnées typées ne doivent jamais être
  // écrasées par leur valeur brute PocketBase (ex. clientUpdatedAt en chaîne → LWW faussé).
  return {
    ...out,
    id: String(pbRecord.id ?? ''),
    clientUpdatedAt: Number(pbRecord.clientUpdatedAt ?? 0),
    deleted: Boolean(pbRecord.deleted),
  };
}

/** Corps envoyé à PocketBase (les métadonnées sont des champs de la collection). */
function toBody(record: SyncRecord): Record<string, unknown> {
  return { ...record };
}

/** Adaptateur RemoteStore adossé au homelab PocketBase (source autoritaire). */
export const remoteStore: RemoteStore = {
  async reachable() {
    try {
      await pb.health.check();
      return true;
    } catch {
      return false;
    }
  },

  async listSince(collection, since) {
    // Curseur INCLUSIF (>=) : deux écritures au même ms sur des devices différents
    // ne doivent pas passer sous le radar. reconcile traite les doublons en noop.
    const list = await pb.collection(collection).getFullList({
      filter: pb.filter('clientUpdatedAt >= {:since}', { since }),
      sort: 'clientUpdatedAt',
    });
    return list.map((r) => toRecord(r as unknown as Record<string, unknown>));
  },

  async get(collection, id) {
    try {
      const r = await pb.collection(collection).getOne(id);
      return toRecord(r as unknown as Record<string, unknown>);
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) return null;
      throw error;
    }
  },

  async upsert(collection, record) {
    const body = toBody(record);
    try {
      const r = await pb.collection(collection).update(record.id, body);
      return toRecord(r as unknown as Record<string, unknown>);
    } catch (error) {
      // Record inexistant côté homelab → création avec le même id (client-generated).
      if (error instanceof ClientResponseError && error.status === 404) {
        const r = await pb.collection(collection).create({ id: record.id, ...body });
        return toRecord(r as unknown as Record<string, unknown>);
      }
      throw error;
    }
  },
};
