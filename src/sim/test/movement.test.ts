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
    stepN(sim, 40);
    expect(unitOf(sim, pebbler.id)?.mode).toBe('attack');
    expect(pLu(sim, pebbler.id)).toBe(300);
    expect(pLu(sim, bonker.id)).toBeGreaterThan(300);

    // A moving ally is never passed: the faster Bonker walks level with the Pebbler (front rank).
    const sim2 = arena();
    const peb = devSpawn(sim2, 0, 'pebbler', { p: 100 });
    const bonk = devSpawn(sim2, 0, 'bonker', { p: 90 });
    stepN(sim2, 60);
    expect(pLu(sim2, bonk.id)).toBe(pLu(sim2, peb.id));

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
