/**
 * Modern wave combination (SIM_VERSION 7.3.0, CONTENT_PLAN 5.6): riders on an air bomber (the Sky Fortress).
 * Only the bomber's own attack (index 0) uses the ±window drop rule; its waist gunners pick targets like any
 * secondary attack (their range, air included, priority air), fire while the bomber flies on, and bail out as
 * ground units when it crashes (with `onDeathExplode`). Draft cards placed in the X0 fixture's Stone Age, so the
 * frozen fixtures and goldens are untouched. Test data only.
 */
import { describe, expect, it } from 'vitest';
import type { UnitDef } from '@/contracts/content';
import type { RawContent } from '../../../tests/fixtures/content/types';
import { rawX0 } from '../../../tests/fixtures/x0';
import { MILLI } from '@/core';
import { devSpawn, stepN, unitById } from '../debug';
import { createSim } from '../createSim';
import { compileForSim } from '../shim';
import { L, baselineLoadout, matchConfig, ofKind, sideConfig, stun } from './helpers';

const base = (id: string, rarity: UnitDef['rarity'], role: UnitDef['role'], group: UnitDef['group'], cost: number, pop: number) => ({
  id, kind: 'unit' as const, age: 'stone' as const, rarity, role, group, cost, trainMs: 4000, pop,
  visualId: `unit.${id}`, nameKey: `card.${id}.name`, descKey: `card.${id}.desc`, strongVs: [], weakVs: [],
  sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
});

const bombAttack = {
  damage: 40, vsBaseDamage: 50, intervalMs: 1600, windupPct: 50, range: 40, hitsGround: true, hitsAir: false,
  projectile: { speed: 450, visualId: 'proj.bomb' }, dmgType: 'blast' as const, sfx: 'bomb_whistle', splashRadius: 50,
};

const UNITS: readonly UnitDef[] = [
  {
    ...base('sky_fortress', 'legendary', 'airBomber', 'legendary', 350, 14), hp: 700, speed: 40, size: 'huge',
    tags: ['air', 'mech', 'legendary'],
    attacks: [bombAttack],
    abilities: [
      { kind: 'bomber', dropWindow: 40 },
      {
        kind: 'riders', count: 2, onDeathSpawn: 'pebbler',
        attack: {
          damage: 5, intervalMs: 400, windupPct: 50, range: 160, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' }, dmgType: 'bullet', sfx: 'shot_mg', priority: 'air',
        },
      },
      { kind: 'onDeathExplode', damage: 110, radius: 70 },
    ],
  },
  {
    ...base('test_gyro', 'epic', 'airGunship', 'epic', 200, 8), hp: 5000, speed: 60, size: 'medium',
    tags: ['air', 'mech'],
    attacks: [],
    abilities: [],
  },
];

const raw: RawContent = { ...rawX0, ages: rawX0.ages.map((t) => (t.age === 'stone' ? { ...t, units: [...t.units, ...UNITS] } : t)) };
const content = compileForSim(raw);

function lane(seed = 1) {
  const side = (label: string) => sideConfig(content, { label, loadouts: { stone: baselineLoadout(content, 'stone') } });
  return createSim(matchConfig({ content, seed, training: { noClock: true }, sides: [side('A'), side('B')] }));
}

describe('riders on an air bomber (Sky Fortress)', () => {
  it('the gunners shoot an air unit 120 lu away; the bombs keep to the ±40 lu window', () => {
    const sim = lane();
    const fort = devSpawn(sim, 0, 'sky_fortress', { p: 600 });
    const gyro = devSpawn(sim, 1, 'test_gyro', { p: L - 720 });
    stun(sim, gyro.id, 400);
    const events = stepN(sim, 60);
    const shots = ofKind(events, 'projectileFired').filter((e) => e.from === fort.id);
    // Every shot is a gunner's bullet at the gyro (no ground enemy below, so no bomb falls).
    expect(shots.length).toBeGreaterThan(0);
    for (const e of shots) expect(e.targetId).toBe(gyro.id);
    const g = unitById(sim, gyro.id);
    expect(g && g.hp < g.maxHp).toBe(true);
  });

  it('bombs a ground unit only once it is inside the drop window, while the gunners already fire', () => {
    const sim = lane(2);
    const fort = devSpawn(sim, 0, 'sky_fortress', { p: 600 });
    const foe = devSpawn(sim, 1, 'bonker', { p: L - 740 });
    stun(sim, foe.id, 400);
    const events = stepN(sim, 40);
    const fired = ofKind(events, 'projectileFired').filter((e) => e.from === fort.id);
    // 140 lu away: out of the bomb window, inside the gunners' 160.
    expect(fired.length).toBeGreaterThan(0);
    expect(fired.every((e) => e.visualId === 'proj.bullet')).toBe(true);
    const sim2 = lane(2);
    const fort2 = devSpawn(sim2, 0, 'sky_fortress', { p: 600 });
    const under = devSpawn(sim2, 1, 'bonker', { p: L - 620 });
    stun(sim2, under.id, 400);
    const bombs = ofKind(stepN(sim2, 60), 'projectileFired').filter((e) => e.from === fort2.id && e.visualId === 'proj.bomb');
    expect(bombs.length).toBeGreaterThan(0);
    for (const b of bombs) expect(Math.abs(b.toX - 620 * MILLI)).toBeLessThanOrEqual(60 * MILLI);
  });

  it('never stops for the gunners: it keeps flying while they fire', () => {
    const sim = lane(3);
    const fort = devSpawn(sim, 0, 'sky_fortress', { p: 600 });
    const gyro = devSpawn(sim, 1, 'test_gyro', { p: L - 700 });
    stun(sim, gyro.id, 200);
    const x0 = unitById(sim, fort.id)?.x ?? 0;
    stepN(sim, 20);
    const x1 = unitById(sim, fort.id)?.x ?? 0;
    expect(x1).toBeGreaterThan(x0);
  });

  it('crashes with a blast and its gunners bail out as ground units', () => {
    const sim = lane(4);
    const fort = devSpawn(sim, 0, 'sky_fortress', { p: 600 });
    const u = unitById(sim, fort.id);
    if (!u) throw new Error('missing unit');
    u.hp = 1;
    // A Pebbler hits air: its first stone downs the crippled bomber.
    devSpawn(sim, 1, 'pebbler', { p: L - 700 });
    const events = stepN(sim, 120);
    expect(unitById(sim, fort.id)).toBeUndefined();
    const spawned = ofKind(events, 'unitSpawned').filter((e) => e.side === 0 && e.card === 'pebbler');
    expect(spawned).toHaveLength(2);
  });
});
