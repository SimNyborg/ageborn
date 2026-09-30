/**
 * Save v11, the Fort slot (DESIGN A16.14.6, spec section 6): every loadout of every preset gains `fort`,
 * the save gains `fortsOwned`; Bronze L4 or 400 trophies open the slot with the walls and the Stone set
 * and fill every empty Fort slot with its age's wall; cleared L4/L6/L8 and claimed fort-set Road nodes
 * grant their forts (a card from both sources pays 60 Amber once). Additive and idempotent.
 */
import { describe, expect, it } from 'vitest';
import { migrate, SAVE_VERSION } from '../migrations';
import { FORT_SLOT_FLAG, v11 } from '../migrations/v11';
import { validateSaveDoc } from '../schema';
import { SAVE_FIXTURES } from './helpers';

type Loadout = { units: unknown[]; turrets: unknown[]; powers: unknown; fort?: string | null };
type Doc = Record<string, unknown> & {
  v: number;
  flags: Record<string, boolean>;
  fortsOwned?: string[];
  trophies: { current: number; best: number; roadClaimed: number[] };
  warPath: { stars: Record<string, number> };
  warPlans: { name: string; loadouts: Record<string, Loadout> }[];
  currencies: { amber: number; dust: number };
  collection: Record<string, unknown>;
  powersOwned: string[];
  matchesPlayed: number;
};

const WALLS = ['palisade', 'cyclopean_wall', 'shield_barricade', 'gabion_wall', 'trench_parapet', 'sandbag_bunker', 'hardlight_barrier', 'void_rampart'];
const STONE_SET = ['war_camp', 'spike_pit', 'sling_perch'];
const WALL_OF: Record<string, string> = {
  stone: 'palisade',
  bronze: 'cyclopean_wall',
  medieval: 'shield_barricade',
  gunpowder: 'gabion_wall',
  industrial: 'trench_parapet',
  modern: 'sandbag_bunker',
  future: 'hardlight_barrier',
  cosmic: 'void_rampart',
};

/** The frozen v10 fixture (best 455 trophies) reshaped into a scenario. */
function v10(o: { best?: number; stars?: Record<string, number>; claimed?: number[]; presets?: number } = {}): Doc {
  const d = JSON.parse(JSON.stringify(SAVE_FIXTURES[10])) as Doc;
  d.trophies = { ...d.trophies, best: o.best ?? 0, current: Math.min(d.trophies.current, o.best ?? 0), roadClaimed: o.claimed ?? [] };
  d.warPath = { ...d.warPath, stars: o.stars ?? {} };
  d.flags = Object.fromEntries(Object.entries(d.flags).filter(([k]) => k !== FORT_SLOT_FLAG));
  const first = d.warPlans[0];
  if (first) d.warPlans = Array.from({ length: o.presets ?? d.warPlans.length }, (_, i) => ({ ...JSON.parse(JSON.stringify(first)), name: 'ABC'[i] ?? 'A' }));
  return d;
}

function run(d: Doc): Doc {
  const m = migrate(d);
  if (!m.ok) throw new Error(`migration failed: ${m.reason} ${m.detail ?? ''}`);
  const valid = validateSaveDoc(m.doc);
  expect(valid.ok ? 'ok' : valid.issues).toBe('ok');
  return m.doc as Doc;
}

const stars = (ids: string[]): Record<string, number> => Object.fromEntries(ids.map((id) => [id, 1]));
const fortsOf = (d: Doc): string[] => [...(d.fortsOwned ?? [])].sort();
const slots = (d: Doc): (string | null | undefined)[] => d.warPlans.flatMap((p) => Object.keys(p.loadouts).map((a) => p.loadouts[a]?.fort));

function keepsEverything(before: Doc, after: Doc): void {
  expect(Object.keys(after.collection).sort()).toEqual(Object.keys(before.collection).sort());
  expect(after.powersOwned).toEqual(before.powersOwned);
  for (const [i, plan] of before.warPlans.entries()) {
    for (const age of Object.keys(plan.loadouts)) {
      const b = plan.loadouts[age];
      const a = after.warPlans[i]?.loadouts[age];
      expect(a?.units).toEqual(b?.units);
      expect(a?.turrets).toEqual(b?.turrets);
      expect(a?.powers).toEqual(b?.powers);
    }
  }
}

