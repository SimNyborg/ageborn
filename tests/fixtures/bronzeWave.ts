/**
 * The Bronze wave kinds on the frozen fixture (SIM_VERSION 7.1.0): the X0 fixture plus, in its Stone Age, a
 * Dread aura (Tragic Chorus, M4: enemies within 130 lu move 20% slower), an ally speed aura (Aulos Piper,
 * +15% move speed within 160), a siege engine with riders that spill out on death (Wooden Horse:
 * `siegeOnly` + `riders`, a first-time combination) and a frenzy brawler with a first-hit charge (Minotaur:
 * `firstHitBonus` + `frenzy`), plus the whole-lane Sandstorm signal (`lane` reach with a snare). Units sit in
 * the fixture's Stone Age so a one-age war plays them. The numbers are the Bronze wave's first draft, frozen
 * here: live tuning in `src/content/raw` never touches this file. It has its own content hash, so goldens
 * 01-16 keep theirs.
 *
 * Shared by the sim's unit tests and golden 17 (`src/sim/test/helpers.ts`). Test data only.
 */
import type { PowerDef, UnitDef } from '@/contracts/content';
import type { RawContent } from './content/types';
import { rawX0 } from './x0';

const base = (id: string, rarity: UnitDef['rarity'], role: UnitDef['role'], group: UnitDef['group'], cost: number, pop: number, trainMs: number) => ({
  id, kind: 'unit' as const, age: 'stone' as const, rarity, role, group, cost, trainMs, pop,
  visualId: `unit.${id}`, nameKey: `card.${id}.name`, descKey: `card.${id}.desc`, strongVs: [], weakVs: [],
});

const ranged = (damage: number, intervalMs: number, range: number) => ({
  damage, intervalMs, windupPct: 50, range, hitsGround: true, hitsAir: true,
  projectile: { speed: 500, visualId: 'proj.rock' }, dmgType: 'blunt' as const, sfx: 'shot_sling',
});

export const BRONZE_WAVE_UNITS: readonly UnitDef[] = [
  {
    ...base('tragic_chorus', 'rare', 'support', 'support', 110, 4, 3000),
    hp: 143, speed: 60, size: 'small', tags: ['light', 'bio', 'support', 'ranged', 'ground'],
    attacks: [ranged(8, 1200, 150)],
    abilities: [
      { kind: 'aura', radius: 130, status: { kind: 'slow', magnitudeBp: 2000, durationMs: 0 }, foe: true },
      { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
    ],
    sfx: { spawn: 'spawn_pop', die: 'die_bio' },
  },
  {
    ...base('aulos_piper', 'rare', 'support', 'support', 110, 4, 3000),
    hp: 130, speed: 65, size: 'small', tags: ['light', 'bio', 'support', 'ranged', 'ground'],
    attacks: [ranged(8, 1200, 150)],
    abilities: [
      { kind: 'aura', radius: 160, status: { kind: 'speedBuff', magnitudeBp: 1500, durationMs: 0 } },
      { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
    ],
    sfx: { spawn: 'spawn_pop', die: 'die_bio' },
  },
  {
    ...base('wooden_horse', 'epic', 'siege', 'epic', 200, 8, 4000),
    hp: 800, speed: 45, size: 'large', tags: ['armored', 'mech', 'melee', 'ground'],
    attacks: [{ damage: 12, vsBaseDamage: 140, intervalMs: 2000, windupPct: 40, range: 12, hitsGround: true, hitsAir: false, dmgType: 'blast', sfx: 'swing_whoosh' }],
    abilities: [
      { kind: 'siegeOnly' },
      {
        kind: 'riders', count: 2, onDeathSpawn: 'bonker',
        attack: { damage: 6, intervalMs: 1200, windupPct: 40, range: 40, hitsGround: true, hitsAir: false, dmgType: 'pierce', sfx: 'swing_whoosh' },
      },
    ],
    sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
  },
  {
    ...base('minotaur', 'epic', 'heavy', 'epic', 200, 8, 4000),
    hp: 820, speed: 60, size: 'large', tags: ['armored', 'bio', 'melee', 'ground'],
    attacks: [{ damage: 48, intervalMs: 1500, windupPct: 40, range: 18, hitsGround: true, hitsAir: false, dmgType: 'slash', sfx: 'swing_whoosh' }],
    abilities: [
      { kind: 'firstHitBonus', multBp: 20000, knockback: 40, idleResetMs: 2000 },
      { kind: 'frenzy', belowHpBp: 5000, damageBp: 3000, attackSpeedBp: 2000 },
    ],
    sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
  },
];

export const BRONZE_WAVE_POWERS: readonly PowerDef[] = [
  {
    id: 'sandstorm', kind: 'power', age: 'stone', slot: 'field', reach: 'lane', family: 'signal', rarity: 'rare',
    source: 'warPath', warPathLevel: 3, road: 2150, cost: 50, reloadMs: 25000, telegraphMs: 1000, maxTargets: 8,
    effect: { kind: 'field', zone: 2000, durationMs: 0, hitsAir: true, damagePerPulse: 19, statuses: [{ kind: 'snare', magnitudeBp: 3000, durationMs: 3000 }] },
    visualId: 'power.sandstorm', sfx: 'pw_sandstorm', nameKey: 'card.sandstorm.name', descKey: 'card.sandstorm.desc',
  },
];

/** The X0 fixture plus the Bronze wave kinds (raw; compile it with the sim's `compileForSim`). */
export const rawBronzeWave: RawContent = {
  ...rawX0,
  ages: rawX0.ages.map((t) => (t.age === 'stone' ? { ...t, units: [...t.units, ...BRONZE_WAVE_UNITS] } : t)),
  powers: [...rawX0.powers, ...BRONZE_WAVE_POWERS],
};
