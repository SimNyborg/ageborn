/**
 * Save v7: two typed power slots (DESIGN A2.9.1, A2.9.8). The fixtures are built from the frozen v6
 * fixture, one per case the design names: a fresh save, the default power equipped, a Road alternate
 * equipped, "Stampede equipped, 50 trophies", War Path Stone L7 cleared, "road claimed to 1,000" and a
 * save at 160 trophies. Every case checks that no owned id is lost, that every loadout has both slots
 * set by the rule, that no power is granted twice and that the step is idempotent.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { migrate, SAVE_VERSION } from '../migrations';
import { POWER_FIELD_FLAG, v7 } from '../migrations/v7';
import { validateSaveDoc } from '../schema';
import { SAVE_FIXTURES } from './helpers';

type V6 = Record<string, unknown> & {
  v: number;
  warPlans: { name: string; loadouts: Record<string, { units: (string | null)[]; turrets: (string | null)[]; power?: string }> }[];
  powersOwned: string[];
  currencies: { amber: number; dust: number };
  trophies: { current: number; best: number; roadClaimed: number[] };
  warPath: { stars: Record<string, number> };
  matchesPlayed: number;
  flags: Record<string, boolean>;
};

const OLD_POWERS = ['stampede', 'arrow_storm', 'smoke_screen', 'paratroopers', 'orbital_lance', 'tidal_wave', 'iron_horse', 'starfall'];
const NEW_STARTERS = ['rockslide', 'chariot_rush', 'knights_charge', 'volley_fire', 'gun_line', 'strafing_run', 'drone_swarm', 'comet_run'];

/** The v6 fixture reshaped into a case. */
function v6(o: { matches?: number; best?: number; claimed?: number[]; stars?: Record<string, number>; stone?: string; owned?: string[] } = {}): V6 {
  const d = JSON.parse(JSON.stringify(SAVE_FIXTURES[6])) as V6;
  d.matchesPlayed = o.matches ?? 0;
  d.trophies = { current: o.best ?? 0, best: o.best ?? 0, roadClaimed: o.claimed ?? [] };
  d.warPath = { ...d.warPath, stars: o.stars ?? {} };
  d.powersOwned = o.owned ?? [...OLD_POWERS];
  d.flags = {};
  for (const plan of d.warPlans) {
    for (const age of Object.keys(plan.loadouts)) {
      const l = plan.loadouts[age];
      if (l && age === 'stone') l.power = o.stone ?? 'stampede';
    }
  }
  return d;
}

function up(doc: V6): SaveDoc {
  const out = v7.up?.(JSON.parse(JSON.stringify(doc))) as SaveDoc;
  expect(out.v).toBe(7);
  return out;
}

/** The checks every case shares. */
function common(before: V6, after: SaveDoc): void {
  for (const id of before.powersOwned) expect(after.powersOwned).toContain(id);
  expect(new Set(after.powersOwned).size).toBe(after.powersOwned.length);
  for (const id of NEW_STARTERS) expect(after.powersOwned).toContain(id);
  for (const plan of after.warPlans) {
    for (const [age, l] of Object.entries(plan.loadouts)) {
      expect(l.powers.home, `${age} home`).not.toBeNull();
      expect(l.powers.field, `${age} field`).not.toBeNull();
      expect((l as unknown as { power?: unknown }).power).toBeUndefined();
    }
  }
  // Idempotent: running the step again on its own output changes nothing but the version stamp.
  const again = v7.up?.(JSON.parse(JSON.stringify({ ...after, v: 6 }))) as SaveDoc;
  expect(again).toEqual(after);
  const m = migrate(JSON.parse(JSON.stringify(before)));
  expect(m.ok).toBe(true);
  if (m.ok) {
    expect((m.doc as SaveDoc).v).toBe(SAVE_VERSION);
    const valid = validateSaveDoc(m.doc);
    expect(valid.ok ? 'ok' : valid.issues).toBe('ok');
  }
}

