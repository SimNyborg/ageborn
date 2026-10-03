/**
 * Bronze wave kinds (SIM_VERSION 7.1.0, CONTENT_PLAN 5.2): the Dread aura (M4, `aura.foe`), the ally
 * speed aura, and the first-time combinations the wave plays: `siegeOnly` with `riders` (Wooden Horse),
 * `firstHitBonus` with `frenzy` (Minotaur) and a whole-lane signal with a snare (Sandstorm). On the frozen
 * fixture plus the wave's draft cards (`tests/fixtures/bronzeWave.ts`).
 */
import { describe, expect, it } from 'vitest';
import { BP, PPM } from '@/core';
import { applyStatus, isMarked, unitAttackSpeedBp, unitDamageBonusBp } from '../damage';
import { devSetGold, devSetPower, devSpawn, simCtx, stepN, unitById } from '../debug';
import { createSim } from '../createSim';
import { unitSpeed } from '../systems/movement';
import { L, Stamper, baselineLoadout, fixtureBronze, matchConfig, ofKind, sideConfig, stun } from './helpers';

/** A lane on the Bronze wave fixture (no clock), with Sandstorm in each side's Stone Field slot. */
function lane() {
  const lo = baselineLoadout(fixtureBronze, 'stone');
  const loadout = { ...lo, powers: { home: lo.powers.home, field: 'sandstorm' } };
  const side = (label: string) => sideConfig(fixtureBronze, { label, loadouts: { stone: loadout } });
  return createSim(matchConfig({ content: fixtureBronze, training: { noClock: true }, sides: [side('A'), side('B')] }));
}

/** Effective speed of a unit (mlu per tick) after this tick's statuses and auras. */
function speedOf(sim: ReturnType<typeof lane>, id: number): number {
  const ctx = simCtx(sim);
  const u = unitById(sim, id);
  if (!u) throw new Error('no unit');
  return unitSpeed(ctx, u, ctx.rules.unitList[u.ci] as Parameters<typeof unitSpeed>[2]);
}

describe('M4 Dread aura', () => {
  it('slows enemy ground units inside the radius by its magnitude, never allies, air or units outside', () => {
    const sim = lane();
    const ctx = simCtx(sim);
    const chorus = devSpawn(sim, 0, 'tragic_chorus', { p: 800 });
    stun(sim, chorus.id, 400);
    const near = devSpawn(sim, 1, 'bonker', { p: L - 900 });
    const far = devSpawn(sim, 1, 'bonker', { p: L - 1200 });
    const ally = devSpawn(sim, 0, 'bonker', { p: 860 });
    const air = devSpawn(sim, 1, 'repair_drone', { p: L - 860 });
    for (const u of [near, far, ally, air]) stun(sim, u.id, 400);
    stepN(sim, 1);
    // Stunned units keep their speed number; read it straight from the rules.
    const full = (id: number) => {
      const u = unitById(sim, id);
      return u ? (ctx.rules.unitList[u.ci]?.speed ?? 0) : 0;
    };
    expect(speedOf(sim, near.id)).toBe(Math.trunc((full(near.id) * (BP - 2000)) / BP));
    expect(speedOf(sim, far.id)).toBe(full(far.id));
    expect(speedOf(sim, ally.id)).toBe(full(ally.id));
    expect(speedOf(sim, air.id)).toBe(full(air.id));
    // The source itself is not slowed.
    expect(speedOf(sim, chorus.id)).toBe(full(chorus.id));
  });

  it('never stacks: two choruses slow as one, and a stronger timed slow wins without being extended', () => {
    const sim = lane();
    const ctx = simCtx(sim);
    const a = devSpawn(sim, 0, 'tragic_chorus', { p: 800 });
    const b = devSpawn(sim, 0, 'tragic_chorus', { p: 820 });
    const foe = devSpawn(sim, 1, 'bonker', { p: L - 900 });
    for (const u of [a, b, foe]) stun(sim, u.id, 400);
    stepN(sim, 1);
    const u = unitById(sim, foe.id);
    if (!u) throw new Error('no unit');
    const base = ctx.rules.unitList[u.ci]?.speed ?? 0;
    expect(speedOf(sim, foe.id)).toBe(Math.trunc((base * 8000) / BP));
    applyStatus(ctx, u, { kind: 'slow', magnitudeBp: 4000, ticks: 10, amount: 0, frozen: false }, 0);
    expect(speedOf(sim, foe.id)).toBe(Math.trunc((base * 6000) / BP));
    stepN(sim, 12);
    // The timed slow ran out on time; the aura's 20% is back.
    expect(speedOf(sim, foe.id)).toBe(Math.trunc((base * 8000) / BP));
  });

  it('ends when the victim leaves the radius or the source dies, and shows the slow mark on the heal grid', () => {
    const sim = lane();
    const chorus = devSpawn(sim, 0, 'tragic_chorus', { p: 800 });
    const foe = devSpawn(sim, 1, 'bonker', { p: L - 900 });
    for (const u of [chorus, foe]) stun(sim, u.id, 400);
    const ev = stepN(sim, 20);
    const marks = ofKind(ev, 'statusApplied').filter((e) => e.id === foe.id && e.kind === 'slow');
    expect(marks.length).toBeGreaterThanOrEqual(1);
    expect(marks.length).toBeLessThanOrEqual(3);
    const src = unitById(sim, chorus.id);
    if (src) src.hp = 0;
    stepN(sim, 2);
    const u = unitById(sim, foe.id);
    expect(u?.auraSlowBp).toBe(0);
  });

  it('a mark aura raises the damage taken like a timed mark (the stronger applies)', () => {
    const sim = lane();
    const ctx = simCtx(sim);
    const r = ctx.rules.units.tragic_chorus;
    if (!r?.aura) throw new Error('no aura');
    const foe = devSpawn(sim, 1, 'bonker', { p: L - 900 });
    const u = unitById(sim, foe.id);
    if (!u) throw new Error('no unit');
    u.auraMarkBp = 1500;
    expect(isMarked(u)).toBe(1500);
    applyStatus(ctx, u, { kind: 'mark', magnitudeBp: 2000, ticks: 40, amount: 0, frozen: false }, 0);
    expect(isMarked(u)).toBe(2000);
  });
});

