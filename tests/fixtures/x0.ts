/**
 * The X0 content kinds on the frozen fixture (SIM_VERSION 7.0.0): the fixture plus, in its Stone Age, a
 * squad (Hunting Wolves, M1), a frenzy unit (Pelt Rager, M2), a summoner and its summon (Beast Caller and
 * Cave Pup, M3), a roar with the dizzy flag (Cave Bear, M5) and a whole-lane power (Pebble Hail, H7). The
 * numbers are the Stone wave's first draft, frozen here: live tuning in `src/content/raw` never touches
 * this file. It has its own content hash, so goldens 01-15 keep theirs.
 *
 * Shared by the sim's unit tests and golden 16 (`src/sim/test/helpers.ts`) and the cross-engine
 * determinism spec (`tests/e2e/determinism/entry.ts`). Test data only.
 */
import type { PowerDef, UnitDef } from '@/contracts/content';
import { raw } from './content';
import type { RawContent } from './content/types';

const melee = (damage: number, intervalMs: number, sfx: string, dmgType: 'blunt' | 'slash' = 'blunt') => ({
  damage, intervalMs, windupPct: 40, range: 16, hitsGround: true, hitsAir: false, dmgType, sfx,
});

const base = (id: string, rarity: UnitDef['rarity'], role: UnitDef['role'], group: UnitDef['group'], cost: number, pop: number, trainMs: number) => ({
  id, kind: 'unit' as const, age: 'stone' as const, rarity, role, group, cost, trainMs, pop,
  visualId: `unit.${id}`, nameKey: `card.${id}.name`, descKey: `card.${id}.desc`, strongVs: [], weakVs: [],
});

export const X0_UNITS: readonly UnitDef[] = [
  {
    ...base('hunting_wolves', 'common', 'infantry', 'infantry', 50, 2, 1500),
    hp: 88, speed: 80, size: 'small', tags: ['light', 'bio', 'melee', 'ground'],
    attacks: [melee(11, 1000, 'wolf_bite', 'slash')], abilities: [], squad: { count: 2 },
    sfx: { spawn: 'spawn_pop', die: 'die_bio' },
  },
  {
    ...base('pelt_rager', 'rare', 'infantry', 'infantry', 50, 2, 1500),
    hp: 160, speed: 70, size: 'small', tags: ['light', 'bio', 'melee', 'ground'],
    attacks: [melee(17, 1000, 'swing_whoosh')], abilities: [{ kind: 'frenzy', belowHpBp: 5000, damageBp: 3000, attackSpeedBp: 2000 }],
    sfx: { spawn: 'spawn_pop', die: 'die_bio' },
  },
  {
    ...base('beast_caller', 'epic', 'support', 'epic', 200, 8, 4000),
    hp: 260, speed: 65, size: 'small', tags: ['light', 'bio', 'support', 'melee', 'ground'],
    attacks: [{ ...melee(12, 1200, 'swing_whoosh'), range: 30 }],
    abilities: [
      { kind: 'summon', card: 'cave_pup', firstMs: 2000, everyMs: 8000, maxAlive: 2 },
      { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
    ],
    sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
  },
  {
    ...base('cave_bear', 'epic', 'heavy', 'epic', 200, 8, 4000),
    hp: 900, speed: 55, size: 'large', tags: ['armored', 'bio', 'melee', 'ground'],
    attacks: [melee(50, 1400, 'bear_swipe', 'slash')],
    abilities: [{ kind: 'timeStop', everyMs: 14000, radius: 110, freezeMs: 1000, legendaryFreezeMs: 500, frozen: false }],
    sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
  },
  {
    ...base('cave_pup', 'common', 'infantry', 'infantry', 0, 2, 1500),
    hp: 56, speed: 90, size: 'small', tags: ['light', 'bio', 'melee', 'ground'],
    attacks: [melee(7, 1000, 'wolf_bite', 'slash')], abilities: [],
    sfx: { spawn: 'spawn_pop', die: 'die_bio' }, hidden: true, summon: true, aiValue: 18,
  },
];

export const X0_POWERS: readonly PowerDef[] = [
  {
    id: 'pebble_hail', kind: 'power', age: 'stone', slot: 'field', reach: 'lane', family: 'volley', rarity: 'rare',
    source: 'warPath', warPathLevel: 3, road: 2100, cost: 50, reloadMs: 25000, telegraphMs: 1000, maxTargets: 8,
    effect: { kind: 'field', zone: 2000, durationMs: 0, hitsAir: true, damagePerPulse: 40 },
    visualId: 'power.pebble_hail', sfx: 'pw_hail', nameKey: 'card.pebble_hail.name', descKey: 'card.pebble_hail.desc',
  },
];

/** The frozen fixture plus the X0 kinds (raw; compile it with the sim's `compileForSim`). */
export const rawX0: RawContent = {
  ...raw,
  ages: raw.ages.map((t) => (t.age === 'stone' ? { ...t, units: [...t.units, ...X0_UNITS] } : t)),
  powers: [...raw.powers, ...X0_POWERS],
};