describe('save v7: two power slots (A2.9.1, A2.9.8)', () => {
  it('a fresh save: both starters in every age, the Field slot stays locked', () => {
    const before = v6();
    const after = up(before);
    common(before, after);
    const stone = after.warPlans[0]?.loadouts.stone;
    expect(stone?.powers).toEqual({ home: 'rockslide', field: 'stampede' });
    // Royal Decree (a Road power) keeps its Field slot; Arrow Storm is the Home starter.
    expect(after.warPlans[0]?.loadouts.medieval.powers).toEqual({ home: 'arrow_storm', field: 'royal_decree' });
    expect(after.warPlans[1]?.loadouts.medieval.powers).toEqual({ home: 'arrow_storm', field: 'knights_charge' });
    expect(after.warPlans[0]?.loadouts.modern.powers).toEqual({ home: 'strafing_run', field: 'paratroopers' });
    expect(after.flags[POWER_FIELD_FLAG]).toBeUndefined();
    expect(after.currencies.amber).toBe(before.currencies.amber);
  });

  it('the default power equipped moves into its slot (Stampede is a Field power now)', () => {
    const before = v6({ matches: 1 });
    const after = up(before);
    common(before, after);
    expect(after.warPlans[0]?.loadouts.stone.powers).toEqual({ home: 'rockslide', field: 'stampede' });
    expect(after.flags[POWER_FIELD_FLAG]).toBe(true);
  });

  it('a Road alternate equipped keeps its slot; the other slot gets the starter', () => {
    const before = v6({ matches: 4, best: 120, claimed: [100], stone: 'meteor_shower', owned: [...OLD_POWERS, 'meteor_shower'] });
    const after = up(before);
    common(before, after);
    expect(after.warPlans[0]?.loadouts.stone.powers).toEqual({ home: 'meteor_shower', field: 'stampede' });
  });

  it('"Stampede equipped, 50 trophies": the Field slot unlocks for a save that has played', () => {
    const before = v6({ matches: 3, best: 50 });
    const after = up(before);
    common(before, after);
    expect(after.flags[POWER_FIELD_FLAG]).toBe(true);
    expect(after.warPlans[0]?.loadouts.stone.powers.field).toBe('stampede');
  });

  it('War Path Stone L7 cleared: its cleared levels grant their powers and unlock the Field slot', () => {
    const stars = { 'wp.stone.l01': 1, 'wp.stone.l02': 2, 'wp.stone.l03': 1, 'wp.stone.l04': 1, 'wp.stone.l05': 1, 'wp.stone.l06': 1, 'wp.stone.l07': 3 };
    const before = v6({ stars });
    const after = up(before);
    common(before, after);
    expect(after.powersOwned).toContain('sticky_tar');
    expect(after.powersOwned).toContain('hunt_cry');
    expect(after.powersOwned).not.toContain('hunters_spear');
    expect(after.flags[POWER_FIELD_FLAG]).toBe(true);
  });

  it('"road claimed to 1,000": the 550-950 items are granted once; a double source pays 60 Amber once', () => {
    const claimed = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000];
    const before = v6({ matches: 40, best: 1020, claimed, stars: { 'wp.stone.l05': 2 } });
    const after = up(before);
    common(before, after);
    for (const id of ['sticky_tar', 'hunt_cry', 'hunters_spear', 'zeus_bolts', 'apollo_arrow', 'medusa_gaze', 'caltrops', 'undermine']) {
      expect(after.powersOwned.filter((x) => x === id)).toHaveLength(1);
    }
    expect(after.powersOwned).not.toContain('boiling_oil');
    // Sticky Tar came from both the road (550) and War Path Stone L5: 60 Amber, once.
    expect(after.currencies.amber - before.currencies.amber).toBe(60);
  });

  it('a save at 160 trophies unlocks the Field slot', () => {
    const before = v6({ best: 160 });
    const after = up(before);
    common(before, after);
    expect(after.flags[POWER_FIELD_FLAG]).toBe(true);
  });

  it('an unknown stored power leaves both slots on the starters (nothing crashes)', () => {
    const before = v6({ stone: 'no_such_power' });
    const after = up(before);
    expect(after.warPlans[0]?.loadouts.stone.powers).toEqual({ home: 'rockslide', field: 'stampede' });
  });
});
