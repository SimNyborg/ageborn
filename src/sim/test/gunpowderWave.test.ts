/**
 * Gunpowder wave kinds (SIM_VERSION 7.2.0, CONTENT_PLAN 5.4): a unit volley with scatter (the Rocket Cart:
 * each rocket lands within ±scatter of the aim point, as the Congreve turret's do) and the first-time
 * combination of an ally aura with `callStrike` on one Legendary (the Grand Marshal). Draft cards placed
 * in the X0 fixture's Stone Age, so the frozen fixtures and goldens are untouched. Test data only.
 */
import { describe, expect, it } from 'vitest';
import type { UnitDef } from '@/contracts/content';
import type { RawContent } from '../../../tests/fixtures/content/types';
import { rawX0 } from '../../../tests/fixtures/x0';
import { MILLI } from '@/core';
import { unitDamageBonusBp } from '../damage';
import { devSpawn, simCtx, stepN, unitById } from '../debug';
import { createSim } from '../createSim';
import { compileForSim } from '../shim';
import { L, baselineLoadout, matchConfig, ofKind, sideConfig, stun } from './helpers';

const base = (id: string, rarity: UnitDef['rarity'], role: UnitDef['role'], group: UnitDef['group'], cost: number, pop: number) => ({
  id, kind: 'unit' as const, age: 'stone' as const, rarity, role, group, cost, trainMs: 4000, pop,
  visualId: `unit.${id}`, nameKey: `card.${id}.name`, descKey: `card.${id}.desc`, strongVs: [], weakVs: [],
  sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
});

const rocketAttack = (scatter: number) => ({
  damage: 22, intervalMs: 5000, windupPct: 50, range: 330, minRange: 90, hitsGround: true, hitsAir: false,
  projectile: { speed: 700, visualId: 'proj.rocket' }, dmgType: 'blast' as const, sfx: 'shot_rocket',
  splashRadius: 30, volley: 4, scatter,
});

const UNITS: readonly UnitDef[] = [
  { ...base('rocket_cart', 'epic', 'artillery', 'epic', 200, 8), hp: 250, speed: 45, size: 'large', tags: ['light', 'mech', 'ranged', 'ground'], attacks: [rocketAttack(40)], abilities: [] },
  { ...base('rocket_cart_tight', 'epic', 'artillery', 'epic', 200, 8), hp: 250, speed: 45, size: 'large', tags: ['light', 'mech', 'ranged', 'ground'], attacks: [rocketAttack(0)], abilities: [] },
  {
    ...base('grand_marshal', 'legendary', 'heavy', 'legendary', 350, 14), hp: 690, speed: 55, size: 'huge',
    tags: ['armored', 'bio', 'melee', 'legendary', 'ground'],
    attacks: [{ damage: 40, intervalMs: 1500, windupPct: 40, range: 20, hitsGround: true, hitsAir: false, dmgType: 'slash', sfx: 'swing_whoosh', cleave: { count: 2, reach: 30 } }],
    abilities: [
      { kind: 'aura', radius: 200, status: { kind: 'damageBuff', magnitudeBp: 1500, durationMs: 0 } },
      { kind: 'callStrike', everyMs: 10000, searchRange: 400, delayMs: 1000, damage: 66, radius: 50, sideLockoutMs: 3000 },
    ],
  },
];

const raw: RawContent = { ...rawX0, ages: rawX0.ages.map((t) => (t.age === 'stone' ? { ...t, units: [...t.units, ...UNITS] } : t)) };
const content = compileForSim(raw);

function lane(seed = 1) {
  const side = (label: string) => sideConfig(content, { label, loadouts: { stone: baselineLoadout(content, 'stone') } });
  return createSim(matchConfig({ content, seed, training: { noClock: true }, sides: [side('A'), side('B')] }));
}

/** The aim points of the first volley a cart at p 600 fires at a stunned target 250 lu ahead. */
function firstVolley(card: string, seed: number): number[] {
  const sim = lane(seed);
  const cart = devSpawn(sim, 0, card, { p: 600 });
  const foe = devSpawn(sim, 1, 'bonker', { p: L - 850 });
  stun(sim, foe.id, 2000);
  for (let i = 0; i < 400; i += 1) {
    const fired = ofKind(stepN(sim, 1), 'projectileFired').filter((e) => e.from === cart.id);
    if (fired.length > 0) return fired.map((e) => e.toX);
  }
  throw new Error('the cart never fired');
}

describe('unit volley with scatter (Rocket Cart)', () => {
  it('fires one projectile per rocket, each within ±scatter of the aim point', () => {
    const tight = firstVolley('rocket_cart_tight', 3);
    expect(tight).toHaveLength(4);
    expect(new Set(tight).size).toBe(1);
    const aim = tight[0] ?? 0;
    const spread = firstVolley('rocket_cart', 3);
    expect(spread).toHaveLength(4);
    for (const x of spread) expect(Math.abs(x - aim)).toBeLessThanOrEqual(40 * MILLI);
    expect(new Set(spread).size).toBeGreaterThan(1);
  });

  it('is deterministic per seed and draws from the sim RNG', () => {
    expect(firstVolley('rocket_cart', 7)).toEqual(firstVolley('rocket_cart', 7));
    const a = firstVolley('rocket_cart', 7);
    const b = firstVolley('rocket_cart', 8);
    expect(a.join()).not.toBe(b.join());
  });
});

describe('ally aura and callStrike on one Legendary (Grand Marshal)', () => {
  it('buffs allies in the radius and calls its strike on the nearest enemy in range', () => {
    const sim = lane();
    const ctx = simCtx(sim);
    const marshal = devSpawn(sim, 0, 'grand_marshal', { p: 600 });
    const near = devSpawn(sim, 0, 'bonker', { p: 700 });
    const far = devSpawn(sim, 0, 'bonker', { p: 300 });
    const foe = devSpawn(sim, 1, 'bonker', { p: L - 900 });
    for (const u of [near, far, foe]) stun(sim, u.id, 2000);
    const first = stepN(sim, 1);
    const n = unitById(sim, near.id);
    const f = unitById(sim, far.id);
    if (!n || !f) throw new Error('missing unit');
    expect(unitDamageBonusBp(ctx, n)).toBe(1500);
    expect(unitDamageBonusBp(ctx, f)).toBe(0);
    // The strike keeps its own clock while the aura runs: the first call on the first tick, with an enemy within 400.
    const events = [...first, ...stepN(sim, 40)];
    const calls = ofKind(events, 'abilityUsed').filter((e) => e.id === marshal.id && e.ability === 'callStrike');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
