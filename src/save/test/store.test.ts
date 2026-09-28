import { describe, expect, it, vi } from 'vitest';
import type { SaveDoc, SaveStore } from '@/contracts';
import { SAVE_DEBOUNCE_MS, SLOT_KEYS, UNREADABLE_BACKUP_KEY } from '../defaults';
import type { SaveNotice } from '../notices';
import { decodeSlot, encodeEnvelope, type SlotEnvelope } from '../slots';
import { MemoryStorage } from '../storage';
import { goldenReplays, makeStore, settle, v1Fixture } from './helpers';

function envelopeOf(storage: MemoryStorage, slot: 'A' | 'B'): SlotEnvelope | null {
  const r = decodeSlot(slot, storage.getItem(SLOT_KEYS[slot]));
  return r.ok ? r.envelope : null;
}

function docWith(amber: number): SaveDoc {
  const d = v1Fixture();
  d.currencies.amber = amber;
  return d;
}

describe('LocalSaveStore: round trip', () => {
  it('implements the SaveStore contract', () => {
    const { store } = makeStore();
    const asContract: SaveStore = store;
    expect(typeof asContract.load).toBe('function');
  });

  it('a first run loads nothing and reports empty', async () => {
    const { store } = makeStore();
    expect(await store.load()).toBeNull();
    expect(store.loadReport).toMatchObject({ status: 'empty', slot: null, notice: null });
  });

  it('what is saved loads back identically in a new session', async () => {
    const { store, storage } = makeStore();
    const doc = v1Fixture();
    await store.save(doc, { immediate: true });
    const next = makeStore({ storage });
    expect(await next.store.load()).toEqual(doc);
    expect(next.store.loadReport).toMatchObject({ status: 'loaded', slot: 'A', fromVersion: 1, migrated: false });
  });

  it('never keeps a reference to the caller’s doc', async () => {
    const { store, storage } = makeStore();
    const doc = docWith(10);
    const p = store.save(doc);
    doc.currencies.amber = 999; // meta never mutates, but the store must not depend on that
    store.flush();
    await p;
    expect((await makeStore({ storage }).store.load())?.currencies.amber).toBe(10);
  });
});

describe('LocalSaveStore: dual slots (DESIGN B8 Keys)', () => {
  it('alternates A, B, A with strictly increasing writtenAt', async () => {
    const { store, storage, clock } = makeStore();
    await store.save(docWith(1), { immediate: true });
    clock.advance(1000);
    await store.save(docWith(2), { immediate: true });
    clock.advance(1000);
    await store.save(docWith(3), { immediate: true });
    expect(storage.writes.filter((k) => k.startsWith('ageborn.save.'))).toEqual([SLOT_KEYS.A, SLOT_KEYS.B, SLOT_KEYS.A]);
    expect(envelopeOf(storage, 'A')!.writtenAt).toBeGreaterThan(envelopeOf(storage, 'B')!.writtenAt);
    expect((await makeStore({ storage }).store.load())?.currencies.amber).toBe(3);
  });

  it('keeps writtenAt increasing when the clock goes backwards', async () => {
    const { store, storage, clock } = makeStore();
    await store.save(docWith(1), { immediate: true });
    clock.advance(-86_400_000);
    await store.save(docWith(2), { immediate: true });
    expect(envelopeOf(storage, 'B')!.writtenAt).toBeGreaterThan(envelopeOf(storage, 'A')!.writtenAt);
    expect((await makeStore({ storage }).store.load())?.currencies.amber).toBe(2);
  });

  it('continues after the newest slot of an earlier session', async () => {
    const { store, storage } = makeStore();
    await store.save(docWith(1), { immediate: true }); // A
    await store.save(docWith(2), { immediate: true }); // B
    const next = makeStore({ storage });
    await next.store.save(docWith(3), { immediate: true }); // no load first: still scans
    expect(storage.writes.filter((k) => k.startsWith('ageborn.save.')).at(-1)).toBe(SLOT_KEYS.A);
  });
});

