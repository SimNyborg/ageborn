/**
 * The combat levers of queue item 38 (DESIGN A2.7 Attack cycle): A9a de-phases the first swing of every
 * engagement, so equal-range, equal-interval pairs stop swinging and landing on one tick (SIM_VERSION 9.0.0);
 * A9b's first half lets a melee swing whose target died land on another enemy in reach (SIM_VERSION 10.0.0).
 * The switches are the sim's own defaults (`DEFAULT_BATTLE.dephaseTicks`, `retargetWhiffs`), read from
 * `content.battle` like the other battle numbers, so a content patch can turn a lever off (0).
 */
import { describe, expect, it } from 'vitest';
import type { CompiledContent, SimEvent } from '@/contracts';
import { devMove, devSpawn, simCtx, stepN, unitById } from '../debug';
import { DEFAULT_BATTLE } from '../rules';
import { arena, fixtureInPhase, fixtureWith, L, ofKind, stun } from './helpers';

const D = DEFAULT_BATTLE.dephaseTicks;

/** Two Bonkers walking into each other from the same distance (a mirror duel). */
function mirrorDuel(content?: CompiledContent): { ev: SimEvent[]; a: number; b: number } {
  const sim = arena(content ? { content } : {});
  const a = devSpawn(sim, 0, 'bonker', { p: L / 2 - 100 }).id;
  const b = devSpawn(sim, 1, 'bonker', { p: L / 2 - 100 }).id;
  return { ev: stepN(sim, 400), a, b };
}

/** A unit spawned in range of a stunned Tuskback after `delay` ticks (the melee 4 lu, the Pebbler 164 lu away). */
function intoStunned(card: string, delay: number): { starts: (SimEvent & { e: 'attackStarted' })[]; hits: (SimEvent & { e: 'hit' })[]; fired: (SimEvent & { e: 'projectileFired' })[] } {
  const sim = arena();
  stepN(sim, delay);
  const ranged = card === 'pebbler';
  const foe = devSpawn(sim, 1, 'tuskback', { p: L - (ranged ? 300 : 60) });
  stun(sim, foe.id, 2000);
  const u = devSpawn(sim, 0, card, { p: ranged ? 100 : 20 });
  const ev = stepN(sim, 120);
  return {
    starts: ofKind(ev, 'attackStarted').filter((e) => e.id === u.id && e.attackIndex === 0),
    hits: ofKind(ev, 'hit').filter((e) => e.sourceId === u.id),
    fired: ofKind(ev, 'projectileFired').filter((e) => e.from === u.id),
  };
}

