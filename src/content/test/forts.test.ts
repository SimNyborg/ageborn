/**
 * The Fort roster and its static gates (DESIGN A16.14.3-A16.14.4, A16.14.9 "Static" row, spec sections 4
 * and 12.2): 32 forts with their A16.14.4 numbers, 24 hidden twins and 8 levies, the trap budget, the
 * tower reach and the cover invariant, the wall hold time at the contact cap, fort life in Siege against
 * the shortest Siege, the starter answer, sources and the Road fort sets.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, FortDef, UnitDef } from '@/contracts';
import { carriesStructureMod } from '@/core/forts';
import { AGE_ORDER } from '../ages';
import { content } from '../index';
import { validateContent } from '../schema';

const f = content.economy.fort;
if (!f) throw new Error('content has no economy.fort');
const forts = Object.values(content.forts);
const common = (age: AgeId, group: UnitDef['group']): UnitDef => {
  const u = Object.values(content.units).find((x) => x.age === age && x.group === group && x.rarity === 'common' && !x.hidden);
  if (!u) throw new Error(`no ${group} Common in ${age}`);
  return u;
};
const of = (age: AgeId, kind: FortDef['fortKind']): FortDef => {
  const x = forts.find((y) => y.age === age && y.fortKind === kind);
  if (!x) throw new Error(`no ${kind} in ${age}`);
  return x;
};

/** A16.14.4 table: [wall, tower, camp → levy, trap] ids per age. */
const ROSTER: Record<AgeId, [string, string, string, string, string]> = {
  stone: ['palisade', 'sling_perch', 'war_camp', 'cave_youth', 'spike_pit'],
  bronze: ['cyclopean_wall', 'pyrgos_tower', 'muster_tents', 'citizen_levy', 'hidden_stakes'],
  medieval: ['shield_barricade', 'longbow_tower', 'levy_camp', 'peasant_levy', 'wolf_pits'],
  gunpowder: ['gabion_wall', 'musket_redoubt', 'militia_muster', 'militiaman', 'powder_keg'],
  industrial: ['trench_parapet', 'sniper_nest', 'recruiting_depot', 'volunteer', 'tripwire_charge'],
  modern: ['sandbag_bunker', 'pillbox', 'forward_base', 'conscript', 'minefield'],
  future: ['hardlight_barrier', 'sentry_pylon', 'clone_bay', 'clone_cadet', 'grav_mire'],
  cosmic: ['void_rampart', 'ion_spire', 'warp_barracks', 'star_recruit', 'void_mine'],
};

/** A16.14.4 L1 numbers: wall HP, tower HP / damage / interval / range, camp HP, levy HP / damage (levies 35%, MVP balance pass 2026-10-01; 30% after the fixer). */
const TABLE: Record<AgeId, [number, number, number, number, number, number, number, number]> = {
  stone: [560, 280, 27, 1400, 200, 336, 56, 7],
  bronze: [630, 315, 30, 1400, 210, 378, 65, 8],
  medieval: [756, 378, 36, 1400, 230, 453, 75, 9],
  gunpowder: [1019, 509, 70, 2000, 240, 611, 101, 12],
  industrial: [1187, 593, 49, 1200, 250, 712, 115, 14],
  modern: [1378, 689, 48, 1000, 260, 826, 137, 17],
  future: [1860, 930, 64, 1000, 260, 1116, 164, 23],
  cosmic: [2509, 1254, 81, 1000, 270, 1505, 245, 31],
};