describe('LocalSaveStore: debounce and flush (DESIGN B8 Writes)', () => {
  it('writes 2 s after the first unsaved change, with the latest doc', async () => {
    const { store, storage, timers } = makeStore();
    let resolved = 0;
    void store.save(docWith(1)).then(() => resolved++);
    timers.advance(1500);
    void store.save(docWith(2)).then(() => resolved++); // does not postpone the write
    timers.advance(SAVE_DEBOUNCE_MS - 1500 - 1);
    expect(storage.getItem(SLOT_KEYS.A)).toBeNull();
    expect(store.hasPendingWrite).toBe(true);
    timers.advance(1);
    await settle();
    expect(resolved).toBe(2);
    expect(store.writeCount).toBe(1);
    expect(store.hasPendingWrite).toBe(false);
    expect((await makeStore({ storage }).store.load())?.currencies.amber).toBe(2);
  });

  it('immediate writes at once and cancels the debounce', async () => {
    const { store, storage, timers } = makeStore();
    void store.save(docWith(1));
    await store.save(docWith(2), { immediate: true });
    expect(store.writeCount).toBe(1);
    expect(timers.pending).toBe(0);
    expect(decodeSlot('A', storage.getItem(SLOT_KEYS.A))).toMatchObject({ ok: true });
  });

  it('flush writes the pending doc now; with nothing pending it does nothing', () => {
    const { store } = makeStore();
    store.flush();
    expect(store.writeCount).toBe(0);
    void store.save(docWith(5));
    store.flush();
    expect(store.writeCount).toBe(1);
    store.flush();
    expect(store.writeCount).toBe(1);
  });

  it('load writes a pending save first', async () => {
    const { store } = makeStore();
    void store.save(docWith(7));
    expect((await store.load())?.currencies.amber).toBe(7);
  });

  it('dispose writes what is pending', () => {
    const { store } = makeStore();
    void store.save(docWith(8));
    store.dispose();
    expect(store.writeCount).toBe(1);
  });
});

