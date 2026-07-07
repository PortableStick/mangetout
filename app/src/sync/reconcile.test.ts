import { describe, expect, it } from '@jest/globals';

import { reconcile } from './reconcile';
import type { SyncRecord } from './types';

const rec = (over: Partial<SyncRecord> = {}): SyncRecord => ({
  id: 'a1',
  clientUpdatedAt: 1000,
  deleted: false,
  value: 'x',
  ...over,
});

describe('reconcile (last-write-wins)', () => {
  it('pousse ce qui manque au homelab', () => {
    expect(reconcile(rec(), null).action).toBe('push');
  });

  it('tire ce qui manque en local', () => {
    expect(reconcile(null, rec()).action).toBe('pull');
  });

  it('le plus récent gagne (local)', () => {
    expect(reconcile(rec({ clientUpdatedAt: 2000 }), rec({ clientUpdatedAt: 1000 })).action).toBe(
      'push'
    );
  });

  it('le plus récent gagne (homelab)', () => {
    expect(reconcile(rec({ clientUpdatedAt: 1000 }), rec({ clientUpdatedAt: 2000 })).action).toBe(
      'pull'
    );
  });

  it('identiques → noop (horodatage égal, même contenu)', () => {
    expect(reconcile(rec(), rec()).action).toBe('noop');
  });

  it('même horodatage mais contenu divergent → conflict', () => {
    expect(reconcile(rec({ value: 'x' }), rec({ value: 'y' })).action).toBe('conflict');
  });

  it('une suppression plus récente gagne (tombstone)', () => {
    const local = rec({ clientUpdatedAt: 3000, deleted: true });
    const remote = rec({ clientUpdatedAt: 2000, deleted: false });
    expect(reconcile(local, remote).action).toBe('push');
  });

  it('l’ordre des champs n’affecte pas l’égalité de contenu', () => {
    const a: SyncRecord = { id: '1', clientUpdatedAt: 5, deleted: false, a: 1, b: 2 };
    const b: SyncRecord = { id: '1', clientUpdatedAt: 5, deleted: false, b: 2, a: 1 };
    expect(reconcile(a, b).action).toBe('noop');
  });
});
