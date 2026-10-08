import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { preMigrationBackupKey, SLOT_KEYS } from '../defaults';
import { importSaveCode, encodeSaveCode } from '../exportImport';
import { migrate, migrationTable, SAVE_VERSION, SAVE_VERSIONS, type SaveVersion } from '../migrations';
import { validateSaveDoc } from '../schema';
import { decodeSlot, encodeEnvelope } from '../slots';
import { currentFixture, makeStore, SAVE_FIXTURES, v1Fixture } from './helpers';

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
    const doc = currentFixture();
    const m = migrate(doc);
    expect(m.ok && m.doc).toBe(doc);
  });
});

/** The version this build writes; the synthetic steps below come after it. */
const N = SAVE_VERSION;

/**
 * A synthetic chain on top of the real chain, as a later build would have it: v(N+1) renames
 * `profile.title` to `profile.titleId`, v(N+2) renames it back and adds 50 Dust.
 */
type Loose = Record<string, unknown> & { profile: Record<string, unknown>; currencies: { amber: number; dust: number } };

const NEXT: SaveVersion = {
  v: N + 1,
  summary: 'rename title',
  up: (doc) => {
    const d = doc as Loose;
    d.profile.titleId = d.profile.title;
    delete d.profile.title;
    return { ...d, v: N + 1 };
  },
};
const AFTER: SaveVersion = {
  v: N + 2,
  summary: 'rename back, Dust gift',
  up: (doc) => {
    const d = doc as Loose;
    d.profile.title = d.profile.titleId;
    delete d.profile.titleId;
    return { ...d, v: N + 2, currencies: { ...d.currencies, dust: d.currencies.dust + 50 } };
  },
};
const CHAIN = [...SAVE_VERSIONS, NEXT, AFTER];

