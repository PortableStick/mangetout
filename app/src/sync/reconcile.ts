import type { ReconcileResult, SyncRecord } from './types';

/** Sérialisation stable et récursive (clés triées à tous les niveaux). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

/** Champs métier = tout sauf `clientUpdatedAt` (l'horodatage n'est pas du contenu). */
function contentEquals(a: SyncRecord, b: SyncRecord): boolean {
  const strip = ({ clientUpdatedAt: _omit, ...rest }: SyncRecord) => rest;
  return stableStringify(strip(a)) === stableStringify(strip(b));
}

/**
 * Réconcilie une paire (local, remote) — last-write-wins sur `clientUpdatedAt`.
 * - un seul côté présent → propage vers l'autre ;
 * - horodatages différents → le plus récent gagne ;
 * - horodatages ÉGAUX + contenu différent → CONFLIT (journalisé, pas d'écrasement silencieux) ;
 * - identiques → no-op.
 */
export function reconcile(
  local: SyncRecord | null | undefined,
  remote: SyncRecord | null | undefined
): ReconcileResult {
  if (!local && !remote) return { action: 'noop', reason: 'aucun côté' };
  if (local && !remote) return { action: 'push', reason: 'absent du homelab' };
  if (!local && remote) return { action: 'pull', reason: 'absent en local' };

  // Ici local et remote sont définis.
  const l = local as SyncRecord;
  const r = remote as SyncRecord;

  if (l.clientUpdatedAt > r.clientUpdatedAt) {
    return { action: 'push', reason: 'local plus récent' };
  }
  if (r.clientUpdatedAt > l.clientUpdatedAt) {
    return { action: 'pull', reason: 'homelab plus récent' };
  }
  // Horodatages égaux.
  if (contentEquals(l, r)) return { action: 'noop', reason: 'identiques' };
  return { action: 'conflict', reason: 'même horodatage, contenu divergent' };
}
