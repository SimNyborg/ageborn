import { describe, expect, it } from 'vitest';
import { devSpawn, simCtx, stepN } from '../debug';
import { arena, L, pLu, Stamper, stun, unitOf } from './helpers';

describe('movement (A2.7)', () => {
  it('walks at its speed: Bonker 70 lu/s × 1.25 march (A17.2) = 4.375 lu per tick', () => {
    const sim = arena();
    const u = devSpawn(sim, 0, 'bonker', { p: 20 });
    stepN(sim, 20);
    expect(pLu(sim, u.id)).toBe(107.5);
    // side 1 walks the other way in world x, same progress
    const v = devSpawn(sim, 1, 'bonker', { p: 20 });
    stepN(sim, 1);
    expect(pLu(sim, v.id)).toBe(24.375);
  });

  it('soft single file with a three-wide front (A16.4 L4): units 2 and 3 join unit 1, unit 4 keeps (wA + wB) × 0.3', () => {
    const sim = arena();
    const a = devSpawn(sim, 0, 'bonker', { p: 100 });
    const b = devSpawn(sim, 0, 'bonker', { p: 100 });
    const c = devSpawn(sim, 0, 'bonker', { p: 100 });
    const d = devSpawn(sim, 0, 'bonker', { p: 100 });
    stepN(sim, 40);
    expect(pLu(sim, a.id)).toBe(pLu(sim, b.id));
    expect(pLu(sim, a.id)).toBe(pLu(sim, c.id));
    // small + small = 48 lu × 0.3 = 14.4 lu behind the ally directly ahead
    expect(pLu(sim, c.id) - pLu(sim, d.id)).toBeCloseTo(14.4, 5);
  });

  it('Siege forced march (A17.3): movement ×1.2 in Siege only', () => {
    const sim = arena();
    const u = devSpawn(sim, 0, 'bonker', { p: 20 });
    stepN(sim, 1);
    const before = pLu(sim, u.id);
    simCtx(sim).s.phase = 'siege';
    stepN(sim, 1);
    // 4.375 lu per tick × 1.2 = 5.25 lu
    expect(pLu(sim, u.id) - before).toBeCloseTo(5.25, 5);
  });

  it('siege crowd (A16.4 step 2): in Siege the file closes up within 60 lu of the enemy gate', () => {
    const column = (siege: boolean): number[] => {
      const sim = arena();
      simCtx(sim).s.sides[1].lastStand = 'used';
      if (siege) simCtx(sim).s.phase = 'siege';
      const ids = [0, 1, 2, 3, 4, 5].map((i) => devSpawn(sim, 0, 'bonker', { p: L - 300 - i * 10 }).id);
      stepN(sim, 120);
      return ids.map((id) => pLu(sim, id));
    };
    // A Bonker (half width 12, range 16) reaches the base from p ≥ L − 28.
    const reaches = (p: number): boolean => p >= L - 28;
    // Regulation: the three-wide front reaches the base, the rest queue 14.4 lu apart behind it.
    expect(column(false).filter(reaches)).toHaveLength(3);
    // Siege: all six stand at the gate and hit the base.
    expect(column(true).filter(reaches)).toHaveLength(6);
  });

  it('overtaking: melee passes a stationary longer-range ally; ranged queues behind stationary melee', () => {
    const sim = arena();
    // An enemy the Pebbler can shoot but the Bonker cannot reach yet; stunned so it stays put.
    const foe = devSpawn(sim, 1, 'tuskback', { p: L - 480 });
    stun(sim, foe.id, 400);
    const pebbler = devSpawn(sim, 0, 'pebbler', { p: 300 });
    const bonker = devSpawn(sim, 0, 'bonker', { p: 250 });
    stepN(sim, 12);
    expect(unitOf(sim, pebbler.id)?.mode).toBe('attack');
    expect(pLu(sim, pebbler.id)).toBe(300);
    expect(pLu(sim, bonker.id)).toBeGreaterThan(300);

    // A moving ally is never passed: the faster Bonker walks level with the slower Tuskback (front rank).
    const sim2 = arena();
    const tusk = devSpawn(sim2, 0, 'tuskback', { p: 100 });
    const bonk = devSpawn(sim2, 0, 'bonker', { p: 90 });
    stepN(sim2, 60);
    expect(pLu(sim2, bonk.id)).toBe(pLu(sim2, tusk.id));

    // Reach from the third position: a Spear Hunter queues behind two engaged Bonkers and still hits.
    const sim3 = arena();
    const foe3 = devSpawn(sim3, 1, 'tuskback', { p: L - 330 });
    stun(sim3, foe3.id, 400);
    const b1 = devSpawn(sim3, 0, 'bonker', { p: 290 });
    const b2 = devSpawn(sim3, 0, 'bonker', { p: 290 });
    const spear = devSpawn(sim3, 0, 'spear_hunter', { p: 200 });
    stepN(sim3, 60);
    expect(pLu(sim3, b1.id)).toBe(290);
    expect(pLu(sim3, b2.id)).toBe(290);
    expect(pLu(sim3, spear.id)).toBeLessThanOrEqual(290 - 16.8 + 1e-9);
    expect(unitOf(sim3, spear.id)?.mode).toBe('attack');
  });

  it('followSupport: stays 60 lu behind the frontmost non-follower, or at p ≤ 200 alone', () => {
    const sim = arena();
    const shaman = devSpawn(sim, 0, 'drum_shaman', { p: 20 });
    stepN(sim, 200);
    expect(pLu(sim, shaman.id)).toBe(200);
    const sim2 = arena();
    const front = devSpawn(sim2, 0, 'tuskback', { p: 500 });
    stun(sim2, front.id, 1000);
    const s2 = devSpawn(sim2, 0, 'drum_shaman', { p: 300 });
    stepN(sim2, 200);
    expect(pLu(sim2, s2.id)).toBe(440);
  });

  it('symmetric resolution: facing units that both advance split the gap and never overlap', () => {
    const sim = arena();
    // Bronze Cannons cannot shoot inside their 80 lu minimum range, so they keep advancing.
    const a = devSpawn(sim, 0, 'bronze_cannon', { p: 975 });
    const b = devSpawn(sim, 1, 'bronze_cannon', { p: 975 });
    // gap = 2000 − 975 − 975 − 48 = 2 lu
    stepN(sim, 1);
    const ua = unitOf(sim, a.id);
    const ub = unitOf(sim, b.id);
    expect(ua && ub && ua.x + ub.x).toBe(L * 1000);
    expect(pLu(sim, a.id)).toBe(976);
    stepN(sim, 10);
    const d = Math.abs((unitOf(sim, a.id)?.x ?? 0) - (unitOf(sim, b.id)?.x ?? 0));
    expect(d).toBeGreaterThanOrEqual(48000);
    expect(pLu(sim, a.id) + pLu(sim, b.id)).toBeCloseTo(L - 48, 5);
  });

  it('a unit stops at edge distance 0 against a stationary enemy and never increases overlap', () => {
    const sim = arena();
    const foe = devSpawn(sim, 1, 'bronze_cannon', { p: L - 600 });
    stun(sim, foe.id, 1000);
    const me = devSpawn(sim, 0, 'bronze_cannon', { p: 500 });
    stepN(sim, 60);
    // edge distance 0: centres 48 lu apart
    expect(pLu(sim, me.id)).toBe(552);
    // overlapping (transient, e.g. a landing): cannot move forward
    const sim2 = arena();
    const f2 = devSpawn(sim2, 1, 'bronze_cannon', { p: L - 600 });
    stun(sim2, f2.id, 1000);
    const m2 = devSpawn(sim2, 0, 'bronze_cannon', { p: 590 });
    stepN(sim2, 20);
    expect(pLu(sim2, m2.id)).toBe(590);
  });

  it('Hold: units beyond 320 walk back at 70% speed; units below do not pass 320', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const far = devSpawn(sim, 0, 'bonker', { p: 400 });
    const near = devSpawn(sim, 0, 'bonker', { p: 300 });
    st.step({ t: 'stance', side: 0, mode: 'hold' });
    // tick 1: stance applies at step 1, then movement: far walks back 4.375 × 0.7 = 3.062 lu (truncated in milli-lu)
    expect(pLu(sim, far.id)).toBeCloseTo(396.938, 5);
    stepN(sim, 60);
    expect(pLu(sim, far.id)).toBe(320);
    expect(pLu(sim, near.id)).toBe(320);
    expect(unitOf(sim, far.id)?.mode).toBe('hold');
  });

  it('Hold: gunships obey the stance, the bomber ignores it', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const gyro = devSpawn(sim, 0, 'gyrocopter', { p: 600 });
    const bomber = devSpawn(sim, 0, 'balloon_admiral', { p: 600 });
    st.step({ t: 'stance', side: 0, mode: 'hold' });
    // Gyrocopter 80 × 1.25 = 100 lu/s = 5 lu per tick, back at 70%: 3.5 lu; the Admiral advances 45 × 1.25 lu/s = 2.812 lu
    expect(pLu(sim, gyro.id)).toBeCloseTo(596.5, 5);
    expect(pLu(sim, bomber.id)).toBeCloseTo(602.812, 5);
    stepN(sim, 200);
    expect(pLu(sim, gyro.id)).toBe(320);
    expect(pLu(sim, bomber.id)).toBeGreaterThan(1000);
  });

  it('air units ignore blocking; the bomber never stops and halts at the enemy gate', () => {
    const sim = arena();
    const wall = devSpawn(sim, 1, 'tuskback', { p: L - 300 });
    stun(sim, wall.id, 5000);
    const gyro = devSpawn(sim, 0, 'gyrocopter', { p: 250 });
    const bomber = devSpawn(sim, 0, 'balloon_admiral', { p: 200 });
    stepN(sim, 2);
    expect(pLu(sim, bomber.id)).toBeCloseTo(205.624, 5);
    stepN(sim, 1000);
    // The gyrocopter stops over the Tuskback to shoot it (range 150), the bomber flies on.
    expect(pLu(sim, bomber.id)).toBe(L - 40);
    expect(pLu(sim, gyro.id)).toBeGreaterThan(250);
  });
});

