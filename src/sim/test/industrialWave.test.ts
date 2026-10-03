/**
 * Industrial wave combination (CONTENT_PLAN 5.5): the first Legendary that carries Frenzy (X0 M2) on two
 * attacks (the Armoured Train: a turret gun and a roof machine gun). No new sim kind, so SIM_VERSION and the
 * goldens are untouched; this pins that the HP-line bonus applies to the unit, so both attacks speed up and hit
 * harder. Draft cards placed in the X0 fixture's Stone Age, so the frozen fixtures stay as they are. Test data
 * only.
 */
import { describe, expect, it } from 'vitest';
import type { UnitDef } from '@/contracts/content';
import type { RawContent } from '../../../tests/fixtures/content/types';
import { rawX0 } from '../../../tests/fixtures/x0';
import { unitAttackSpeedBp, unitDamageBonusBp } from '../damage';
import { devSpawn, simCtx, stepN, unitById } from '../debug';
import { createSim } from '../createSim';
import { compileForSim } from '../shim';
import { L, baselineLoadout, matchConfig, ofKind, sideConfig, stun } from './helpers';

const base = (id: string, rarity: UnitDef['rarity'], role: UnitDef['role'], group: UnitDef['group'], cost: number, pop: number) => ({
  id, kind: 'unit' as const, age: 'stone' as const, rarity, role, group, cost, trainMs: 4000, pop,
  visualId: `unit.${id}`, nameKey: `card.${id}.name`, descKey: `card.${id}.desc`, strongVs: [], weakVs: [],
  sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
});

const UNITS: readonly UnitDef[] = [
  {
    ...base('test_train', 'legendary', 'siegeHeavy', 'legendary', 350, 14), hp: 1000, speed: 40, size: 'huge',
    tags: ['armored', 'mech', 'ranged', 'legendary', 'ground'],
    attacks: [
      {
        damage: 90, intervalMs: 2400, windupPct: 50, range: 220, hitsGround: true, hitsAir: false,
        projectile: { speed: 1200, visualId: 'proj.shell' }, dmgType: 'blast', sfx: 'train_gun', splashRadius: 45,
      },
      {
        damage: 10, intervalMs: 400, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
        projectile: { speed: 1500, visualId: 'proj.bullet' }, dmgType: 'bullet', sfx: 'shot_gatling', priority: 'air',
      },
    ],
    abilities: [{ kind: 'frenzy', belowHpBp: 5000, damageBp: 2000, attackSpeedBp: 2500 }],
  },
  {
    // A stunned punching bag that outlives the test window.
    ...base('test_anvil', 'common', 'heavy', 'heavy', 100, 4), hp: 100000, speed: 40, size: 'large',
    tags: ['armored', 'mech', 'melee', 'ground'],
    attacks: [{ damage: 1, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false, dmgType: 'blunt', sfx: 'swing_whoosh' }],
    abilities: [],
  },
];

const raw: RawContent = { ...rawX0, ages: rawX0.ages.map((t) => (t.age === 'stone' ? { ...t, units: [...t.units, ...UNITS] } : t)) };
const content = compileForSim(raw);

function lane(seed = 1) {
  const side = (label: string) => sideConfig(content, { label, loadouts: { stone: baselineLoadout(content, 'stone') } });
  return createSim(matchConfig({ content, seed, training: { noClock: true }, sides: [side('A'), side('B')] }));
}

/** Shots of each attack a train fires in `ticks` at a stunned target 120 lu ahead, at `hpBp` of its HP. */
function shots(hpBp: number, ticks = 600): { gun: number; mg: number; dmgBp: number; speedBp: number } {
  const sim = lane(3);
  const train = devSpawn(sim, 0, 'test_train', { p: 600 });
  const foe = devSpawn(sim, 1, 'test_anvil', { p: L - 720 });
  stun(sim, foe.id, ticks + 100);
  const u = unitById(sim, train.id);
  if (!u) throw new Error('missing train');
  u.hp = Math.trunc((u.maxHp * hpBp) / 10000);
  const ctx = simCtx(sim);
  const dmgBp = unitDamageBonusBp(ctx, u);
  const speedBp = unitAttackSpeedBp(ctx, u);
  const fired = ofKind(stepN(sim, ticks), 'projectileFired').filter((e) => e.from === train.id);
  return {
    gun: fired.filter((e) => e.visualId === 'proj.shell').length,
    mg: fired.filter((e) => e.visualId === 'proj.bullet').length,
    dmgBp,
    speedBp,
  };
}

describe('Frenzy on a two-attack Legendary (Armoured Train)', () => {
  it('gives no bonus above the HP line and the full self bonus at or below it', () => {
    const calm = shots(9000, 1);
    expect(calm.dmgBp).toBe(0);
    expect(calm.speedBp).toBe(0);
    const hot = shots(4000, 1);
    expect(hot.dmgBp).toBe(2000);
    expect(hot.speedBp).toBe(2500);
  });

  it('speeds up both attacks, which fire on their own clocks', () => {
    const calm = shots(9000);
    const hot = shots(4000);
    expect(calm.gun).toBeGreaterThan(0);
    expect(calm.mg).toBeGreaterThan(calm.gun);
    expect(hot.gun).toBeGreaterThanOrEqual(calm.gun);
    expect(hot.mg).toBeGreaterThan(calm.mg);
  });
});