describe('A9a: the first swing of an engagement is de-phased (queue item 38)', () => {
  it('is on by default: 0 or 3 extra ticks (150 ms)', () => {
    expect(D).toBe(3);
  });

  it('a mirror duel lands its blows 3 ticks apart and ends with one survivor, not a double KO', () => {
    const { ev, a, b } = mirrorDuel();
    const hits = ofKind(ev, 'hit');
    const ab = hits.filter((h) => h.sourceId === a).map((h) => h.tick);
    const ba = hits.filter((h) => h.sourceId === b).map((h) => h.tick);
    expect(ab.length).toBeGreaterThanOrEqual(7);
    expect(ba.length).toBeGreaterThanOrEqual(7);
    for (const t of ab) expect(ba).not.toContain(t);
    for (let i = 0; i < Math.min(ab.length, ba.length); i += 1) expect(Math.abs((ab[i] as number) - (ba[i] as number))).toBe(D);
    expect(ofKind(ev, 'died')).toHaveLength(1);
  });

  it('off (dephaseTicks 0): the old timing, the mirror duel lands on one tick and ends in a double KO', () => {
    const { ev, a, b } = mirrorDuel(fixtureInPhase);
    const hits = ofKind(ev, 'hit');
    const ab = hits.filter((h) => h.sourceId === a).map((h) => h.tick);
    const ba = hits.filter((h) => h.sourceId === b).map((h) => h.tick);
    expect(ab).toEqual(ba);
    expect(ofKind(ev, 'attackStarted').every((s) => s.windupTicks === 8)).toBe(true);
    const died = ofKind(ev, 'died');
    expect(died).toHaveLength(2);
    expect(died[0]?.tick).toBe(died[1]?.tick);
  });

  it('the wait is 0 or 3 ticks on the windup and the interval alike; later swings keep the 1.0 s rhythm', () => {
    const waits = new Set<number>();
    for (let k = 0; k < 8; k += 1) {
      const { starts, hits } = intoStunned('bonker', k);
      const first = starts[0];
      const second = starts[1];
      const third = starts[2];
      if (!first || !second || !third) throw new Error('the Bonker never attacked');
      const wait = first.windupTicks - 8;
      expect([0, D]).toContain(wait);
      waits.add(wait);
      expect(hits[0]?.tick).toBe(first.tick + first.windupTicks);
      expect(second.tick - first.tick).toBe(20 + wait);
      expect(second.windupTicks).toBe(8);
      expect(third.tick - second.tick).toBe(20);
      expect(hits[1]?.tick).toBe(second.tick + 8);
    }
    // a hash of the unit id and the tick: both waits occur
    expect([...waits].sort((x, y) => x - y)).toEqual([0, D]);
  });

  it('is deterministic: the same setup gives the same waits', () => {
    for (let k = 0; k < 4; k += 1) {
      expect(intoStunned('bonker', k).starts.map((s) => [s.tick, s.windupTicks])).toEqual(intoStunned('bonker', k).starts.map((s) => [s.tick, s.windupTicks]));
    }
  });

  it('every attack 0 is de-phased, ranged too: the Pebbler shot waits 0 or 3 ticks before it flies', () => {
    const waits = new Set<number>();
    for (let k = 0; k < 8; k += 1) {
      const { starts, fired } = intoStunned('pebbler', k);
      const first = starts[0];
      if (!first) throw new Error('the Pebbler never shot');
      waits.add(first.windupTicks - 14);
      expect(fired[0]?.tick).toBe(first.tick + first.windupTicks);
      expect(starts[1]?.windupTicks).toBe(14);
    }
    expect([...waits].sort((x, y) => x - y)).toEqual([0, D]);
  });

  it('a unit that stays engaged keeps its rhythm: no wait when the next foe is already in range', () => {
    const sim = arena();
    const f1 = devSpawn(sim, 1, 'bonker', { p: L - 52 });
    const f2 = devSpawn(sim, 1, 'bonker', { p: L - 52 });
    stun(sim, f1.id, 1000);
    stun(sim, f2.id, 1000);
    const one = simCtx(sim).s.units.find((u) => u.id === f1.id);
    if (!one) throw new Error('no unit');
    one.hp = 100;
    const b = devSpawn(sim, 0, 'bonker', { p: 20 });
    const starts = ofKind(stepN(sim, 80), 'attackStarted').filter((e) => e.id === b.id);
    const first = starts[0];
    const second = starts[1];
    if (!first || !second) throw new Error('the Bonker never attacked');
    expect(first.targetId).toBe(f1.id);
    expect(second.targetId).toBe(f2.id);
    expect(second.windupTicks).toBe(8);
    expect(second.tick - first.tick).toBe(20 + first.windupTicks - 8);
  });

  it('the first-hit bonus survives the wait (×2 and 30 lu knockback on the first blow)', () => {
    for (let k = 0; k < 4; k += 1) {
      const sim = arena();
      stepN(sim, k);
      const t = devSpawn(sim, 1, 'bonker', { p: L - 150 });
      stun(sim, t.id, 1000);
      const tusk = devSpawn(sim, 0, 'tuskback', { p: 100 });
      const ev = stepN(sim, 80);
      const hits = ofKind(ev, 'hit').filter((h) => h.sourceId === tusk.id);
      expect(hits[0]?.damage).toBe(8400);
      expect(hits[1]?.damage).toBe(4200);
      expect(ofKind(ev, 'knockback').filter((x) => x.id === t.id)).toHaveLength(1);
    }
  });

  it('chargers meeting head-on: the first to land gores, and its knockback cancels the other windup', () => {
    const sim = arena();
    const t = devSpawn(sim, 1, 'tuskback', { p: L - 150 });
    const k = devSpawn(sim, 0, 'tuskback', { p: 100 });
    const ev = stepN(sim, 30);
    const kbs = ofKind(ev, 'knockback');
    expect(kbs).toHaveLength(1);
    // large units resist 50%: 30 × 50% = 15 lu
    expect(Math.abs((kbs[0]?.toX ?? 0) - (kbs[0]?.fromX ?? 0))).toBe(15000);
    const struck = kbs[0]?.id;
    const striker = struck === t.id ? k.id : t.id;
    // the struck one's first swing never lands; the striker's lands once, doubled
    expect(ofKind(ev, 'hit').filter((h) => h.sourceId === struck)).toHaveLength(0);
    expect(ofKind(ev, 'hit').filter((h) => h.sourceId === striker).map((h) => h.damage)).toEqual([8400]);
    expect(unitById(sim, struck ?? 0)?.attacks[0]?.impactTick).toBe(0);
  });
});

describe('A9b retarget whiffs: a melee swing whose target died lands on another enemy in reach (queue item 38)', () => {
  /** A Bonker swinging at the first of two stunned foes in reach; `before` runs right after the swing starts. */
  function swingAtFallen(content: CompiledContent | undefined, before: (sim: ReturnType<typeof arena>, first: number) => void) {
    const sim = arena(content ? { content } : {});
    const b1 = devSpawn(sim, 1, 'bonker', { p: L - 52 }).id;
    const b2 = devSpawn(sim, 1, 'bonker', { p: L - 52 }).id;
    stun(sim, b1, 1000);
    stun(sim, b2, 1000);
    const a = devSpawn(sim, 0, 'bonker', { p: 20 }).id;
    const start = ofKind(stepN(sim, 1), 'attackStarted').find((e) => e.id === a);
    if (!start) throw new Error('the Bonker did not swing');
    expect(start.targetId).toBe(b1);
    before(sim, b1);
    const ev = stepN(sim, start.windupTicks);
    return { hits: ofKind(ev, 'hit').filter((h) => h.sourceId === a), impact: start.tick + start.windupTicks, b2 };
  }
  const fell = (sim: ReturnType<typeof arena>, id: number): void => {
    const u = simCtx(sim).s.units.find((x) => x.id === id);
    if (u) u.hp = 0;
  };

  it('is on by default', () => {
    expect(DEFAULT_BATTLE.retargetWhiffs).toBe(1);
  });

  it('the swing lands on the other enemy in reach, on its own impact tick', () => {
    const { hits, impact, b2 } = swingAtFallen(undefined, fell);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.targetId).toBe(b2);
    expect(hits[0]?.tick).toBe(impact);
  });

  it('off (retargetWhiffs 0): that swing whiffs, as before', () => {
    expect(swingAtFallen(fixtureWith({ retargetWhiffs: 0 }), fell).hits).toHaveLength(0);
  });

  it('a swing whose target is alive but out of reach still whiffs', () => {
    const { hits } = swingAtFallen(undefined, (sim, id) => devMove(sim, id, L - 400));
    expect(hits).toHaveLength(0);
  });
});