describe('v10 → v11: the Fort slot', () => {
  it('fresh save: no flag, no forts, every Fort slot empty', () => {
    const before = v10({ best: 0 });
    const after = run(before);
    expect(after.v).toBe(SAVE_VERSION);
    expect(after.flags[FORT_SLOT_FLAG]).toBeUndefined();
    expect(after.fortsOwned).toEqual([]);
    expect(slots(after).every((s) => s === null)).toBe(true);
    keepsEverything(before, after);
  });

  it('Stone-only War Path with L4, L6 and L8 cleared: no forts, no flag (Stone levels grant none)', () => {
    const after = run(v10({ best: 100, stars: stars(['wp.stone.l04', 'wp.stone.l06', 'wp.stone.l08']) }));
    expect(after.flags[FORT_SLOT_FLAG]).toBeUndefined();
    expect(after.fortsOwned).toEqual([]);
  });

  it('Bronze L4 cleared: the flag, the walls, the Stone set and the Bronze camp', () => {
    const before = v10({ best: 120, stars: stars(['wp.stone.l10', 'wp.bronze.l04']) });
    const after = run(before);
    expect(after.flags[FORT_SLOT_FLAG]).toBe(true);
    expect(fortsOf(after)).toEqual([...WALLS, ...STONE_SET, 'muster_tents'].sort());
    for (const plan of after.warPlans) for (const age of Object.keys(plan.loadouts)) expect(plan.loadouts[age]?.fort).toBe(WALL_OF[age]);
    keepsEverything(before, after);
  });

  it('450 trophies, ladder only: the flag, the walls and the Stone set', () => {
    const after = run(v10({ best: 450 }));
    expect(after.flags[FORT_SLOT_FLAG]).toBe(true);
    expect(fortsOf(after)).toEqual([...WALLS, ...STONE_SET].sort());
  });

  it('War Path cleared to Medieval: the Bronze and Medieval camps, traps and towers', () => {
    const levels = ['bronze', 'medieval'].flatMap((r) => [4, 6, 8].map((n) => `wp.${r}.l0${n}`));
    const after = run(v10({ best: 300, stars: stars(levels) }));
    expect(fortsOf(after)).toEqual(
      [...WALLS, ...STONE_SET, 'muster_tents', 'hidden_stakes', 'pyrgos_tower', 'levy_camp', 'wolf_pits', 'longbow_tower'].sort(),
    );
  });

  it('Road claimed to 2,500: the fort sets of Bronze, Medieval and Gunpowder; a card from both sources pays 60 Amber once', () => {
    const before = v10({ best: 2550, claimed: [2200, 2300, 2400, 2500], stars: stars(['wp.bronze.l04']) });
    const after = run(before);
    expect(fortsOf(after)).toEqual(
      [...WALLS, ...STONE_SET, 'muster_tents', 'hidden_stakes', 'pyrgos_tower', 'levy_camp', 'wolf_pits', 'longbow_tower', 'militia_muster', 'powder_keg', 'musket_redoubt'].sort(),
    );
    expect(new Set(after.fortsOwned).size).toBe(after.fortsOwned?.length);
    expect(after.currencies.amber).toBe(before.currencies.amber + 60);
  });

  it('presets B and C with empty slots are filled too; a slot that holds a fort is kept', () => {
    const before = v10({ best: 500, presets: 3 });
    const plan = before.warPlans[2];
    if (plan?.loadouts.stone) plan.loadouts.stone.fort = 'war_camp';
    const after = run(before);
    expect(after.warPlans).toHaveLength(3);
    expect(after.warPlans[0]?.loadouts.bronze?.fort).toBe('cyclopean_wall');
    expect(after.warPlans[1]?.loadouts.cosmic?.fort).toBe('void_rampart');
    expect(after.warPlans[2]?.loadouts.stone?.fort).toBe('war_camp');
    expect(slots(after).every((s) => typeof s === 'string')).toBe(true);
  });

  it('is idempotent', () => {
    const d = v10({ best: 2600, claimed: [2200], stars: stars(['wp.bronze.l04', 'wp.bronze.l06']) });
    const once = v11.up!(JSON.parse(JSON.stringify(d))) as Doc;
    const twice = v11.up!(JSON.parse(JSON.stringify({ ...once, v: 10 }))) as Doc;
    expect(twice).toEqual(once);
  });
});