describe('LocalSaveStore: corruption fallback (DESIGN B8 Load order)', () => {
  async function twoSaves() {
    const t = makeStore();
    await t.store.save(docWith(100), { immediate: true }); // A (older)
    t.clock.advance(1000);
    await t.store.save(docWith(200), { immediate: true }); // B (newest)
    return t;
  }

  it('falls back to the older slot when the newest fails its checksum, and overwrites the damaged one next', async () => {
    const { storage } = await twoSaves();
    const env = JSON.parse(storage.getItem(SLOT_KEYS.B)!) as SlotEnvelope;
    storage.setItem(SLOT_KEYS.B, JSON.stringify({ ...env, payload: env.payload.replace('"amber":200', '"amber":900') }));
    const { store } = makeStore({ storage });
    const notices: (SaveNotice | null)[] = [];
    store.onProblem((n) => notices.push(n));
    expect((await store.load())?.currencies.amber).toBe(100);
    expect(store.loadReport).toMatchObject({ status: 'recovered', slot: 'A' });
    expect(store.loadReport?.slots).toEqual([
      expect.objectContaining({ slot: 'A', outcome: 'loaded' }),
      { slot: 'B', outcome: 'checksum' },
    ]);
    expect(notices).toEqual([expect.objectContaining({ kind: 'recovered', messageKey: 'save.problem.recovered', ongoing: false })]);
    expect(store.nextWriteSlot).toBe('B');
  });

  it('falls back when the newest slot has a valid checksum but fails the schema', async () => {
    const { storage, clock } = await twoSaves();
    const bad = { ...docWith(300), activePlan: 7 };
    storage.setItem(SLOT_KEYS.B, encodeEnvelope(JSON.stringify(bad), 1, clock.now() + 5000));
    const { store } = makeStore({ storage });
    expect((await store.load())?.currencies.amber).toBe(100);
    expect(store.loadReport?.status).toBe('recovered');
    expect(store.loadReport?.slots.find((s) => s.slot === 'B')).toMatchObject({ outcome: 'invalid' });
    expect(store.loadReport?.slots.find((s) => s.slot === 'B')?.detail).toContain('activePlan');
  });

  it('with no readable slot it starts fresh, keeps the unreadable texts aside and shows the banner', async () => {
    const storage = new MemoryStorage();
    storage.setItem(SLOT_KEYS.A, '{"v":1,"writtenAt":5,"checksum":1,"payl');
    storage.setItem(SLOT_KEYS.B, 'not json at all');
    const { store } = makeStore({ storage });
    const notices: (SaveNotice | null)[] = [];
    store.onProblem((n) => notices.push(n));
    expect(await store.load()).toBeNull();
    expect(store.loadReport).toMatchObject({ status: 'unreadable', slot: null });
    expect(store.loadReport?.notice).toMatchObject({ kind: 'unreadable', messageKey: 'save.problem.unreadable' });
    expect(notices.map((n) => n?.kind)).toEqual(['unreadable']);
    const kept = JSON.parse(storage.getItem(UNREADABLE_BACKUP_KEY)!) as { slots: Record<string, string> };
    expect(kept.slots).toEqual({ A: '{"v":1,"writtenAt":5,"checksum":1,"payl', B: 'not json at all' });

    // The fresh profile saves normally; the kept texts survive it.
    await store.save(v1Fixture(), { immediate: true });
    expect(store.problem).toBeNull();
    expect(JSON.parse(storage.getItem(UNREADABLE_BACKUP_KEY)!)).toEqual(kept);
    expect(await makeStore({ storage }).store.load()).toEqual(v1Fixture());
  });

  it('a save from a newer build is never loaded, never overwritten and never lost', async () => {
    const storage = new MemoryStorage();
    const newer = { ...v1Fixture(), v: 99 };
    const newerText = encodeEnvelope(JSON.stringify(newer), 99, 1000);
    storage.setItem(SLOT_KEYS.A, newerText);
    const { store } = makeStore({ storage });
    expect(await store.load()).toBeNull();
    expect(store.loadReport?.slots[0]).toMatchObject({ slot: 'A', outcome: 'tooNew', version: 99 });
    expect(store.loadReport?.notice).toMatchObject({ kind: 'tooNew', messageKey: 'save.problem.tooNew', ongoing: true });
    expect(store.problem?.kind).toBe('tooNew');
    const kept = JSON.parse(storage.getItem(UNREADABLE_BACKUP_KEY)!) as { slots: Record<string, string> };
    expect(kept.slots.A).toBe(newerText);

    // This (older) build writes nothing until reloaded, so the newer save survives.
    await store.save(v1Fixture(), { immediate: true });
    expect(store.writeCount).toBe(0);
    expect(store.hasPendingWrite).toBe(true);
    expect(storage.getItem(SLOT_KEYS.A)).toBe(newerText);
    expect(storage.getItem(SLOT_KEYS.B)).toBeNull();

    // Reset progress is an explicit choice to start over and lifts the block.
    store.reset();
    await store.save(v1Fixture(), { immediate: true });
    expect(store.writeCount).toBe(1);
    expect(store.problem).toBeNull();
  });

  it('with a newer-build slot next to an older good one, loads the older one but writes nothing', async () => {
    const { store: first, storage, clock } = makeStore();
    await first.save(docWith(100), { immediate: true }); // A
    const newerText = encodeEnvelope(JSON.stringify({ ...docWith(500), v: 2 }), 2, clock.now() + 5000);
    storage.setItem(SLOT_KEYS.B, newerText);
    const { store } = makeStore({ storage });
    expect((await store.load())?.currencies.amber).toBe(100);
    expect(store.loadReport).toMatchObject({ status: 'recovered', slot: 'A' });
    expect(store.problem?.kind).toBe('tooNew');
    await store.save(docWith(101), { immediate: true });
    expect(storage.getItem(SLOT_KEYS.B)).toBe(newerText);
    expect(JSON.parse(storage.getItem(UNREADABLE_BACKUP_KEY)!).slots).toEqual({ B: newerText });
  });

  it('sets a rejected valid-checksum copy aside even when an older copy loads', async () => {
    const { store: first, storage, clock } = makeStore();
    await first.save(docWith(100), { immediate: true }); // A
    const badText = encodeEnvelope(JSON.stringify({ ...docWith(300), activePlan: 9 }), 1, clock.now() + 5000);
    storage.setItem(SLOT_KEYS.B, badText);
    const { store } = makeStore({ storage });
    expect((await store.load())?.currencies.amber).toBe(100);
    expect(store.problem).toBeNull();
    expect(JSON.parse(storage.getItem(UNREADABLE_BACKUP_KEY)!).slots).toEqual({ B: badText });
  });

  it('a damaged older copy next to a good newest one still says recovered (progress may be missing)', async () => {
    const { storage } = await twoSaves();
    storage.setItem(SLOT_KEYS.A, 'garbage');
    const { store } = makeStore({ storage });
    expect((await store.load())?.currencies.amber).toBe(200);
    expect(store.loadReport?.status).toBe('recovered');
  });

  it('a missing older slot is normal (first save of a profile)', async () => {
    const { store, storage } = makeStore();
    await store.save(docWith(1), { immediate: true });
    const next = makeStore({ storage });
    await next.store.load();
    expect(next.store.loadReport?.status).toBe('loaded');
  });

  it('repairs bad settings on load instead of dropping the profile', async () => {
    const storage = new MemoryStorage();
    const doc = v1Fixture() as SaveDoc & { settings: Record<string, unknown> };
    doc.settings.shake = 7;
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(doc), 1, 1000));
    const loaded = await makeStore({ storage }).store.load();
    expect(loaded?.settings.shake).toBe(1);
    expect(loaded?.currencies).toEqual(v1Fixture().currencies);
  });
});

