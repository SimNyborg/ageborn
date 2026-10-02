/**
 * X0 content kinds (SIM_VERSION 7.0.0, CONTENT_PLAN 3): squads (M1), frenzy (M2), summoners (M3), the
 * Time Stop visual flag (M5) and the whole-lane reach (H7), on the frozen fixture plus the X0 cards
 * (`tests/fixtures/x0.ts`).
 */
import { describe, expect, it } from 'vitest';
import { BP, PPM } from '@/core';
import { unitAttackSpeedBp, unitDamageBonusBp } from '../damage';
import { devSetGold, devSetPower, devSpawn, simCtx, stepN, unitById } from '../debug';
import { createSim } from '../createSim';
import { L, Stamper, baselineLoadout, fixtureX0, matchConfig, ofKind, sideConfig, stun } from './helpers';

/** A lane on the X0 fixture (no clock), with Pebble Hail in each side's Stone Field slot. */
function lane() {
  const lo = baselineLoadout(fixtureX0, 'stone');
  const units = [...lo.units];
  units[5] = 'hunting_wolves';
  const loadout = { ...lo, units, powers: { home: lo.powers.home, field: 'pebble_hail' } };
  const side = (label: string) => sideConfig(fixtureX0, { label, loadouts: { stone: loadout } });
  return createSim(matchConfig({ content: fixtureX0, training: { noClock: true }, sides: [side('A'), side('B')] }));
}

describe('M1 squads', () => {
  it('one train command spawns every member at p 20 on the same tick; pop and cost split evenly', () => {
    const sim = lane();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 1000);
    const pop0 = sim.state.sides[0].pop;
    const rej = st.step({ t: 'train', side: 0, slot: 5 });
    expect(ofKind(rej, 'commandRejected')).toEqual([]);
    const spawned = ofKind(stepN(sim, 60), 'unitSpawned').filter((e) => e.card === 'hunting_wolves');
    expect(spawned).toHaveLength(2);
    expect(spawned[0]?.tick).toBe(spawned[1]?.tick);
    expect(spawned.every((e) => !e.summoned)).toBe(true);
    // Group pop 2 split over 2 members.
    expect(sim.state.sides[0].pop - pop0).toBe(2);
    expect(simCtx(sim).rules.units.hunting_wolves?.value).toBe(25);
  });

  it('a member pays half the bounty and frees its share of the pop when it dies', () => {
    const sim = lane();
    const w = devSpawn(sim, 0, 'hunting_wolves', { p: 900 });
    devSpawn(sim, 0, 'hunting_wolves', { p: 300 });
    const pop = sim.state.sides[0].pop;
    expect(pop).toBe(2);
    const killer = devSpawn(sim, 1, 'tuskback', { p: L - 920 });
    const gold0 = sim.state.sides[1].gold;
    const u = unitById(sim, w.id);
    if (u) u.hp = 1;
    const died = ofKind(stepN(sim, 60), 'died').find((d) => d.id === w.id);
    expect(died).toBeDefined();
    // The bounty rate on half the card's 50 gold (milli-gold).
    expect(died?.bountyGold).toBe(Math.trunc((25000 * simCtx(sim).econ.bountyGoldBp) / BP));
    expect(sim.state.sides[0].pop).toBe(1);
    expect(sim.state.sides[1].gold).toBeGreaterThan(gold0);
    void killer;
  });
});

describe('M2 frenzy', () => {
  it('below the HP line the unit gains its damage and attack speed bonus; a heal above the line removes it', () => {
    const sim = lane();
    const ctx = simCtx(sim);
    const r = devSpawn(sim, 0, 'pelt_rager', { p: 300 });
    const u = unitById(sim, r.id);
    if (!u) throw new Error('no unit');
    expect(unitDamageBonusBp(ctx, u)).toBe(0);
    expect(unitAttackSpeedBp(ctx, u)).toBe(0);
    u.hp = Math.trunc((u.maxHp * 5000) / BP);
    expect(unitDamageBonusBp(ctx, u)).toBe(3000);
    expect(unitAttackSpeedBp(ctx, u)).toBe(2000);
    u.hp = Math.trunc((u.maxHp * 5000) / BP) + 1;
    expect(unitDamageBonusBp(ctx, u)).toBe(0);
  });

  it('frenzy stays inside the A18.2 caps when it stacks with an aura', () => {
    const sim = lane();
    const ctx = simCtx(sim);
    const r = devSpawn(sim, 0, 'pelt_rager', { p: 300 });
    const u = unitById(sim, r.id);
    if (!u) throw new Error('no unit');
    u.hp = 1;
    u.auraDamageBp = 3000;
    expect(unitDamageBonusBp(ctx, u)).toBe(ctx.econ.caps.damageBp);
  });
});

