import { beforeEach, describe, expect, it } from '@jest/globals';

import { SyncEngine, type ConflictJournal, type LocalStore, type RemoteStore } from './engine';
import { OfflineQueue } from './queue';
import type { ConflictEntry, SyncRecord } from './types';

const NOW = 1_700_000_000_000;
const rec = (id: string, ts: number, over: Partial<SyncRecord> = {}): SyncRecord => ({
  id,
  clientUpdatedAt: ts,
  deleted: false,
  ...over,
});

class FakeStore {
  data = new Map<string, Map<string, SyncRecord>>();
  private col(c: string) {
    if (!this.data.has(c)) this.data.set(c, new Map());
    return this.data.get(c)!;
  }
  async list(c: string) {
    return [...this.col(c).values()];
  }
  async get(c: string, id: string) {
    return this.col(c).get(id) ?? null;
  }
  async upsert(c: string, r: SyncRecord) {
    this.col(c).set(r.id, r);
    return r;
  }
}

class FakeRemote extends FakeStore implements RemoteStore {
  online = true;
  failUpsertOnce = false;
  failUpsert = false;
  async reachable() {
    return this.online;
  }
  async listSince(c: string, since: number) {
    // Curseur inclusif (>=), comme l'adaptateur PocketBase réel.
    return (await this.list(c)).filter((r) => r.clientUpdatedAt >= since);
  }
  override async upsert(c: string, r: SyncRecord) {
    if (this.failUpsert) throw new Error('serveur indisponible');
    if (this.failUpsertOnce) {
      this.failUpsertOnce = false;
      throw new Error('coupure réseau');
    }
    return super.upsert(c, r);
  }
}

class FakeJournal implements ConflictJournal {
  entries: ConflictEntry[] = [];
  async record(e: ConflictEntry) {
    this.entries.push(e);
  }
}

function makeEngine() {
  const local = new FakeStore() as unknown as LocalStore & FakeStore;
  const remote = new FakeRemote();
  const journal = new FakeJournal();
  const queue = new OfflineQueue();
  const engine = new SyncEngine({ local, remote, journal, queue, now: () => NOW, maxAttempts: 3 });
  return { engine, local, remote, journal, queue };
}