describe('migrate (DESIGN B8 step 3)', () => {
  it('runs every step in order and reports each one before it runs', () => {
    const steps: string[] = [];
    const input = currentFixture();
    const before = JSON.stringify(input);
    const m = migrate(input, { versions: CHAIN, beforeStep: (d, from, to) => steps.push(`${from}->${to}:v${(d as { v: number }).v}`) });
    expect(steps).toEqual([`${N}->${N + 1}:v${N}`, `${N + 1}->${N + 2}:v${N + 1}`]);
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    const out = m.doc as SaveDoc;
    expect(out.v).toBe(N + 2);
    expect(out.profile.title).toBe(input.profile.title);
    expect(out.currencies.dust).toBe(input.currencies.dust + 50);
    expect(JSON.stringify(input)).toBe(before); // the input is never mutated
    expect(validateSaveDoc(out, N + 2).ok).toBe(true);
  });

  it('runs the real chain from v1 before the synthetic steps', () => {
    const steps: string[] = [];
    const m = migrate(v1Fixture(), { versions: CHAIN, beforeStep: (_d, from, to) => steps.push(`${from}->${to}`) });
    expect(steps).toEqual(Array.from({ length: N + 1 }, (_, i) => `${i + 1}->${i + 2}`));
    expect(m.ok && (m.doc as SaveDoc).v).toBe(N + 2);
  });

  it('starts from the stored version', () => {
    const next = { ...currentFixture(), v: N + 1, profile: { ...currentFixture().profile, titleId: 'recruit' } };
    const m = migrate(next, { versions: CHAIN });
    expect(m).toMatchObject({ ok: true, from: N + 1, to: N + 2 });
  });

  it('refuses docs from a newer build', () => {
    expect(migrate({ ...currentFixture(), v: N + 3 }, { versions: CHAIN })).toMatchObject({ ok: false, reason: 'tooNew', from: N + 3 });
    expect(migrate({ ...currentFixture(), v: SAVE_VERSION + 1 })).toMatchObject({ ok: false, reason: 'tooNew' });
  });

  it('refuses things that are not saves', () => {
    for (const x of [null, 3, 'save', [], {}, { v: '1' }]) expect(migrate(x)).toMatchObject({ ok: false, reason: 'notASave' });
    for (const x of [{ v: 0 }, { v: -1 }, { v: 1.5 }]) expect(migrate(x)).toMatchObject({ ok: false, reason: 'badVersion' });
  });

  it('reports a step that throws or forgets to bump the version', () => {
    const throws: SaveVersion = { v: N + 1, summary: 'broken', up: () => { throw new Error('boom'); } };
    expect(migrate(currentFixture(), { versions: [...SAVE_VERSIONS, throws] })).toMatchObject({ ok: false, reason: 'migrationFailed' });
    const noBump: SaveVersion = { v: N + 1, summary: 'forgot v', up: (d) => d };
    const r = migrate(currentFixture(), { versions: [...SAVE_VERSIONS, noBump] });
    expect(r).toMatchObject({ ok: false, reason: 'migrationFailed' });
    if (!r.ok) expect(r.detail).toContain(`produced v${N}`);
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
    const old = currentFixture();
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(old), N, 100));
    const doc = await store.load();
    expect(doc?.v).toBe(N + 2);
    expect(doc?.currencies.dust).toBe(old.currencies.dust + 50);
    expect(store.loadReport).toMatchObject({ status: 'loaded', slot: 'A', fromVersion: N, migrated: true });

    const preNext = decodeSlot('A', storage.getItem(preMigrationBackupKey(N + 1)));
    const preAfter = decodeSlot('A', storage.getItem(preMigrationBackupKey(N + 2)));
    expect(preNext.ok && preNext.doc).toEqual(old);
    expect(preAfter.ok && (preAfter.doc as { v: number }).v).toBe(N + 1);
    // The original slot is untouched until the next save, which goes to the other slot.
    expect(storage.getItem(SLOT_KEYS.A)).toBe(encodeEnvelope(JSON.stringify(old), N, 100));
    expect(store.nextWriteSlot).toBe('B');
  });

  it('loading a v1 slot runs the real chain (A17.13 eight ages) and keeps a pre-v2 backup', async () => {
    const { store, storage } = makeStore();
    const old = v1Fixture();
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(old), 1, 100));
    const doc = await store.load();
    expect(doc?.v).toBe(SAVE_VERSION);
    expect(Object.keys(doc?.warPlans[0]?.loadouts ?? {})).toHaveLength(8);
    expect(store.loadReport).toMatchObject({ status: 'loaded', fromVersion: 1, migrated: true });
    const pre2 = decodeSlot('A', storage.getItem(preMigrationBackupKey(2)));
    expect(pre2.ok && pre2.doc).toEqual(old);
  });

  it('keeps the first backup: a second load does not overwrite it', async () => {
    const { store, storage } = makeStore({ versions: CHAIN });
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(currentFixture()), N, 100));
    await store.load();
    const first = storage.getItem(preMigrationBackupKey(N + 1));
    const changed = { ...currentFixture(), currencies: { amber: 1, dust: 1 } };
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(changed), N, 200));
    await store.load();
    expect(storage.getItem(preMigrationBackupKey(N + 1))).toBe(first);
  });

  it('a migrated save is written in the new version by the next save', async () => {
    const { store, storage } = makeStore({ versions: CHAIN });
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(currentFixture()), N, 100));
    const doc = (await store.load())!;
    await store.save(doc, { immediate: true });
    const b = decodeSlot('B', storage.getItem(SLOT_KEYS.B));
    expect(b.ok && b.envelope.v).toBe(N + 2);
    const again = makeStore({ versions: CHAIN, storage });
    expect(await again.store.load()).toEqual(doc);
    expect(again.store.loadReport).toMatchObject({ slot: 'B', fromVersion: N + 2, migrated: false });
  });

  it('import migrates an old code (DESIGN B8: import validates and migrates)', () => {
    const code = encodeSaveCode(currentFixture());
    const r = importSaveCode(code, { versions: CHAIN });
    expect(r).toMatchObject({ ok: true, fromVersion: N });
    expect(r.ok && r.value.v).toBe(N + 2);
    const v1 = importSaveCode(encodeSaveCode(v1Fixture()));
    expect(v1).toMatchObject({ ok: true, fromVersion: 1 });
    expect(v1.ok && v1.value.v).toBe(SAVE_VERSION);
  });

  it('a slot whose migration fails is skipped like a damaged one', async () => {
    const broken: SaveVersion = { v: N + 1, summary: 'broken', up: () => { throw new Error('boom'); } };
    const { store, storage } = makeStore({ versions: [...SAVE_VERSIONS, broken] });
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(currentFixture()), N, 100));
    expect(await store.load()).toBeNull();
    expect(store.loadReport?.status).toBe('unreadable');
    expect(store.loadReport?.slots.find((s) => s.slot === 'A')?.outcome).toBe('migrationFailed');
  });
});

