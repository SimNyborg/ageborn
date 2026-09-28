import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { preMigrationBackupKey, SLOT_KEYS } from '../defaults';
import { importSaveCode, encodeSaveCode } from '../exportImport';
import { migrate, migrationTable, SAVE_VERSION, SAVE_VERSIONS, type SaveVersion } from '../migrations';
import { validateSaveDoc } from '../schema';
import { decodeSlot, encodeEnvelope } from '../slots';
import { makeStore, SAVE_FIXTURES, v1Fixture } from './helpers';

describe('the real version chain', () => {
  it('starts at v1, is consecutive and ends at SAVE_VERSION', () => {
    expect(SAVE_VERSIONS[0]?.v).toBe(1);
    expect(SAVE_VERSIONS[0]?.up).toBeUndefined();
    expect(() => migrationTable()).not.toThrow();
    expect(SAVE_VERSIONS[SAVE_VERSIONS.length - 1]?.v).toBe(SAVE_VERSION);
  });

  it('has a frozen fixture for every version (DESIGN B13: v1 fixture from day one)', () => {
    const missing = SAVE_VERSIONS.map((s) => s.v).filter((ver) => SAVE_FIXTURES[ver] === undefined);
    expect(missing).toEqual([]);
  });

  it.each(SAVE_VERSIONS.map((s) => s.v))('the v%i fixture migrates to the current version and validates', (ver) => {
    const fixture = SAVE_FIXTURES[ver];
    expect((fixture as { v: number }).v).toBe(ver);
    const m = migrate(fixture);
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(m).toMatchObject({ from: ver, to: SAVE_VERSION });
    const valid = validateSaveDoc(m.doc);
    expect(valid.ok ? 'ok' : valid.issues).toBe('ok');
  });

  it('leaves a current doc untouched', () => {
    const doc = v1Fixture();
    const m = migrate(doc);
    expect(m.ok && m.doc).toBe(doc);
  });
});

/**
 * A synthetic chain on top of the real v1 format, as a later build would have it:
 * v2 renames `profile.title` to `profile.titleId`, v3 renames it back and adds 50 Dust.
 */
type Loose = Record<string, unknown> & { profile: Record<string, unknown>; currencies: { amber: number; dust: number } };

const V2: SaveVersion = {
  v: 2,
  summary: 'rename title',
  up: (doc) => {
    const d = doc as Loose;
    d.profile.titleId = d.profile.title;
    delete d.profile.title;
    return { ...d, v: 2 };
  },
};
const V3: SaveVersion = {
  v: 3,
  summary: 'rename back, Dust gift',
  up: (doc) => {
    const d = doc as Loose;
    d.profile.title = d.profile.titleId;
    delete d.profile.titleId;
    return { ...d, v: 3, currencies: { ...d.currencies, dust: d.currencies.dust + 50 } };
  },
};
const CHAIN = [SAVE_VERSIONS[0]!, V2, V3];

describe('migrate (DESIGN B8 step 3)', () => {
  it('runs every step in order and reports each one before it runs', () => {
    const steps: string[] = [];
    const input = v1Fixture();
    const before = JSON.stringify(input);
    const m = migrate(input, { versions: CHAIN, beforeStep: (d, from, to) => steps.push(`${from}->${to}:v${(d as { v: number }).v}`) });
    expect(steps).toEqual(['1->2:v1', '2->3:v2']);
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    const out = m.doc as SaveDoc;
    expect(out.v).toBe(3);
    expect(out.profile.title).toBe(input.profile.title);
    expect(out.currencies.dust).toBe(input.currencies.dust + 50);
    expect(JSON.stringify(input)).toBe(before); // the input is never mutated
    expect(validateSaveDoc(out, 3).ok).toBe(true);
  });

  it('starts from the stored version', () => {
    const v2doc = { ...v1Fixture(), v: 2, profile: { ...v1Fixture().profile, titleId: 'recruit' } };
    const m = migrate(v2doc, { versions: CHAIN });
    expect(m).toMatchObject({ ok: true, from: 2, to: 3 });
  });

  it('refuses docs from a newer build', () => {
    expect(migrate({ ...v1Fixture(), v: 4 }, { versions: CHAIN })).toMatchObject({ ok: false, reason: 'tooNew', from: 4 });
    expect(migrate({ ...v1Fixture(), v: SAVE_VERSION + 1 })).toMatchObject({ ok: false, reason: 'tooNew' });
  });

  it('refuses things that are not saves', () => {
    for (const x of [null, 3, 'save', [], {}, { v: '1' }]) expect(migrate(x)).toMatchObject({ ok: false, reason: 'notASave' });
    for (const x of [{ v: 0 }, { v: -1 }, { v: 1.5 }]) expect(migrate(x)).toMatchObject({ ok: false, reason: 'badVersion' });
  });

  it('reports a step that throws or forgets to bump the version', () => {
    const throws: SaveVersion = { v: 2, summary: 'broken', up: () => { throw new Error('boom'); } };
    expect(migrate(v1Fixture(), { versions: [SAVE_VERSIONS[0]!, throws] })).toMatchObject({ ok: false, reason: 'migrationFailed' });
    const noBump: SaveVersion = { v: 2, summary: 'forgot v', up: (d) => d };
    const r = migrate(v1Fixture(), { versions: [SAVE_VERSIONS[0]!, noBump] });
    expect(r).toMatchObject({ ok: false, reason: 'migrationFailed' });
    if (!r.ok) expect(r.detail).toContain('produced v1');
  });

  it('rejects a broken version list', () => {
    expect(() => migrationTable([{ v: 2, summary: 'x' }])).toThrow();
    expect(() => migrationTable([SAVE_VERSIONS[0]!, { v: 3, summary: 'gap', up: (d) => d }])).toThrow();
    expect(() => migrationTable([SAVE_VERSIONS[0]!, { v: 2, summary: 'no up' }])).toThrow();
  });
});

