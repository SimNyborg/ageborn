/**
 * Last Base Standing (DESIGN A2.10.1, SIM_VERSION 6.0.0): Siege steps derived from the tick, base and
 * turret damage per step, no symmetric decay, the Crumble rope (side choice, dead band, what counts as
 * a front), no evolve heal in Crumble, the guaranteed end, the observation, and the timed formats
 * untouched. Runs on the fixture plus a compressed `last` format (`fixtureLast`), and once on the live
 * content for the real `endByMs`.
 */
import { describe, expect, it } from 'vitest';
import type { Sim } from '@/contracts';
import { raw } from '@/content/raw';
import { BP } from '@/core';
import { createSim } from '../createSim';
import { damageBase, makeImpact, siegeBaseBp, siegeTurretBp } from '../damage';
import { devPlaceFort, devSetBaseBp, devSpawn, simCtx, stepN } from '../debug';
import { crumbleActive, escalationStep, ropeFront, ropeTargets } from '../escalation';
import { compileForSim } from '../shim';
import { LAST_END_BY_MS, LAST_STEPS, fixture, fixtureLast, matchConfig, ofKind, sideConfig } from './helpers';

const T = (ms: number): number => ms / 50;
const STEP_TICKS = LAST_STEPS.map((x) => T(x.atMs));

function lastSim(o: { seed?: number; modifiers?: string[] } = {}): Sim {
  return createSim(
    matchConfig({
      seed: o.seed ?? 1,
      format: 'last',
      content: fixtureLast,
      sides: [sideConfig(fixtureLast), sideConfig(fixtureLast, { isBot: true, label: 'AI Test' })],
      ...(o.modifiers ? { modifiers: o.modifiers } : {}),
    }),
  );
}

/** First unit card of a group in the fixture's Stone Age. */
function card(group: string, o: { air?: boolean } = {}): string {
  const u = Object.values(fixtureLast.units).find((d) => d.age === 'stone' && !d.hidden && d.group === group && (o.air === undefined || d.tags.includes('air') === o.air));
  if (!u) throw new Error(`no ${group} card`);
  return u.id;
}

function anyAirCard(): string {
  const u = Object.values(fixtureLast.units).find((d) => !d.hidden && d.tags.includes('air'));
  if (!u) throw new Error('no air card');
  return u.id;
}

describe('Last Base Standing: the steps (A2.10.1)', () => {
  it('derives the step from the tick: 0 before Siege I, then one per entry', () => {
    const ctx = simCtx(lastSim());
    expect(ctx.escalation?.map((x) => x.tick)).toEqual(STEP_TICKS);
    expect(escalationStep(ctx, 0)).toBe(0);
    STEP_TICKS.forEach((t, i) => {
      expect(escalationStep(ctx, t - 1)).toBe(i);
      expect(escalationStep(ctx, t)).toBe(i + 1);
    });
    expect(crumbleActive(ctx, STEP_TICKS[3] as number)).toBe(true);
    expect(crumbleActive(ctx, (STEP_TICKS[3] as number) - 1)).toBe(false);
  });

  it('has no steps in a timed format, so nothing changes there', () => {
    const ctx = simCtx(createSim(matchConfig({ format: 'full' })));
    expect(ctx.escalation).toBeNull();
    expect(escalationStep(ctx, 100000)).toBe(0);
    ctx.tick = 30000;
    expect(siegeBaseBp(ctx)).toBe(ctx.econ.siege.baseDamageBp);
    expect(siegeTurretBp(ctx)).toBe(ctx.econ.siege.turretDamageBp);
  });

  it('shifts every step with Siege when a modifier moves Siege earlier', () => {
    const base = simCtx(lastSim());
    const moved = simCtx(lastSim({ modifiers: ['sudden_siege'] }));
    const shift = (base.siegeTick as number) - (moved.siegeTick as number);
    expect(shift).toBeGreaterThan(0);
    expect(moved.escalation?.map((x) => x.tick)).toEqual(STEP_TICKS.map((t) => t - shift));
  });

  it('reads base and turret damage from the step in force', () => {
    const ctx = simCtx(lastSim());
    const rows = LAST_STEPS.map((x, i) => ({ tick: STEP_TICKS[i] as number, base: x.baseDamageBp, turret: x.turretDamageBp }));
    for (const r of rows) {
      ctx.tick = r.tick;
      expect(siegeBaseBp(ctx)).toBe(r.base);
      expect(siegeTurretBp(ctx)).toBe(r.turret);
    }
    // An attack on the base in Siege III: ×4 (the A2.7 minimum of 1 HP does not apply here).
    ctx.tick = STEP_TICKS[2] as number;
    ctx.s.phase = 'siege';
    const b = ctx.s.sides[1];
    const before = b.baseHp;
    damageBase(ctx, 1, makeImpact(0, 1, 'x'), 1000);
    expect(before - b.baseHp).toBe(4000);
  });
});