describe('v1 → v2: eight ages (A17.13)', () => {
  const NEW_COMMONS = [
    'hoplite', 'javelineer', 'war_chariot', 'archer_tower', 'sun_mirror',
    'riveter', 'carbineer', 'steam_golem', 'gatling_gun', 'mortar_pit',
    'star_legionnaire', 'ion_ranger', 'hover_tank', 'ion_turret', 'starburst_gun',
  ];

  it('every War Plan gains Bronze, Industrial and Cosmic starter loadouts; the old loadouts are untouched', () => {
    const old = v1Fixture();
    // Up to v6: v7 (A2.9) then moves every power into its typed slot (powerSlots.test.ts).
    const m = migrate(old, { versions: SAVE_VERSIONS.filter((s) => s.v < 7) });
    if (!m.ok) throw new Error(m.reason);
    const doc = m.doc as SaveDoc;
    expect(doc.v).toBe(6);
    doc.warPlans.forEach((p, i) => {
      const before = old.warPlans[i]!;
      expect(Object.keys(p.loadouts)).toEqual(['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic']);
      // v4 (A18.9) then adds an empty sixth troop slot to every loadout
      const six = <L extends { units: (string | null)[] }>(l: L): L => ({ ...l, units: [...l.units, null] });
      for (const age of ['stone', 'medieval', 'gunpowder', 'modern', 'future'] as const) expect(p.loadouts[age]).toEqual(six(before.loadouts[age]));
      expect(p.loadouts.bronze).toEqual({ units: ['hoplite', 'javelineer', 'war_chariot', null, null, null], turrets: ['archer_tower', 'sun_mirror'], power: 'tidal_wave' });
      expect(p.loadouts.industrial).toEqual({ units: ['riveter', 'carbineer', 'steam_golem', null, null, null], turrets: ['gatling_gun', 'mortar_pit'], power: 'iron_horse' });
      expect(p.loadouts.cosmic).toEqual({ units: ['star_legionnaire', 'ion_ranger', 'hover_tank', null, null, null], turrets: ['ion_turret', 'starburst_gun'], power: 'starfall' });
      expect(p.name).toBe(before.name);
    });
  });

  it('the collection gains the 15 new starter Commons at L1 and the 3 default powers; nothing owned is lost', () => {
    const old = v1Fixture();
    const m = migrate(old, { versions: SAVE_VERSIONS.slice(0, 2) });
    if (!m.ok) throw new Error(m.reason);
    const doc = m.doc as SaveDoc;
    for (const id of Object.keys(old.collection)) expect(doc.collection[id]).toEqual(old.collection[id]);
    for (const id of NEW_COMMONS) expect(doc.collection[id], id).toEqual({ level: 1, copies: 0, isNew: false, foil: 'none' });
    expect(Object.keys(doc.collection)).toHaveLength(Object.keys(old.collection).length + NEW_COMMONS.length);
    expect(doc.powersOwned).toEqual([...old.powersOwned, 'tidal_wave', 'iron_horse', 'starfall']);
    // Everything else is carried over as it was.
    expect({ ...doc, v: 1, warPlans: old.warPlans, collection: old.collection, powersOwned: old.powersOwned }).toEqual(old);
  });

  it('keeps a card or power the doc already holds (no duplicate, no reset)', () => {
    const old = v1Fixture();
    old.collection.hoplite = { level: 4, copies: 7, isNew: true, foil: 'silver' };
    old.powersOwned.push('starfall');
    const m = migrate(old);
    if (!m.ok) throw new Error(m.reason);
    const doc = m.doc as SaveDoc;
    expect(doc.collection.hoplite).toEqual({ level: 4, copies: 7, isNew: true, foil: 'silver' });
    expect(doc.powersOwned.filter((p) => p === 'starfall')).toHaveLength(1);
  });
});

describe('v2 → v3: cosmetic collections (A18.9.4)', () => {
  it('adds the starter cosmetic loadout and a cosmetic RNG stream; nothing owned changes', () => {
    const old = SAVE_FIXTURES[2] as SaveDoc;
    const m = migrate(old);
    if (!m.ok) throw new Error(m.reason);
    const doc = m.doc as SaveDoc;
    expect(doc.v).toBe(SAVE_VERSION);
    expect(doc.cosmetics.owned).toEqual(old.cosmetics.owned);
    expect(doc.cosmetics.equipped).toEqual({
      emotes: ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'],
      quotes: ['quote.glhf', 'quote.well_played', 'quote.nice_move', 'quote.so_close'],
      baseFlag: 'baseFlag.ember',
      nationalFlag: null,
      baseSkins: {},
      decorations: ['decoration.fire_bowl', null, 'decoration.fern'],
      // v8: the battle backdrop skin, classic skies until the player picks one
      backdrop: null,
      // v14: every age on its classic scene
      scenes: {},
    });
    expect(doc.rng.capsule).toEqual(old.rng.capsule);
    expect(doc.rng.cosmetic).toHaveLength(4);
    expect(doc.rng.cosmetic).not.toEqual(old.rng.capsule);
    // v6 (the capsule ladder) only sorts the bag and records its size
    expect(doc.capsules).toEqual({ ...old.capsules, bag: [...old.capsules.bag].sort((a, b) => a - b), bagSize: 100 });
  });
});