describe('migrations in the store and on import', () => {
  it('loading an old slot migrates it and first writes ageborn.backup.pre-v<N> for each step', async () => {
    const { store, storage } = makeStore({ versions: CHAIN });
    const old = v1Fixture();
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(old), 1, 100));
    const doc = await store.load();
    expect(doc?.v).toBe(3);
    expect(doc?.currencies.dust).toBe(old.currencies.dust + 50);
    expect(store.loadReport).toMatchObject({ status: 'loaded', slot: 'A', fromVersion: 1, migrated: true });

    const pre2 = decodeSlot('A', storage.getItem(preMigrationBackupKey(2)));
    const pre3 = decodeSlot('A', storage.getItem(preMigrationBackupKey(3)));
    expect(pre2.ok && pre2.doc).toEqual(old);
    expect(pre3.ok && (pre3.doc as { v: number }).v).toBe(2);
    // The original slot is untouched until the next save, which goes to the other slot.
    expect(storage.getItem(SLOT_KEYS.A)).toBe(encodeEnvelope(JSON.stringify(old), 1, 100));
    expect(store.nextWriteSlot).toBe('B');
  });

  it('keeps the first backup: a second load does not overwrite it', async () => {
    const { store, storage } = makeStore({ versions: CHAIN });
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(v1Fixture()), 1, 100));
    await store.load();
    const first = storage.getItem(preMigrationBackupKey(2));
    const changed = { ...v1Fixture(), currencies: { amber: 1, dust: 1 } };
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(changed), 1, 200));
    await store.load();
    expect(storage.getItem(preMigrationBackupKey(2))).toBe(first);
  });

  it('a migrated save is written in the new version by the next save', async () => {
    const { store, storage } = makeStore({ versions: CHAIN });
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(v1Fixture()), 1, 100));
    const doc = (await store.load())!;
    await store.save(doc, { immediate: true });
    const b = decodeSlot('B', storage.getItem(SLOT_KEYS.B));
    expect(b.ok && b.envelope.v).toBe(3);
    const again = makeStore({ versions: CHAIN, storage });
    expect(await again.store.load()).toEqual(doc);
    expect(again.store.loadReport).toMatchObject({ slot: 'B', fromVersion: 3, migrated: false });
  });

  it('import migrates an old code (DESIGN B8: import validates and migrates)', () => {
    const code = encodeSaveCode(v1Fixture());
    const r = importSaveCode(code, { versions: CHAIN });
    expect(r).toMatchObject({ ok: true, fromVersion: 1 });
    expect(r.ok && r.value.v).toBe(3);
  });

  it('a slot whose migration fails is skipped like a damaged one', async () => {
    const broken: SaveVersion = { v: 2, summary: 'broken', up: () => { throw new Error('boom'); } };
    const { store, storage } = makeStore({ versions: [SAVE_VERSIONS[0]!, broken] });
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(v1Fixture()), 1, 100));
    expect(await store.load()).toBeNull();
    expect(store.loadReport?.status).toBe('unreadable');
    expect(store.loadReport?.slots.find((s) => s.slot === 'A')?.outcome).toBe('migrationFailed');
  });
});