describe('ally speed aura (Aulos Piper)', () => {
  it('allies inside the radius move 15% faster; it never stacks with a timed speed buff (the stronger applies)', () => {
    const sim = lane();
    const ctx = simCtx(sim);
    const piper = devSpawn(sim, 0, 'aulos_piper', { p: 300 });
    const ally = devSpawn(sim, 0, 'bonker', { p: 360 });
    const out = devSpawn(sim, 0, 'bonker', { p: 700 });
    for (const u of [piper, ally, out]) stun(sim, u.id, 400);
    stepN(sim, 1);
    const u = unitById(sim, ally.id);
    if (!u) throw new Error('no unit');
    const base = ctx.rules.unitList[u.ci]?.speed ?? 0;
    expect(speedOf(sim, ally.id)).toBe(Math.trunc((base * 11500) / BP));
    expect(speedOf(sim, out.id)).toBe(base);
    expect(speedOf(sim, piper.id)).toBe(ctx.rules.units.aulos_piper?.speed);
    applyStatus(ctx, u, { kind: 'speedBuff', magnitudeBp: 1000, ticks: 40, amount: 0, frozen: false }, 0);
    expect(speedOf(sim, ally.id)).toBe(Math.trunc((base * 11500) / BP));
  });
});

describe('Wooden Horse: siegeOnly with riders (first-time combination)', () => {
  it('rams a blocker for its unit damage while both riders poke, then spills two units out when it falls', () => {
    const sim = lane();
    const horse = devSpawn(sim, 0, 'wooden_horse', { p: 700 });
    // A stunned enemy in its path blocks it: the head-ram hits it for 12 (siegeOnly while blocked) and
    // both riders poke it for 6 each on their own timer.
    const foe = devSpawn(sim, 1, 'pebbler', { p: L - 760 });
    stun(sim, foe.id, 200);
    const hits = ofKind(stepN(sim, 60), 'hit').filter((h) => h.sourceId === horse.id && h.targetId === foe.id);
    const riders = hits.filter((h) => h.dmgType === 'pierce');
    const ram = hits.filter((h) => h.dmgType === 'blast');
    expect(riders.length).toBeGreaterThanOrEqual(4);
    expect(riders.every((h) => h.damage === 600)).toBe(true);
    expect(ram.length).toBeGreaterThan(0);
    expect(ram.every((h) => h.damage === 1200)).toBe(true);
    const h = unitById(sim, horse.id);
    if (!h) throw new Error('no horse');
    h.hp = 0;
    const out = ofKind(stepN(sim, 3), 'unitSpawned').filter((e) => e.card === 'bonker' && e.side === 0);
    expect(out).toHaveLength(2);
  });

  it('at the enemy gate it rams the base for its base damage', () => {
    const sim = lane();
    const horse = devSpawn(sim, 0, 'wooden_horse', { p: L - 80 });
    const dmg = ofKind(stepN(sim, 200), 'baseDamaged').filter((e) => e.sourceId === horse.id);
    expect(dmg.length).toBeGreaterThan(0);
    expect(dmg.some((e) => e.damage === 14000)).toBe(true);
  });
});

describe('Minotaur: firstHitBonus with frenzy (first-time combination)', () => {
  it('the charge doubles the first hit; below half HP the frenzy adds its bonus on top, inside the caps', () => {
    const sim = lane();
    const ctx = simCtx(sim);
    const m = devSpawn(sim, 0, 'minotaur', { p: 900 });
    const foe = devSpawn(sim, 1, 'tuskback', { p: L - 925 });
    stun(sim, foe.id, 400);
    const hits = ofKind(stepN(sim, 80), 'hit').filter((h) => h.sourceId === m.id);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0]?.damage).toBeGreaterThan((hits[1]?.damage ?? 0) * 1.5);
    const u = unitById(sim, m.id);
    if (!u) throw new Error('no unit');
    u.hp = Math.trunc(u.maxHp / 3);
    expect(unitDamageBonusBp(ctx, u)).toBe(3000);
    expect(unitAttackSpeedBp(ctx, u)).toBe(2000);
  });
});

describe('Sandstorm: a whole-lane signal with a snare', () => {
  it('hits up to 8 enemies nearest the caster\'s gate for its pulse damage and snares them 30% for 3 s', () => {
    const sim = lane();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 1000);
    devSetPower(sim, 0, PPM, 'field');
    const ids: number[] = [];
    for (let i = 0; i < 10; i += 1) ids.push(devSpawn(sim, 1, 'bonker', { p: 200 + i * 150 }).id);
    for (const id of ids) stun(sim, id, 400);
    const ev = st.step({ t: 'power', side: 0, slot: 'field' });
    expect(ofKind(ev, 'commandRejected')).toHaveLength(0);
    const after = stepN(sim, 30);
    const hits = ofKind(after, 'hit').filter((h) => h.sourceKind === 'power');
    expect(new Set(hits.map((h) => h.targetId)).size).toBe(8);
    expect(hits.every((h) => h.damage === 1900)).toBe(true);
    const snared = ofKind(after, 'statusApplied').filter((e) => e.kind === 'snare');
    expect(new Set(snared.map((e) => e.id)).size).toBe(8);
    expect(snared.every((e) => e.ms === 3000)).toBe(true);
  });
});