describe('SyncEngine', () => {
  let ctx: ReturnType<typeof makeEngine>;
  beforeEach(() => {
    ctx = makeEngine();
  });

  it('resync sur device vierge : tout est tiré du homelab', async () => {
    await ctx.remote.upsert('meals', rec('m1', 100));
    await ctx.remote.upsert('meals', rec('m2', 200));

    const report = await ctx.engine.syncCollection('meals', 0);

    expect(report.pulled).toBe(2);
    expect(report.newCursor).toBe(200);
    expect(await ctx.local.get('meals', 'm1')).not.toBeNull();
    expect(await ctx.local.get('meals', 'm2')).not.toBeNull();
  });

  it('hors-ligne : rien n’est touché, la file est préservée', async () => {
    ctx.remote.online = false;
    ctx.queue.enqueue('meals', 'upsert', rec('m1', 500), NOW);

    const report = await ctx.engine.syncCollection('meals', 0);

    expect(report.offline).toBe(true);
    expect(report.pushed).toBe(0);
    expect(ctx.queue.size()).toBe(1);
  });

  it('pousse une création locale vers le homelab', async () => {
    ctx.queue.enqueue('meals', 'upsert', rec('m1', 500, { name: 'Poulet riz' }), NOW);

    const report = await ctx.engine.syncCollection('meals', 0);

    expect(report.pushed).toBe(1);
    expect(await ctx.remote.get('meals', 'm1')).not.toBeNull();
    expect(ctx.queue.size()).toBe(0);
  });

  it('coupure réseau en pleine écriture : la mutation reste en file puis rejoue', async () => {
    ctx.queue.enqueue('meals', 'upsert', rec('m1', 500), NOW);
    ctx.remote.failUpsertOnce = true;

    const first = await ctx.engine.syncCollection('meals', 0);
    expect(first.pushed).toBe(0);
    expect(ctx.queue.size()).toBe(1);
    expect(ctx.queue.all()[0]!.attempts).toBe(1);

    const second = await ctx.engine.syncCollection('meals', 0);
    expect(second.pushed).toBe(1);
    expect(ctx.queue.size()).toBe(0);
  });

  it('conflit concurrent (homelab plus récent) : LWW gagne mais le local écrasé est journalisé', async () => {
    // Un autre device a écrit m1 à 800 ; notre édition locale date de 500.
    await ctx.remote.upsert('meals', rec('m1', 800, { name: 'remote' }));
    ctx.queue.enqueue('meals', 'upsert', rec('m1', 500, { name: 'local' }), NOW);

    const report = await ctx.engine.syncCollection('meals', 800); // curseur déjà à 800

    expect(report.pushed).toBe(0);
    expect(report.conflicts).toBe(1);
    expect(ctx.journal.entries[0]!.local.name).toBe('local'); // rien de perdu
    expect((await ctx.local.get('meals', 'm1'))!.name).toBe('remote'); // remote appliqué
    expect(ctx.queue.size()).toBe(0);
  });

  it('conflit à horodatage égal : les deux versions sont conservées, aucun écrasement', async () => {
    await ctx.local.upsert('meals', rec('m1', 100, { name: 'A' }));
    await ctx.remote.upsert('meals', rec('m1', 100, { name: 'B' }));

    const report = await ctx.engine.syncCollection('meals', 0);

    expect(report.conflicts).toBe(1);
    expect(ctx.journal.entries[0]!.local.name).toBe('A');
    expect(ctx.journal.entries[0]!.remote!.name).toBe('B');
    expect((await ctx.local.get('meals', 'm1'))!.name).toBe('A'); // local NON écrasé
  });

  it('curseur inclusif : une écriture au même ms que le curseur est tirée', async () => {
    // Un autre device pousse Y au même horodatage que le curseur déjà posé.
    await ctx.remote.upsert('meals', rec('y', 1000));

    const report = await ctx.engine.syncCollection('meals', 1000);

    expect(report.pulled).toBe(1);
    expect(await ctx.local.get('meals', 'y')).not.toBeNull();
  });

  it('échecs répétés : la mutation part en dead-letter journalisé (rien de perdu)', async () => {
    ctx.queue.enqueue('meals', 'upsert', rec('m1', 500), NOW);
    ctx.remote.failUpsert = true; // le serveur échoue à chaque tentative

    for (let i = 0; i < 3; i++) await ctx.engine.syncCollection('meals', 0); // maxAttempts = 3

    expect(ctx.queue.size()).toBe(0); // abandonnée après 3 échecs
    const dead = ctx.journal.entries.find((e) => e.recordId === 'm1');
    expect(dead?.kind).toBe('dead_letter');
    expect(dead?.local.clientUpdatedAt).toBe(500);
  });

  it('un record rejeté par sanité ne fait pas avancer le curseur au-delà (re-tirable)', async () => {
    await ctx.remote.upsert('weight_entries', rec('w1', 1000, { weight_kg: 70 }));
    await ctx.remote.upsert('weight_entries', rec('w2', 2000, { weight_kg: 900 })); // aberrant

    const report = await ctx.engine.syncCollection('weight_entries', 0);

    expect(report.pulled).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.newCursor).toBe(1999); // < 2000 → w2 sera re-proposé une fois l'horloge/donnée corrigée
  });

  it('garde-fou de sanité : une donnée aberrante n’est jamais poussée', async () => {
    ctx.queue.enqueue('weight_entries', 'upsert', rec('w1', 500, { weight_kg: 900 }), NOW);

    const report = await ctx.engine.syncCollection('weight_entries', 0);

    expect(report.skipped).toBe(1);
    expect(report.pushed).toBe(0);
    expect(await ctx.remote.get('weight_entries', 'w1')).toBeNull();
    expect(ctx.queue.size()).toBe(0); // acké : pas de rejeu infini d'une donnée invalide
  });
});
