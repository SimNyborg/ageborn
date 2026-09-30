/** The A16.14 wall prototype: own units pass, enemies stop and hit it, Sabertooth pounces over. */
import { describe, expect, it } from 'vitest';
import type { Sim } from '@/contracts';
import { content } from '@/content';
import { createSim } from '@/sim';
import { devSpawn, stepN } from '@/sim/debug';
import { matchConfig, sideConfig } from '@/ai/test/helpers';
import { LANE_MLU } from '@/core';
import { WALL_CARD, padClear, placeWall, progressFor, withWalls } from '../walls';

function sim(): Sim {
  const c = withWalls(content);
  return createSim({ ...matchConfig({ seed: 7, format: 'full' }), content: c, sides: [sideConfig(c), sideConfig(c)] });
}

/** Lane length in lu (A17.2: the long lane); side 1 spawns are measured from its own base. */
const LANE_LU = LANE_MLU / 1000;

describe('wall prototype (A16.14)', () => {
  it('adds an inert, parked, hidden palisade copied from Tuskback', () => {
    const w = withWalls(content).units[WALL_CARD];
    expect(w).toBeDefined();
    expect(w?.speed).toBe(0);
    expect(w?.hp).toBe(content.units.tuskback?.hp);
    expect(w?.hidden).toBe(true);
    expect(w?.attacks[0]).toMatchObject({ damage: 0, hitsGround: false, hitsAir: false });
    expect(withWalls(content, { hpScale: 2 }).units[WALL_CARD]?.hp).toBe((content.units.tuskback?.hp ?? 0) * 2);
    // The real Palisade is now a fort twin (A16.14); the prototype replaces it with its own copy.
    expect(content.units[WALL_CARD]?.fort?.kind).toBe('wall');
    expect(withWalls(content).units[WALL_CARD]?.fort).toBeUndefined();
  });

  it('own melee walks through its own wall', () => {
    const s = sim();
    placeWall(s, 0, 360);
    const own = devSpawn(s, 0, 'bonker', { p: 250 });
    stepN(s, 20 * 4);
    const ownNow = s.state.units.find((u) => u.id === own.id);
    expect(progressFor(ownNow!, 0)).toBeGreaterThan(400);
  });

  it('an enemy alone stops at the wall and chips it down', () => {
    const s = sim();
    const wall = placeWall(s, 0, 360);
    const foe = devSpawn(s, 1, 'bonker', { p: LANE_LU - 500 });
    stepN(s, 20 * 6);
    const foeNow = s.state.units.find((u) => u.id === foe.id);
    const wallNow = s.state.units.find((u) => u.id === wall.id);
    expect(foeNow).toBeDefined();
    expect(progressFor(foeNow!, 0)).toBeGreaterThanOrEqual(360);
    expect(wallNow!.hp).toBeLessThan(wallNow!.maxHp);
  });

  it('Sabertooth pounces over the wall', () => {
    const s = sim();
    placeWall(s, 0, 360);
    // A Pebbler behind the wall is the pounce target (a ranged unit within 150 lu beyond the blocker).
    devSpawn(s, 0, 'pebbler', { p: 150 });
    const cat = devSpawn(s, 1, 'sabertooth', { p: LANE_LU - 560 });
    let passed = false;
    for (let i = 0; i < 20 * 10 && !passed; i += 1) {
      stepN(s, 1);
      const c = s.state.units.find((u) => u.id === cat.id);
      if (c && progressFor(c, 0) < 340) passed = true;
    }
    expect(passed).toBe(true);
  });

  it('a pad is legal only with no enemy ground unit within 120 lu', () => {
    const s = sim();
    expect(padClear(s, 0, 360)).toBe(true);
    devSpawn(s, 1, 'bonker', { p: LANE_LU - 520 });
    expect(padClear(s, 0, 360)).toBe(true);
    expect(padClear(s, 0, 460)).toBe(false);
  });
});