describe('ranks (A2.7 formation, SIM_VERSION 8.0.0)', () => {
  // The fixture's numbers: a ranged unit keeps 25% of its first attack's range behind its melee front, a
  // unit whose first attack has a minimum range 40%, each ± 15% by unit id; only the latter closes up (past 30 lu).
  const band = (rangeLu: number, shareBp: number): [number, number] => [(rangeLu * shareBp * 0.85) / 10000, (rangeLu * shareBp * 1.15) / 10000];
  const PEBBLER = band(200, 2500); // 42.5-57.5 lu
  const CANNON = band(280, 4000); // Bronze Cannon (minimum range 80): 95.2-128.8 lu
  const within = (gap: number, [lo, hi]: [number, number]): void => {
    expect(gap).toBeGreaterThanOrEqual(lo - 1e-9);
    expect(gap).toBeLessThanOrEqual(hi + 1e-9);
  };

  it('a ranged unit ahead of its melee waits for it to pass, then follows at its place', () => {
    const sim = arena();
    const peb = devSpawn(sim, 0, 'pebbler', { p: 100 });
    const tusk = devSpawn(sim, 0, 'tuskback', { p: 90 });
    stepN(sim, 1);
    // Held: its melee front is behind it (before the ranks it led the march and capped the Tuskback).
    expect(pLu(sim, peb.id)).toBe(100);
    expect(pLu(sim, tusk.id)).toBeGreaterThan(90);
    stepN(sim, 120);
    const gap = pLu(sim, tusk.id) - pLu(sim, peb.id);
    within(gap, PEBBLER);
    // The place is fixed by the unit's id: the same gap while they march on.
    stepN(sim, 40);
    expect(pLu(sim, tusk.id) - pLu(sim, peb.id)).toBeCloseTo(gap, 3);
    expect(unitOf(sim, peb.id)?.mode).toBe('walk');
  });

  it('Long range keeps further back: a first attack with a minimum range takes the larger share', () => {
    const sim = arena();
    const front = devSpawn(sim, 0, 'tuskback', { p: 600 });
    stun(sim, front.id, 2000);
    const peb = devSpawn(sim, 0, 'pebbler', { p: 100 });
    const cannon = devSpawn(sim, 0, 'bronze_cannon', { p: 60 });
    stepN(sim, 300);
    within(600 - pLu(sim, peb.id), PEBBLER);
    within(600 - pLu(sim, cannon.id), CANNON);
    expect(unitOf(sim, cannon.id)?.mode).toBe('hold');
  });

  it('firing from well behind its place, a Long range unit steps up between shots and keeps its rate of fire', () => {
    // An enemy blocked by a stunned front; each shooter can hit it from where it spawns.
    const run = (card: 'bronze_cannon' | 'pebbler', at: number, stepUp: boolean) => {
      const sim = arena();
      const front = devSpawn(sim, 0, 'tuskback', { p: 600 });
      stun(sim, front.id, 2000);
      const foe = devSpawn(sim, 1, 'tuskback', { p: L - 648 });
      stun(sim, foe.id, 2000);
      if (!stepUp) simCtx(sim).s.sides[0].stance = 'fallback';
      const u = devSpawn(sim, 0, card, { p: at });
      const shots = stepN(sim, 300).filter((e) => e.e === 'attackStarted' && e.id === u.id).length;
      return { p: pLu(sim, u.id), shots };
    };
    // The Bronze Cannon (minimum range 80: the Long range share) spawns at edge distance 260 of the enemy.
    const ranks = run('bronze_cannon', 340, true);
    // It rests at its place or up to the 30 lu close-up threshold short of it (it stops for each windup).
    within(600 - ranks.p, [CANNON[0], CANNON[1] + 30]);
    // The same shots as one that never moves (Fall back keeps the old rule): it walks only between them.
    const still = run('bronze_cannon', 340, false);
    expect(still.p).toBe(340);
    expect(ranks.shots).toBe(still.shots);
    expect(ranks.shots).toBeGreaterThanOrEqual(4);
    // An ordinary ranged unit never closes up (`rangedCloseUpLu` 0): it fires from where its range found the
    // target (edge distance 192), behind its place, as before the ranks.
    const peb = run('pebbler', 420, true);
    expect(peb.p).toBe(420);
  });

  it('never walks back for its place, and holds while its melee front is behind it', () => {
    const sim = arena();
    const front = devSpawn(sim, 0, 'tuskback', { p: 300 });
    stun(sim, front.id, 2000);
    const foe = devSpawn(sim, 1, 'tuskback', { p: L - 680 });
    stun(sim, foe.id, 2000);
    const fighting = devSpawn(sim, 0, 'pebbler', { p: 500 });
    stepN(sim, 60);
    expect(pLu(sim, fighting.id)).toBe(500);
    expect(unitOf(sim, fighting.id)?.mode).toBe('attack');
    // Without a target it waits where it stands instead of walking on alone.
    const sim2 = arena();
    const f2 = devSpawn(sim2, 0, 'tuskback', { p: 300 });
    stun(sim2, f2.id, 2000);
    const idle = devSpawn(sim2, 0, 'pebbler', { p: 500 });
    stepN(sim2, 60);
    expect(pLu(sim2, idle.id)).toBe(500);
    expect(unitOf(sim2, idle.id)?.mode).toBe('hold');
  });

  it('melee walks through its own ranks to reach the front', () => {
    const sim = arena();
    const tusk = devSpawn(sim, 0, 'tuskback', { p: 300 });
    const peb = devSpawn(sim, 0, 'pebbler', { p: 250 });
    const bonk = devSpawn(sim, 0, 'bonker', { p: 240 });
    stepN(sim, 100);
    // The Pebbler walks at its place behind the Tuskback; the faster Bonker passes it and joins the front rank.
    expect(pLu(sim, bonk.id)).toBe(pLu(sim, tusk.id));
    expect(pLu(sim, peb.id)).toBeLessThan(pLu(sim, bonk.id));
  });

  it('Hold: ranked units form up their gap behind the flag; one beyond its line walks back to it', () => {
    const hold = (pebP: number) => {
      const sim = arena();
      const st = new Stamper(sim);
      const bonk = devSpawn(sim, 0, 'bonker', { p: 100 });
      const peb = devSpawn(sim, 0, 'pebbler', { p: pebP });
      st.step({ t: 'stance', side: 0, mode: 'hold' });
      stepN(sim, 300);
      expect(pLu(sim, bonk.id)).toBe(320);
      expect(unitOf(sim, peb.id)?.mode).toBe('hold');
      return 320 - pLu(sim, peb.id);
    };
    within(hold(60), PEBBLER);
    within(hold(420), PEBBLER);
  });

  it('off in Fall back and for a side with no melee on the lane (an all-ranged army walks as before)', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSpawn(sim, 0, 'bonker', { p: 100 });
    const peb = devSpawn(sim, 0, 'pebbler', { p: 100 });
    st.step({ t: 'stance', side: 0, mode: 'fallback' });
    stepN(sim, 120);
    expect(pLu(sim, peb.id)).toBe(200);
    // A lone Pebbler: 65 lu/s × 1.25 = 4.062 lu per tick (truncated in milli-lu), as before the ranks.
    const sim2 = arena();
    const lone = devSpawn(sim2, 0, 'pebbler', { p: 20 });
    stepN(sim2, 20);
    expect(pLu(sim2, lone.id)).toBe(101.24);
  });

  it('air units and armored vehicles without a minimum range are outside the ranks', () => {
    const sim = arena();
    const front = devSpawn(sim, 0, 'tuskback', { p: 100 });
    stun(sim, front.id, 2000);
    const gyro = devSpawn(sim, 0, 'gyrocopter', { p: 150 });
    const tank = devSpawn(sim, 0, 'behemoth_tank', { p: 150 });
    const peb = devSpawn(sim, 0, 'pebbler', { p: 150 });
    stepN(sim, 20);
    expect(pLu(sim, gyro.id)).toBeGreaterThan(150);
    expect(pLu(sim, tank.id)).toBeGreaterThan(150);
    expect(pLu(sim, peb.id)).toBe(150);
  });

  it('the place varies by unit id inside ± 15%, the same on every run', () => {
    const gapFor = (pad: number): number => {
      const sim = arena();
      const front = devSpawn(sim, 0, 'tuskback', { p: 600 });
      stun(sim, front.id, 2000);
      // Far-away enemies only to move the Pebbler's id along.
      for (let i = 0; i < pad; i += 1) stun(sim, devSpawn(sim, 1, 'bonker', { p: 20 }).id, 2000);
      const peb = devSpawn(sim, 0, 'pebbler', { p: 300 });
      stepN(sim, 120);
      return 600 - pLu(sim, peb.id);
    };
    const gaps = [0, 1, 2, 3, 4, 5].map(gapFor);
    for (const g of gaps) within(g, PEBBLER);
    expect(new Set(gaps).size).toBeGreaterThan(2);
    expect([0, 1, 2, 3, 4, 5].map(gapFor)).toEqual(gaps);
  });
});