describe('the Fort roster (A16.14.4)', () => {
  it('validates, with 32 forts (8 Common, 16 Rare, 8 Epic) plus the X0 variants, their hidden twins and levies', () => {
    expect(validateContent(content)).toEqual([]);
    // The X0 roster shape: walls Common, camps and traps Rare, towers Epic.
    const shape = Object.values(content.rosterShape);
    const n = (k: 'wall' | 'tower' | 'camp' | 'trap'): number => shape.reduce((a, s) => a + s.forts[k], 0);
    expect(forts).toHaveLength(n('wall') + n('tower') + n('camp') + n('trap'));
    expect(forts.filter((x) => x.rarity === 'common')).toHaveLength(n('wall'));
    expect(forts.filter((x) => x.rarity === 'rare')).toHaveLength(n('camp') + n('trap'));
    expect(forts.filter((x) => x.rarity === 'epic')).toHaveLength(n('tower'));
    expect(Object.values(content.units).filter((u) => u.fort)).toHaveLength(n('wall') + n('tower') + n('camp'));
    expect(Object.values(content.units).filter((u) => u.levy)).toHaveLength(n('camp'));
    expect(content.order.forts).toHaveLength(forts.length);
    // Never collectable: no fort, twin or levy in the collection order, pools or counters.
    for (const id of [...content.order.forts, ...content.order.fortUnits]) {
      expect(content.order.units.includes(id), id).toBe(false);
      expect(content.counters[id], id).toBeUndefined();
    }
  });

  it.each(AGE_ORDER.map((a) => [a] as const))('%s: the A16.14.4 ids and L1 numbers', (age) => {
    const [wall, tower, camp, levy, trap] = ROSTER[age];
    const [wallHp, towerHp, towerDmg, towerMs, towerRange, campHp, levyHp, levyDmg] = TABLE[age];
    expect(of(age, 'wall')).toMatchObject({ id: wall, hp: wallHp, cost: age === 'modern' ? 175 : 125, pop: 6, size: 'large', pads: 'home', source: 'starter' });
    expect(of(age, 'tower')).toMatchObject({ id: tower, hp: towerHp, cost: 150, pop: 6, size: 'medium', pads: 'home' });
    expect(of(age, 'tower').attack).toMatchObject({ damage: towerDmg, intervalMs: towerMs, range: towerRange, windupPct: 0, hitsGround: true, hitsAir: true });
    expect(of(age, 'camp')).toMatchObject({ id: camp, hp: campHp, cost: 150, pop: 6, size: 'large', pads: 'any', camp: { spawn: levy, everyMs: 10000, firstMs: 2000, maxAlive: 1 } });
    expect(of(age, 'trap')).toMatchObject({ id: trap, hp: 0, cost: 100, pop: 3, size: null, pads: 'home' });
    expect(content.units[levy]).toMatchObject({ hp: levyHp, cost: 0, aiValue: 8, hidden: true, levy: true, abilities: [] });
    expect(content.units[levy]?.attacks[0]?.damage).toBe(levyDmg);
    // Twins share the fort's id, HP, cost and pop.
    for (const id of [wall, tower, camp]) {
      const t = content.units[id];
      expect(t, id).toMatchObject({ hidden: true, role: 'fort', group: 'fort', speed: 0, tags: ['structure', 'ground'], visualId: `fort.${id}` });
      expect(t?.hp).toBe(content.forts[id]?.hp);
    }
  });

  it('sources: walls are starters, the Stone set comes with the unlock, the rest from War Path L4/L6/L8 with a Road fort set', () => {
    const road: Record<AgeId, number | undefined> = { stone: undefined, bronze: 2200, medieval: 2300, gunpowder: 2500, industrial: 2700, modern: 2900, future: 3100, cosmic: 3200 };
    for (const age of AGE_ORDER) {
      for (const kind of ['camp', 'trap', 'tower'] as const) {
        const x = of(age, kind);
        if (age === 'stone') expect(x.source).toBe('unlock');
        else expect(x).toMatchObject({ source: 'warPath', warPathLevel: kind === 'camp' ? 4 : kind === 'trap' ? 6 : 8, road: road[age] });
      }
    }
    // The Road fort sets sit on plain nodes (never a gate or a Wardrobe node).
    for (const age of AGE_ORDER) {
      const node = road[age];
      if (node === undefined) continue;
      const n = content.trophyRoad.nodes.find((x) => x.trophies === node);
      expect(n?.rewards.some((r) => r.kind === 'gate' || r.kind === 'wardrobe'), `${node}`).toBe(false);
      const items = n?.rewards.filter((r) => r.kind === 'fort').map((r) => (r.kind === 'fort' ? r.card : '')) ?? [];
      expect(items.sort()).toEqual([of(age, 'camp').id, of(age, 'trap').id, of(age, 'tower').id].sort());
    }
  });
});

describe('X0 fort variants (CONTENT_PLAN 4, 5.1)', () => {
  it('Stone: Thorn Hedge is a cheap wall from side node s2, Bone Watchtower a lob tower from the 20-star milestone', () => {
    expect(content.forts.thorn_hedge).toMatchObject({ fortKind: 'wall', rarity: 'common', cost: 100, hp: 420, source: 'warPath', warPathSide: 2, road: 4100 });
    expect(content.forts.bone_watchtower).toMatchObject({ fortKind: 'tower', rarity: 'epic', cost: 150, hp: 280, source: 'warPath', warPathStars: 20, road: 4100 });
    expect(content.forts.bone_watchtower?.attack).toMatchObject({ damage: 21, intervalMs: 1800, range: 200, splashRadius: 30, hitsGround: true, hitsAir: false });
    const p = content.forts.bone_watchtower?.attack?.projectile;
    expect(p && 'speed' in p ? p.arc : false).toBe(true);
    const tile = content.trophyRoad.nodes.find((x) => x.trophies === 4100);
    expect(tile?.rewards.filter((r) => r.kind === 'fort').map((r) => (r.kind === 'fort' ? r.card : '')).sort()).toEqual(['bone_watchtower', 'thorn_hedge']);
  });
});