describe('LocalSaveStore: problems shown to the player (DESIGN B8 Durability)', () => {
  it('catches a quota error, keeps the last good save and reports it with an i18n key', async () => {
    const { store, storage } = makeStore();
    await store.save(docWith(1), { immediate: true });
    const before = storage.getItem(SLOT_KEYS.A);
    storage.quota = storage.used() + 100; // the next slot write cannot fit
    const notices: (SaveNotice | null)[] = [];
    store.onProblem((n) => notices.push(n));

    await expect(store.save(docWith(2), { immediate: true })).resolves.toBeUndefined();
    expect(store.problem).toMatchObject({ kind: 'quota', messageKey: 'save.problem.quota', ongoing: true });
    expect(notices).toHaveLength(1);
    expect(store.hasPendingWrite).toBe(true);
    expect(storage.getItem(SLOT_KEYS.A)).toBe(before);
    expect(storage.getItem(SLOT_KEYS.B)).toBeNull();
    expect((await makeStore({ storage }).store.load())?.currencies.amber).toBe(1);

    // Space comes back: the pending doc is written by the next flush and the problem clears.
    storage.quota = Number.POSITIVE_INFINITY;
    store.flush();
    expect(store.problem).toBeNull();
    expect(notices.at(-1)).toBeNull();
    expect((await makeStore({ storage }).store.load())?.currencies.amber).toBe(2);
  });

  it('gives up replay space before failing a save', async () => {
    const { store, storage } = makeStore();
    for (const r of goldenReplays()) store.pushReplay(r);
    await store.save(docWith(1), { immediate: true });
    const replaysBefore = store.replays.persisted;
    expect(replaysBefore).toBe(10);
    storage.quota = storage.used() + 2000; // the second slot needs room the replays hold
    await store.save(docWith(2), { immediate: true });
    expect(store.problem).toBeNull();
    expect(store.replays.persisted).toBeLessThan(replaysBefore);
    expect(store.loadReplays()).toHaveLength(10); // this session still lists them all
    expect((await makeStore({ storage }).store.load())?.currencies.amber).toBe(2);
  });

  it('refuses to write a doc that would not load again', async () => {
    const { store, storage } = makeStore();
    await store.save(docWith(1), { immediate: true });
    const bad = { ...docWith(2), warPlans: [] } as SaveDoc;
    await store.save(bad, { immediate: true });
    expect(store.problem).toMatchObject({ kind: 'invalidDoc', messageKey: 'save.problem.writeFailed' });
    expect(store.problem?.detail).toContain('warPlans');
    expect((await makeStore({ storage }).store.load())?.currencies.amber).toBe(1);
  });

  it('reports blocked storage as unavailable and other errors as write failures', async () => {
    const blocked = {
      getItem: () => null,
      setItem: () => { const e = new Error('denied'); e.name = 'SecurityError'; throw e; },
      removeItem: () => {},
    };
    const a = makeStore({ storage: blocked as unknown as MemoryStorage });
    await a.store.save(v1Fixture(), { immediate: true });
    expect(a.store.problem?.kind).toBe('unavailable');

    const broken = { getItem: () => null, setItem: () => { throw new TypeError('???'); }, removeItem: () => {} };
    const b = makeStore({ storage: broken as unknown as MemoryStorage });
    await b.store.save(v1Fixture(), { immediate: true });
    expect(b.store.problem).toMatchObject({ kind: 'writeFailed', messageKey: 'save.problem.writeFailed' });
  });

  it('an in-memory stand-in for blocked storage reports unavailable from the start, and it stays', async () => {
    const { store } = makeStore({ storageUnavailable: true });
    expect(store.problem).toMatchObject({ kind: 'unavailable', messageKey: 'save.problem.unavailable' });
    await store.save(v1Fixture(), { immediate: true });
    expect(store.writeCount).toBe(1);
    expect(store.problem?.kind).toBe('unavailable');
  });

  it('a throwing listener does not break saving', async () => {
    const { store, storage } = makeStore();
    store.onProblem(() => { throw new Error('ui bug'); });
    storage.quota = 10;
    await store.save(v1Fixture(), { immediate: true });
    expect(store.problem?.kind).toBe('quota');
  });

  it('unsubscribes', async () => {
    const { store, storage } = makeStore();
    const cb = vi.fn();
    const off = store.onProblem(cb);
    off();
    storage.quota = 10;
    await store.save(v1Fixture(), { immediate: true });
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('LocalSaveStore: replays, event log and reset', () => {
  it('keeps the last 20 replays, oldest first, across sessions', () => {
    const golden = goldenReplays();
    const { store, storage } = makeStore();
    for (let i = 0; i < 25; i += 1) store.pushReplay({ ...golden[i % golden.length]!, seed: i });
    expect(store.loadReplays().map((r) => r.seed)).toEqual(Array.from({ length: 20 }, (_, i) => i + 5));
    expect(makeStore({ storage }).store.loadReplays().map((r) => r.seed)).toEqual(Array.from({ length: 20 }, (_, i) => i + 5));
  });

  it('drops damaged replays when reading them back', () => {
    const [a, b] = goldenReplays();
    const storage = new MemoryStorage();
    storage.setItem('ageborn.replays', JSON.stringify([a, { v: 1, junk: true }, b]));
    const { store } = makeStore({ storage });
    expect(store.loadReplays()).toEqual([a, b]);
    expect(store.replays.droppedOnLoad).toBe(1);
  });

  it('shares storage with the event log store', () => {
    const { store, storage } = makeStore();
    store.eventLog.record(1, 'boot', 'app');
    expect(JSON.parse(storage.getItem('ageborn.eventlog')!)).toEqual([{ at: 1, kind: 'boot', id: 'app' }]);
  });

  it('reset removes the profile, backups and replays but keeps the event log unless asked', async () => {
    const { store, storage } = makeStore();
    await store.save(docWith(1), { immediate: true });
    await store.save(docWith(2), { immediate: true });
    storage.setItem('ageborn.backup.pre-v2', 'x');
    storage.setItem(UNREADABLE_BACKUP_KEY, 'y');
    storage.setItem('ageborn.backup.pre-v9', 'z');
    storage.setItem('ageborn.feel', 'someone else');
    store.pushReplay(goldenReplays()[0]!);
    store.eventLog.record(1, 'boot', 'app');
    void store.save(docWith(3)); // pending: cancelled by reset

    store.reset();
    expect(Object.keys(storage.snapshot())).toEqual(['ageborn.eventlog', 'ageborn.feel']);
    expect(store.hasPendingWrite).toBe(false);
    expect(store.loadReplays()).toEqual([]);
    expect(await store.load()).toBeNull();
    expect(store.loadReport?.status).toBe('empty');

    store.reset({ eventLog: true });
    expect(Object.keys(storage.snapshot())).toEqual(['ageborn.feel']);
  });
});