describe('Last Base Standing: the rope (A2.10.1)', () => {
  const crumble = STEP_TICKS[3] as number;

  it('takes only the side whose front is more than 40 lu behind', () => {
    const sim = lastSim();
    const ctx = simCtx(sim);
    const inf = card('infantry');
    devSpawn(sim, 0, inf, { p: 1100 });
    devSpawn(sim, 1, inf, { p: 900 });
    expect(ropeFront(ctx, 0)).toBe(1100000);
    expect(ropeFront(ctx, 1)).toBe(900000);
    expect(ropeTargets(ctx, crumble)).toEqual([false, true]);
    expect(ropeTargets(ctx, crumble - 1)).toEqual([false, false]);
  });

  it('takes both sides when the fronts are within the dead band, or both lanes are empty', () => {
    const sim = lastSim();
    const ctx = simCtx(sim);
    expect(ropeTargets(ctx, crumble)).toEqual([true, true]);
    const inf = card('infantry');
    devSpawn(sim, 0, inf, { p: 1000 });
    devSpawn(sim, 1, inf, { p: 961 });
    expect(ropeTargets(ctx, crumble)).toEqual([true, true]);
    devSpawn(sim, 0, inf, { p: 1002 });
    expect(ropeTargets(ctx, crumble)).toEqual([false, true]);
  });

  it('counts only live trained ground units: air, summons, levies and forts set no front', () => {
    const sim = lastSim();
    const ctx = simCtx(sim);
    devSpawn(sim, 0, anyAirCard(), { p: 1500 });
    devSpawn(sim, 0, card('infantry'), { p: 1500, summoned: true });
    devSpawn(sim, 0, 'cave_youth', { p: 1500 });
    devPlaceFort(sim, 0, 'war_camp', { done: true });
    devSpawn(sim, 1, card('infantry'), { p: 300 });
    expect(ropeFront(ctx, 0)).toBe(0);
    expect(ropeTargets(ctx, crumble)).toEqual([true, false]);
    const dead = devSpawn(sim, 0, card('infantry'), { p: 1500 });
    dead.hp = 0;
    expect(ropeTargets(ctx, crumble)).toEqual([true, false]);
  });

  it('runs no symmetric decay in Siege, then crumbles through damageBase from Crumble on', () => {
    const sim = lastSim();
    const ev = stepN(sim, crumble - 1);
    expect(ofKind(ev, 'escalated').map((e) => [e.step, e.tick])).toEqual([1, 2, 3].map((k) => [k, STEP_TICKS[k - 1]]));
    expect(ofKind(ev, 'phaseChanged').map((e) => e.phase)).toEqual(['overdrive', 'siege']);
    expect(sim.state.sides[0].baseHp).toBe(sim.state.sides[0].baseMaxHp);
    expect(sim.state.sides[1].baseHp).toBe(sim.state.sides[1].baseMaxHp);
    const at = stepN(sim, 1);
    expect(ofKind(at, 'escalated').map((e) => e.step)).toEqual([4]);
    const crumbled = ofKind(at, 'crumbled');
    expect(crumbled.map((e) => e.side)).toEqual([0, 1]);
    // 0.5% of max HP per second, on the 20-tick decay beat.
    expect(crumbled[0]?.amount).toBe(Math.trunc((sim.state.sides[0].baseMaxHp * 50) / BP));
    expect(ofKind(at, 'baseDamaged').length).toBe(2);
    expect(ofKind(stepN(sim, 19), 'crumbled')).toEqual([]);
    expect(ofKind(stepN(sim, 1), 'crumbled').length).toBe(2);
  });

  it('ends two idle sides in a draw (both bases on one tick) by endByMs, with Last Stand arming as usual', () => {
    const sim = lastSim();
    const ev = stepN(sim, T(LAST_END_BY_MS) + 100);
    const o = sim.state.outcome;
    expect(o?.reason).toBe('bothDestroyed');
    expect(o?.winner).toBeNull();
    expect(o?.tick ?? Infinity).toBeLessThanOrEqual(T(LAST_END_BY_MS));
    expect(o?.tick ?? 0).toBeGreaterThan(STEP_TICKS[4] as number);
    expect(ofKind(ev, 'lastStandArmed').length).toBe(2);
    expect(ofKind(ev, 'matchEnded')).toHaveLength(1);
  });

  it('a lone side whose foe holds the field crumbles alone and loses', () => {
    const sim = lastSim();
    const ctx = simCtx(sim);
    stepN(sim, crumble - 2);
    // Side 1 holds the field with one unbreakable unit past mid-lane, so side 0 crumbles alone.
    const u = devSpawn(sim, 1, card('infantry'), { p: 1200 });
    const live = ctx.s.units.find((x) => x.id === u.id);
    if (!live) throw new Error('no unit');
    live.maxHp = live.hp = 100_000_000;
    const ev = stepN(sim, 20 * 200);
    const crumbled = ofKind(ev, 'crumbled');
    expect(crumbled.length).toBeGreaterThan(0);
    expect(crumbled.every((e) => e.side === 0)).toBe(true);
    expect(sim.state.outcome?.winner).toBe(1);
  });
});

