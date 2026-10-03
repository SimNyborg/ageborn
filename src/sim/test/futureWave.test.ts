/**
 * Future wave combinations (CONTENT_PLAN 5.7, no new mechanic, SIM_VERSION unchanged): a ground summoner whose
 * summon flies (the Drone Carrier's Attack Drones). M3 spawns the summon with its own card's air flag, so the drone
 * takes off at once, is out of reach of ground-only melee, and is shot down by anti-air like any flier. Draft cards
 * placed in the X0 fixture's Stone Age, so the frozen fixtures and goldens are untouched. Test data only.
 */
import { describe, expect, it } from 'vitest';
import type { UnitDef } from '@/contracts/content';
import type { RawContent } from '../../../tests/fixtures/content/types';
import { rawX0 } from '../../../tests/fixtures/x0';
import { devSpawn, stepN, unitById } from '../debug';
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
    ...base('test_carrier', 'legendary', 'siegeHeavy', 'legendary', 350, 14), hp: 3000, speed: 30, size: 'huge',
    tags: ['armored', 'mech', 'ranged', 'legendary', 'ground'],
    attacks: [],
    abilities: [{ kind: 'summon', card: 'test_drone', firstMs: 2000, everyMs: 6000, maxAlive: 3 }],
  },
  {
    ...base('test_drone', 'epic', 'airGunship', 'epic', 0, 8), hp: 300, speed: 90, size: 'small',
    tags: ['air', 'mech'],
    attacks: [
      {
        damage: 9, intervalMs: 300, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
        projectile: { speed: 1800, visualId: 'proj.plasma' }, dmgType: 'laser', sfx: 'shot_drone',
      },
    ],
    abilities: [], hidden: true, summon: true, aiValue: 40,
  },
];

const raw: RawContent = { ...rawX0, ages: rawX0.ages.map((t) => (t.age === 'stone' ? { ...t, units: [...t.units, ...UNITS] } : t)) };
const content = compileForSim(raw);

function lane(seed = 1) {
  const side = (label: string) => sideConfig(content, { label, loadouts: { stone: baselineLoadout(content, 'stone') } });
  return createSim(matchConfig({ content, seed, training: { noClock: true }, sides: [side('A'), side('B')] }));
}

describe('a ground summoner with a flying summon (Drone Carrier)', () => {
  it('launches an air drone after firstMs, then one every everyMs up to maxAlive', () => {
    const sim = lane();
    const c = devSpawn(sim, 0, 'test_carrier', { p: 200 });
    stun(sim, c.id, 0);
    const first = ofKind(stepN(sim, 40), 'unitSpawned').filter((e) => e.card === 'test_drone');
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ summoned: true, summoner: c.id });
    const drone = sim.state.units.find((u) => u.card === 'test_drone');
    expect(drone?.air).toBe(true);
    const later = ofKind(stepN(sim, 120 * 3), 'unitSpawned').filter((e) => e.card === 'test_drone');
    expect(later).toHaveLength(2);
    expect(sim.state.units.filter((u) => u.card === 'test_drone' && u.hp > 0)).toHaveLength(3);
  });

  it('ground-only melee cannot hit the drone; a unit that hits air does', () => {
    const sim = lane(2);
    devSpawn(sim, 0, 'test_carrier', { p: 200 });
    stepN(sim, 40);
    const drone = sim.state.units.find((u) => u.card === 'test_drone');
    if (!drone) throw new Error('no drone');
    stun(sim, drone.id, 1000);
    // A Bonker (melee, ground only) right under it never damages it.
    const bonker = devSpawn(sim, 1, 'bonker', { p: L - (drone.x / 1000 + 10) });
    const ev = stepN(sim, 60);
    expect(ofKind(ev, 'hit').filter((e) => e.targetId === drone.id && e.sourceId === bonker.id)).toHaveLength(0);
    // A Pebbler (its stones hit air) hits it.
    const pebbler = devSpawn(sim, 1, 'pebbler', { p: L - (drone.x / 1000 + 100) });
    const ev2 = stepN(sim, 200);
    expect(ofKind(ev2, 'hit').filter((e) => e.targetId === drone.id && e.sourceId === pebbler.id).length).toBeGreaterThan(0);
    const d = unitById(sim, drone.id);
    expect(d === undefined || d.hp < d.maxHp).toBe(true);
  });
});
