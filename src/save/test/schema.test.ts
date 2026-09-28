import type * as v from 'valibot';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { PendingCapsule, PendingCrate, ReplayDoc, SaveDoc, Settings } from '@/contracts';
import { fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { DEFAULT_SETTINGS } from '../defaults';
import { SAVE_VERSION } from '../migrations';
import { type ReplayDocSchema, validateReplay } from '../replaySchema';
import { type PendingCapsuleSchema, type PendingCrateSchema, type SaveDocSchema, type SettingsSchema, validateSaveDoc } from '../schema';
import { goldenReplays, currentFixture } from './helpers';

describe('type parity (DESIGN B13 Schemas)', () => {
  it('schema outputs are exactly the contract types', () => {
    expectTypeOf<v.InferOutput<typeof SaveDocSchema>>().branded.toEqualTypeOf<SaveDoc>();
    expectTypeOf<v.InferOutput<typeof SettingsSchema>>().branded.toEqualTypeOf<Settings>();
    expectTypeOf<v.InferOutput<typeof PendingCapsuleSchema>>().branded.toEqualTypeOf<PendingCapsule>();
    expectTypeOf<v.InferOutput<typeof PendingCrateSchema>>().branded.toEqualTypeOf<PendingCrate>();
    expectTypeOf<v.InferOutput<typeof ReplayDocSchema>>().branded.toEqualTypeOf<ReplayDoc>();
  });
});

function withChange(mutate: (d: SaveDoc & Record<string, unknown>) => void): unknown {
  const d = currentFixture() as SaveDoc & Record<string, unknown>;
  mutate(d);
  return d;
}

describe('SaveDoc schema', () => {
  it('accepts the frozen fixture of the current version unchanged', () => {
    const doc = currentFixture();
    const r = validateSaveDoc(doc);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(doc);
    expect(doc.v).toBe(SAVE_VERSION);
  });

  it("accepts the contract fake's fresh save", () => {
    expect(validateSaveDoc(fakeSaveDoc()).ok).toBe(true);
  });

  it('strips unknown keys instead of failing', () => {
    const r = validateSaveDoc(withChange((d) => {
      d.somethingNew = 1;
      (d.profile as unknown as Record<string, unknown>).extra = 'x';
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect('somethingNew' in r.value).toBe(false);
    expect('extra' in r.value.profile).toBe(false);
  });

  const invalid: [string, (d: SaveDoc & Record<string, unknown>) => void, string][] = [
    ['a missing top-level field', (d) => delete (d as Partial<SaveDoc>).currencies, 'currencies'],
    ['a string where a number belongs', (d) => ((d.currencies as unknown as Record<string, unknown>).amber = '100'), 'currencies.amber'],
    ['negative Amber', (d) => (d.currencies.amber = -1), 'currencies.amber'],
    ['fractional Dust', (d) => (d.currencies.dust = 1.5), 'currencies.dust'],
    ['NaN', (d) => (d.mmr = Number.NaN), 'mmr'],
    ['Infinity (JSON would turn it into null)', (d) => (d.mmr = Number.POSITIVE_INFINITY), 'mmr'],
    ['a loadout with 4 unit slots', (d) => d.warPlans[0]!.loadouts.stone.units.pop(), 'warPlans.0.loadouts.stone.units'],
    ['a loadout with 3 turret slots', (d) => d.warPlans[0]!.loadouts.future.turrets.push(null), 'warPlans.0.loadouts.future.turrets'],
    ['a War Plan without the Future age', (d) => delete (d.warPlans[0]!.loadouts as Partial<Record<string, unknown>>).future, 'warPlans.0.loadouts.future'],
    ['no War Plans', (d) => (d.warPlans = []), 'warPlans'],
    ['activePlan beyond the plans', (d) => (d.activePlan = 2), 'activePlan'],
    ['an unknown foil', (d) => ((d.collection.bonker as { foil: string }).foil = 'gold'), 'collection.bonker.foil'],
    ['an unknown capsule tier', (d) => ((d.capsules.pending[0] as { tier: string }).tier = 'mythic'), 'capsules.pending.0.tier'],
    ['an rng word above uint32', (d) => (d.rng.capsule[3] = 2 ** 32), 'rng.capsule.3'],
    ['an rng state of 3 words', (d) => ((d.rng as { capsule: number[] }).capsule = [1, 2, 3]), 'rng.capsule'],
    ['a Conquest star row of 2', (d) => ((d.conquest.stars as Record<string, boolean[]>).kettle = [true, true]), 'conquest.stars.kettle'],
    ['version 0', (d) => (d.v = 0), 'v'],
    ['a non-object', () => undefined, ''],
  ];

  it.each(invalid)('rejects %s', (_name, mutate, path) => {
    const input = path === '' ? 'not a save' : withChange(mutate);
    const r = validateSaveDoc(input);
    expect(r.ok).toBe(false);
    if (!r.ok && path !== '') expect(r.issues.join('\n')).toContain(path);
  });

  it('rejects a doc of another version than the one expected', () => {
    const r = validateSaveDoc(currentFixture(), SAVE_VERSION + 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toMatch(new RegExp(`^v: expected ${SAVE_VERSION + 1}`));
  });
});

describe('settings fall back field by field', () => {
  it('replaces only the invalid fields with defaults', () => {
    const r = validateSaveDoc(withChange((d) => {
      d.settings.volume.music = 3;
      (d.settings as unknown as Record<string, unknown>).graphics = 'ultra';
      (d.settings as unknown as Record<string, unknown>).defaultSpeed = 3;
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const fixture = currentFixture().settings;
    expect(r.value.settings).toEqual({
      ...fixture,
      volume: { ...fixture.volume, music: DEFAULT_SETTINGS.volume.music },
      graphics: DEFAULT_SETTINGS.graphics,
      defaultSpeed: DEFAULT_SETTINGS.defaultSpeed,
    });
  });

  it('uses the defaults when settings are missing or not an object', () => {
    for (const bad of [undefined, null, 'loud', []]) {
      const r = validateSaveDoc(withChange((d) => ((d as Record<string, unknown>).settings = bad)));
      expect(r.ok).toBe(true);
      // The optional A15.6 flags may stay unset: a missing `breakReminder` means on, `quickReveal` off.
      if (r.ok) expect({ ...DEFAULT_SETTINGS, ...r.value.settings }).toEqual(DEFAULT_SETTINGS);
      if (r.ok) expect(r.value.settings.breakReminder ?? true).toBe(true);
    }
  });

  it('fills a settings field that is missing', () => {
    const r = validateSaveDoc(withChange((d) => delete (d.settings as Partial<Settings>).vibrate));
    expect(r.ok && r.value.settings.vibrate).toBe(DEFAULT_SETTINGS.vibrate);
  });

  it('never shares the default objects with a parsed doc', () => {
    const r = validateSaveDoc(withChange((d) => ((d as Record<string, unknown>).settings = null)));
    if (!r.ok) throw new Error('expected ok');
    r.value.settings.volume.master = 0;
    expect(DEFAULT_SETTINGS.volume.master).toBe(1);
  });
});

describe('ReplayDoc schema', () => {
  const golden = goldenReplays();

  it("accepts every golden replay recorded by the real sim (WP2's buildReplay) unchanged", () => {
    expect(golden.length).toBeGreaterThanOrEqual(10);
    for (const r of golden) {
      const res = validateReplay(r);
      expect(res.ok ? 'ok' : res.issues).toBe('ok');
      if (res.ok) expect(res.value).toEqual(r);
    }
  });

  it('reads a missing training field back as null', () => {
    const r = { ...golden[0]! } as Partial<ReplayDoc>;
    delete r.training;
    const res = validateReplay(r);
    expect(res.ok && res.value.training).toBe(null);
  });

  it('rejects a damaged command, outcome or version', () => {
    const base = golden[0]!;
    expect(validateReplay({ ...base, v: 2 }).ok).toBe(false);
    expect(validateReplay({ ...base, commands: [{ t: 'train', side: 0, slot: 7, tick: 1, seq: 0 }] }).ok).toBe(false);
    expect(validateReplay({ ...base, commands: [{ t: 'fly', side: 0, tick: 1, seq: 0 }] }).ok).toBe(false);
    expect(validateReplay({ ...base, result: { ...base.result, winner: 2 } }).ok).toBe(false);
    expect(validateReplay({ ...base, sides: [base.sides[0]] }).ok).toBe(false);
  });
});