describe('Last Base Standing: evolving in Crumble (A2.10.1)', () => {
  function evolveAt(tick: number): number {
    const sim = lastSim();
    const ctx = simCtx(sim);
    stepN(sim, tick - 1);
    devSetBaseBp(sim, 0, 5000);
    ctx.s.sides[0].ascendUntil = tick;
    stepN(sim, 1);
    const s = ctx.s.sides[0];
    expect(s.ageIndex).toBe(1);
    return Math.round((s.baseHp * BP) / s.baseMaxHp);
  }

  it('keeps the HP percentage and heals 5% before Crumble, but does not heal in Crumble', () => {
    // Off the 20-tick decay beat, so the rope does not touch the base on this tick.
    expect(evolveAt((STEP_TICKS[2] as number) + 5)).toBe(5500);
    expect(evolveAt((STEP_TICKS[3] as number) + 5)).toBe(5000);
  });
});

describe('Last Base Standing: the observation (A2.10.1)', () => {
  it('shows both players the schedule, the step and who crumbles', () => {
    const sim = lastSim();
    const o0 = sim.observe(0);
    expect(o0.escalation?.step).toBe(0);
    expect(o0.escalation?.steps.map((x) => x.tick)).toEqual(STEP_TICKS);
    expect(o0.escalation?.steps[4]?.crumbleBpPerSec).toBe(100);
    expect(o0.escalation?.crumbling).toEqual([false, false]);
    stepN(sim, (STEP_TICKS[3] as number) + 1);
    const o1 = sim.observe(1);
    expect(o1.escalation?.step).toBe(4);
    expect(o1.escalation?.crumbling).toEqual([true, true]);
  });

  it('is absent in a timed format', () => {
    const sim = createSim(matchConfig({ format: 'full' }));
    expect(sim.observe(0).escalation).toBeUndefined();
    expect(Object.keys(sim.observe(0))).not.toContain('escalation');
    expect(fixture.formats['last']).toBeUndefined();
  });
});

describe('Last Base Standing on the live content (A2.10.1)', () => {
  const live = compileForSim(raw);

  it('is a 7-age untimed war with no Final Bell, and two idle sides end by its endByMs (25:44)', () => {
    const f = live.formats['last'];
    expect(f?.kind).toBe('untimed');
    expect(f?.ages).toHaveLength(7);
    expect(f?.finalBellMs).toBeNull();
    expect(f?.endByMs).toBe(1544000);
    const sim = createSim(matchConfig({ format: 'last', content: live, sides: [sideConfig(live), sideConfig(live, { isBot: true, label: 'AI Test' })] }));
    stepN(sim, T(1544000) + 200);
    const o = sim.state.outcome;
    expect(o?.reason).toBe('bothDestroyed');
    expect(o?.tick ?? Infinity).toBeLessThanOrEqual(T(1544000));
  });
});