describe('static gates (A16.14.9, spec 12.2)', () => {
  it('trap budget: primary damage over all charges is 0.6-1.2 × the L1 Infantry HP (Grav Mire, a control trap, may go below)', () => {
    const want: Record<AgeId, number | null> = { stone: 75, bronze: 74, medieval: 75, gunpowder: 79, industrial: 61, modern: 66, future: null, cosmic: 61 };
    for (const age of AGE_ORDER) {
      const t = of(age, 'trap').trap;
      if (!t) throw new Error('no trap');
      const hp = common(age, 'infantry').hp;
      // Rounded to whole percent: (x × 200 + hp) ÷ (2 × hp).
      const pct = Math.trunc((t.charges * t.damage * 200 + hp) / (2 * hp));
      if (want[age] !== null) expect(pct, age).toBe(want[age]);
      expect(pct, age).toBeLessThanOrEqual(120);
      if (t.statuses.length === 0) expect(pct, age).toBeGreaterThanOrEqual(60);
      expect(t.radius).toBeLessThanOrEqual(60);
      for (const st of t.statuses) {
        expect(st.kind).toBe('slow');
        expect(st.magnitudeBp).toBeLessThanOrEqual(6000);
        expect(st.durationMs).toBeLessThanOrEqual(3000);
      }
    }
  });

  it('tower reach: pad + 16 + range ≤ 560 on every legal pad; towers never on Field pads', () => {
    const half = content.economy.sizes.medium / 2;
    for (const age of AGE_ORDER) {
      const t = of(age, 'tower');
      expect(t.pads).toBe('home');
      for (const pad of f.pads.slice(0, f.homePads)) {
        const range = Math.min(t.attack?.range ?? 0, f.towerReachMaxP - pad - half);
        expect(pad + half + range, `${age} pad ${pad}`).toBeLessThanOrEqual(f.towerReachMaxP);
      }
    }
    expect(f.towerReachMaxP).toBe(content.economy.turretRangeHardCapLu);
  });

  it('the blocked front stands inside cover: max Home pad + 24 + 12 ≤ every age’s 150-gold Common turret range', () => {
    const edge = (f.pads[f.homePads - 1] as number) + content.economy.sizes.large / 2 + content.economy.sizes.small / 2;
    expect(edge).toBe(336);
    for (const age of AGE_ORDER) {
      const long = Object.values(content.turrets).find((t) => t.age === age && t.rarity === 'common' && t.cost === 150);
      expect(long?.attack.range ?? 0, age).toBeGreaterThanOrEqual(edge);
    }
  });

  it('a wall holds ≥ 5 s against 10 same-level Infantry at the contact cap', () => {
    for (const age of AGE_ORDER) {
      const inf = common(age, 'infantry');
      const a = inf.attacks[0];
      if (!a) throw new Error('no attack');
      // H ÷ (contactMax × Infantry DPS), in ms: Infantry melee takes the ×1 fort type mod.
      const holdMs = Math.trunc((of(age, 'wall').hp * a.intervalMs) / (f.contactMax * a.damage));
      expect(holdMs, age).toBeGreaterThanOrEqual(5000);
    }
  });

  it('no fort outlives the shortest Siege: scaffold + 100% at 2%/s < every format’s Siege, with every Siege-moving modifier', () => {
    const life = f.scaffoldMs + Math.ceil(10000 / Math.trunc((f.decayBpPerSec * f.siegeDecayBp) / 10000)) * 1000;
    expect(life).toBe(55000);
    const shifts = [0, ...content.dailyModifiers.order.map((id) => content.dailyModifiers.list[id]?.effect).map((e) => (e?.kind === 'siegeShift' ? e.ms : 0))];
    for (const fmt of Object.values(content.formats)) {
      if (fmt.siegeMs === null || fmt.finalBellMs === null) continue;
      for (const shift of shifts) {
        const siege = Math.max(0, fmt.siegeMs + shift);
        expect(fmt.finalBellMs - siege, `${fmt.id} ${shift}`).toBeGreaterThan(life);
      }
    }
  });

  it('has a starter answer: every age’s Heavy Common carries the ×2 structure mod; siege-only units do not', () => {
    for (const age of AGE_ORDER) {
      const h = common(age, 'heavy');
      expect(carriesStructureMod(h), age).toBe(true);
      expect(h.attacks[0]?.mods?.[0]).toEqual({ vs: 'structure', bp: f.structureBp });
    }
    for (const u of Object.values(content.units)) {
      if (u.abilities.some((a) => a.kind === 'siegeOnly')) expect(u.attacks.some((a) => a.mods?.some((m) => m.vs === 'structure')), u.id).toBe(false);
    }
  });

  it('levy farm: levies cost 0 (no bounty, no XP), at most 1 per camp; Engineers shorten scaffolds to 3 s', () => {
    for (const x of forts.filter((y) => y.camp)) {
      expect(content.units[x.camp?.spawn ?? '']?.cost).toBe(0);
      expect(x.camp?.maxAlive).toBe(1);
    }
    const eng = content.research.picks.find((p) => p.id === 'defences.engineers');
    expect(eng?.effects).toContainEqual({ kind: 'fortScaffold', ms: 3000 });
  });
});
