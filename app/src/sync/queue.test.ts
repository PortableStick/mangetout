import { describe, expect, it } from '@jest/globals';

import { OfflineQueue } from './queue';
import type { SyncRecord } from './types';

const rec = (id: string, over: Partial<SyncRecord> = {}): SyncRecord => ({
  id,
  clientUpdatedAt: 1,
  deleted: false,
  ...over,
});

describe('OfflineQueue', () => {
  it('coalesce les éditions du même enregistrement (dernier snapshot)', () => {
    const q = new OfflineQueue();
    q.enqueue('foods', 'upsert', rec('f1', { name: 'v1' }), 10);
    q.enqueue('foods', 'upsert', rec('f1', { name: 'v2' }), 20);
    expect(q.size()).toBe(1);
    expect(q.all()[0]!.record.name).toBe('v2');
  });

  it('conserve les mutations sur des enregistrements distincts, en FIFO', () => {
    const q = new OfflineQueue();
    q.enqueue('foods', 'upsert', rec('b'), 20);
    q.enqueue('foods', 'upsert', rec('a'), 10);
    expect(q.all().map((m) => m.recordId)).toEqual(['a', 'b']);
  });

  it('ack retire la mutation', () => {
    const q = new OfflineQueue();
    const m = q.enqueue('foods', 'delete', rec('x'), 5);
    q.ack(m.key);
    expect(q.size()).toBe(0);
  });

  it('fail incrémente puis dead-letter au-delà du max', () => {
    const q = new OfflineQueue();
    const m = q.enqueue('foods', 'upsert', rec('x'), 5);
    expect(q.fail(m.key, 3)).toBeNull();
    expect(q.fail(m.key, 3)).toBeNull();
    const dead = q.fail(m.key, 3); // 3e échec → dead-letter
    expect(dead?.recordId).toBe('x');
    expect(q.size()).toBe(0);
  });

  it('se reconstruit depuis un état persisté', () => {
    const q1 = new OfflineQueue();
    q1.enqueue('sets', 'upsert', rec('s1'), 1);
    const q2 = new OfflineQueue(q1.serialize());
    expect(q2.has('sets', 's1')).toBe(true);
  });
});