describe('M3 summoners', () => {
  it('sends a summon after firstMs, then every everyMs while fewer than maxAlive live; no pop, no bounty', () => {
    const sim = lane();
    const c = devSpawn(sim, 0, 'beast_caller', { p: 200 });
    stun(sim, c.id, 0);
    const pop = sim.state.sides[0].pop;
    const ev = stepN(sim, 39);
    expect(ofKind(ev, 'unitSpawned').filter((e) => e.card === 'cave_pup')).toHaveLength(0);
    const first = ofKind(stepN(sim, 1), 'unitSpawned').filter((e) => e.card === 'cave_pup');
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ summoned: true, summoner: c.id });
    expect(sim.state.sides[0].pop).toBe(pop);
    // The second 8 s later, then none while two live.
    const later = ofKind(stepN(sim, 160 + 340), 'unitSpawned').filter((e) => e.card === 'cave_pup');
    expect(later).toHaveLength(1);
    expect(sim.state.units.filter((u) => u.card === 'cave_pup' && u.hp > 0)).toHaveLength(2);
  });

  it('replaces a dead summon on its next timer; stunned summoners wait; live summons stay when it dies', () => {
    const sim = lane();
    const c = devSpawn(sim, 0, 'beast_caller', { p: 200 });
    stepN(sim, 40);
    const pup = sim.state.units.find((u) => u.card === 'cave_pup');
    if (!pup) throw new Error('no pup');
    const pu = unitById(sim, pup.id);
    if (pu) pu.hp = 0;
    stun(sim, c.id, 400);
    const during = ofKind(stepN(sim, 300), 'unitSpawned').filter((e) => e.card === 'cave_pup');
    expect(during).toHaveLength(0);
    const after = ofKind(stepN(sim, 200), 'unitSpawned').filter((e) => e.card === 'cave_pup');
    expect(after.length).toBeGreaterThanOrEqual(1);
    const cu = unitById(sim, c.id);
    if (cu) cu.hp = 0;
    stepN(sim, 2);
    expect(sim.state.units.some((u) => u.card === 'cave_pup' && u.hp > 0)).toBe(true);
  });

  it('summons march on Hold and rank last in power caps (the levy rules)', () => {
    const sim = lane();
    const rules = simCtx(sim).rules.units.cave_pup;
    expect(rules?.levy).toBe(true);
    expect(rules?.value).toBe(0);
  });
});

describe('M5 Time Stop flag', () => {
  it('a roar stun is not drawn as frozen time; the Chrono Titan keeps its clock', () => {
    const sim = lane();
    devSpawn(sim, 0, 'cave_bear', { p: 900 });
    const foe = devSpawn(sim, 1, 'bonker', { p: L - 1000 });
    stepN(sim, 5);
    const st = unitById(sim, foe.id)?.statuses.find((s) => s.kind === 'stun');
    expect(st).toBeDefined();
    expect(st?.frozen).toBe(false);
    expect(simCtx(sim).rules.units.chrono_titan?.timeStop?.frozen).toBe(true);
  });
});

describe('H7 whole-lane reach', () => {
  it('needs no aim and hits up to 8 hittable enemies nearest the caster\'s gate, anywhere, air included', () => {
    const sim = lane();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 1000);
    devSetPower(sim, 0, PPM, 'field');
    const ids: number[] = [];
    for (let i = 0; i < 10; i += 1) ids.push(devSpawn(sim, 1, 'bonker', { p: 200 + i * 150 }).id);
    for (const id of ids) stun(sim, id, 200);
    const ev = st.step({ t: 'power', side: 0, slot: 'field' });
    expect(ofKind(ev, 'powerTelegraph')).toHaveLength(1);
    expect(ofKind(ev, 'commandRejected')).toHaveLength(0);
    const hits = ofKind(stepN(sim, 30), 'hit').filter((h) => h.sourceKind === 'power');
    const hitIds = new Set(hits.map((h) => h.targetId));
    expect(hitIds.size).toBe(8);
    // The screen: the 8 nearest the caster's gate; the two still deep in side 1's half (own p 200 and 350) are spared.
    expect(hitIds.has(ids[0] as number)).toBe(false);
    expect(hitIds.has(ids[1] as number)).toBe(false);
    expect(hits.every((h) => h.damage === 4000)).toBe(true);
  });

  it('is refused with no enemy on the lane, before payment', () => {
    const sim = lane();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 1000);
    devSetPower(sim, 0, PPM, 'field');
    const ev = st.step({ t: 'power', side: 0, slot: 'field' });
    expect(ofKind(ev, 'commandRejected').map((e) => e.reason)).toEqual(['powerNoTarget']);
    expect(sim.state.sides[0].gold).toBeGreaterThanOrEqual(1000000);
  });
});
