/**
 * A17.15: the Bronze, Industrial and Cosmic cards reuse existing ability kinds. Each first-time
 * combination of existing kinds gets one test here, on the live content (the frozen fixture has no
 * A17 cards), plus the underdog rule on formats that skip ages (A17.15 rule 4).
 */
import { describe, expect, it } from 'vitest';
import type { CompiledContent, FormatId, SimEvent } from '@/contracts';
import { content } from '@/content';
import { createSim } from '../createSim';
import { devPlaceTurret, devSetGold, devSetPower, devSetXp, devSpawn, simCtx, stepN, unitById } from '../debug';
import { agesOf, L, matchConfig, ofKind, pLu, sideConfig, Stamper, stun } from './helpers';

const real: CompiledContent = content;

/** A no-clock lane on the live content; side 0 sits in `age` with that age's power (alternate on request). */
function lane(o: { format?: FormatId; age?: string; altPower?: boolean } = {}) {
  const sides = [
    sideConfig(real, { plan: { altPower: o.altPower ?? false } }),
    sideConfig(real, { isBot: true, label: 'AI Test' }),
  ] as const;
  // Full War is 7 ages from Stone (A18.3.4); the Cosmic Age is in the window that starts in Bronze.
  const format = o.format ?? (o.age && !real.formats.full?.ages.includes(o.age as never) ? 'full.bronze' : 'full');
  const sim = createSim(matchConfig({ content: real, format, training: { noClock: true }, sides: [sides[0], sides[1]] }));
  if (o.age) {
    const fmt = real.formats[format];
    simCtx(sim).s.sides[0].ageIndex = fmt?.ages.indexOf(o.age as never) ?? 0;
  }
  return sim;
}

function foes(sim: ReturnType<typeof lane>, card: string, at: number[], ticks = 2000): number[] {
  return at.map((p) => {
    const u = devSpawn(sim, 1, card, { p: L - p });
    stun(sim, u.id, ticks);
    return u.id;
  });
}

/** Marks a unit as dying from an enemy unit hit this tick (so on-death effects and bounties run). */
function kill(sim: ReturnType<typeof lane>, id: number): void {
  const u = unitById(sim, id);
  if (!u) throw new Error(`no unit ${id}`);
  u.hp = 0;
  u.lastHitKind = 'unit';
  u.lastHitSide = u.side === 0 ? 1 : 0;
}

function cast(sim: ReturnType<typeof lane>, p?: number, slot: 'home' | 'field' = 'home'): SimEvent[] {
  devSetPower(sim, 0, 1000000);
  devSetGold(sim, 0, 1000);
  return [...new Stamper(sim).step(p === undefined ? { t: 'power', side: 0, slot } : { t: 'power', side: 0, slot, p })];
}

describe('A17 content runs on the sim', () => {
  it('the live content has 8 ages; Full War walks 7 of them and the Bronze window reaches Cosmic (A18.3.4)', () => {
    expect(agesOf(real)).toEqual(['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic']);
    const walk = (format: FormatId, evolves: number): ReturnType<typeof simCtx> => {
      const sim = lane({ format });
      for (let i = 0; i < evolves; i += 1) {
        devSetXp(sim, 0, 5000);
        const ev = [...new Stamper(sim).step({ t: 'evolve', side: 0 })];
        expect(ofKind(ev, 'ascendStart'), `${format} evolve ${i}`).toHaveLength(1);
        stepN(sim, 60);
      }
      devSetXp(sim, 0, 5000);
      expect(ofKind(new Stamper(sim).step({ t: 'evolve', side: 0 }), 'commandRejected')[0]?.reason).toBe('finalAge');
      return simCtx(sim);
    };
    const full = walk('full', 6);
    expect(full.s.sides[0].ageIndex).toBe(6);
    // Base max HP follows the Future age (A2.2: 33,200)
    expect(full.s.sides[0].baseMaxHp).toBe(3320000);
    const late = walk('full.bronze', 6);
    // Base max HP follows the Cosmic age (A17.8: 44,800)
    expect(late.s.sides[0].baseMaxHp).toBe(4480000);
  });
});

describe('A17.15 first-time combinations of existing kinds', () => {
  it('Gorgon Bust: a turret onHit stun (1.5 s) on an armored priority target', () => {
    const sim = lane({ age: 'bronze' });
    const [light] = foes(sim, 'hoplite', [200]);
    const [armored] = foes(sim, 'war_chariot', [300]);
    devPlaceTurret(sim, 0, 0, 'gorgon_bust');
    const ev = stepN(sim, 3);
    const hit = ofKind(ev, 'hit').find((h) => h.sourceCard === 'gorgon_bust');
    expect(hit?.targetId).toBe(armored);
    const st = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'stun' && s.id === armored);
    expect(st.map((s) => s.ms)).toEqual([1500]);
    expect(ofKind(ev, 'statusApplied').some((s) => s.id === light)).toBe(false);
  });

  it('Tesla Tower: the chain reaches 4 targets ≤ 90 lu apart and stuns every one of them 0.5 s', () => {
    const sim = lane({ age: 'industrial' });
    const ids = foes(sim, 'riveter', [200, 260, 320, 380, 440]);
    devPlaceTurret(sim, 0, 0, 'tesla_tower');
    const ev = stepN(sim, 3);
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceCard === 'tesla_tower');
    expect(hits.map((h) => h.targetId)).toEqual(ids.slice(0, 4));
    const stuns = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'stun');
    expect(stuns.map((s) => s.id).sort()).toEqual(ids.slice(0, 4).sort());
    expect(stuns.every((s) => s.ms === 500)).toBe(true);
  });

  it('Bronze Colossus: its melee splash slows every enemy hit 20% for 1.5 s; on death it bursts for 160 r70 on ground enemies', () => {
    const sim = lane({ age: 'bronze' });
    const ids = foes(sim, 'hoplite', [150, 160, 170]);
    const c = devSpawn(sim, 0, 'bronze_colossus', { p: 100 });
    const ev = stepN(sim, 60);
    const hit = ofKind(ev, 'hit').filter((h) => h.sourceId === c.id && h.sourceKind !== 'ability');
    expect(hit.length).toBeGreaterThanOrEqual(3);
    const slows = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'slow');
    expect([...new Set(slows.map((s) => s.id))].sort()).toEqual([...ids].sort());
    expect(slows.every((s) => s.ms === 1500)).toBe(true);
    expect(unitById(sim, ids[0] ?? -1)?.statuses.some((s) => s.kind === 'slow' && s.magnitudeBp === 2000)).toBe(true);

    const sim2 = lane({ age: 'bronze' });
    const near = foes(sim2, 'war_chariot', [640, 660]);
    const [air] = foes(sim2, 'gyrocopter', [650]);
    const col = devSpawn(sim2, 0, 'bronze_colossus', { p: 600 });
    stun(sim2, col.id, 100);
    kill(sim2, col.id);
    const burst = ofKind(stepN(sim2, 1), 'hit').filter((h) => h.sourceId === col.id && h.sourceKind === 'ability');
    expect(burst.map((h) => h.targetId).sort()).toEqual([...near].sort());
    expect(burst.some((h) => h.targetId === air)).toBe(false);
    // 160 blast, no area falloff (death explosions are exempt from the area rule)
    expect(burst.every((h) => h.damage === 16000)).toBe(true);
  });

  it('Harpoon Gunner: Reel In pulls the target 25 lu toward the ranged gunner on the first hit only', () => {
    const sim = lane({ age: 'industrial' });
    const [t] = foes(sim, 'steam_golem', [300]);
    devSpawn(sim, 0, 'harpoon_gunner', { p: 100 });
    const ev = stepN(sim, 120);
    const kbs = ofKind(ev, 'knockback').filter((k) => k.id === t);
    expect(kbs).toHaveLength(1);
    // Large units resist 50% of knockback and pulls (A2.7): 25 × 50%
    expect(kbs[0] && kbs[0].fromX - kbs[0].toX).toBe(12500);
    const [s2] = [lane({ age: 'industrial' })];
    const [small] = foes(s2, 'carbineer', [300]);
    devSpawn(s2, 0, 'harpoon_gunner', { p: 100 });
    const kb2 = ofKind(stepN(s2, 60), 'knockback').filter((k) => k.id === small);
    expect(kb2[0] && kb2[0].fromX - kb2[0].toX).toBe(25000);
  });

  it('Starwarden: a periodic shield aura on a followSupport unit, every 8 s while it has a target', () => {
    const sim = lane({ age: 'cosmic' });
    const allies = Array.from({ length: 6 }, (_, i) => devSpawn(sim, 0, 'star_legionnaire', { p: 60 + i * 10 }));
    for (const a of allies) stun(sim, a.id, 4000);
    const w = devSpawn(sim, 0, 'starwarden', { p: 40 });
    // Nothing to shoot at: no beacon
    expect(ofKind(stepN(sim, 40), 'abilityUsed').filter((a) => a.ability === 'periodicShieldAura')).toHaveLength(0);
    const [foe] = foes(sim, 'hover_tank', [180], 4000);
    const fu = unitById(sim, foe ?? -1);
    if (fu) fu.hp = fu.maxHp = 100000000;
    const ev = stepN(sim, 400);
    const beacons = ofKind(ev, 'abilityUsed').filter((a) => a.ability === 'periodicShieldAura' && a.id === w.id);
    expect(beacons.length).toBeGreaterThanOrEqual(2);
    expect((beacons[1]?.tick ?? 0) - (beacons[0]?.tick ?? 0)).toBe(160);
    const shields = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'shield' && s.tick === beacons[0]?.tick);
    expect(shields).toHaveLength(4);
    expect(shields.every((s) => s.ms === 5000)).toBe(true);
    expect(shields.some((s) => s.id === w.id)).toBe(false);
  });

  it('Mothership: an air gunship calls strikes searched from its own x and crashes for 350 r80 on ground enemies', () => {
    const sim = lane({ age: 'cosmic' });
    const [inReach] = foes(sim, 'hover_tank', [560]);
    const m = devSpawn(sim, 0, 'mothership', { p: 200 });
    const ev = stepN(sim, 60);
    const call = ofKind(ev, 'abilityUsed').find((a) => a.ability === 'callStrike' && a.id === m.id);
    expect(call).toBeDefined();
    const strike = ofKind(ev, 'hit').filter((h) => h.sourceId === m.id && h.sourceKind === 'ability');
    expect(strike[0]?.targetId).toBe(inReach);
    expect(strike[0]?.damage).toBe(30000);
    expect((strike[0]?.tick ?? 0) - (call?.tick ?? 0)).toBe(20);

    // Beyond 400 lu of the Mothership's x: no call-in
    const far = lane({ age: 'cosmic' });
    foes(far, 'hover_tank', [1100]);
    devSpawn(far, 0, 'mothership', { p: 200 });
    expect(ofKind(stepN(far, 60), 'abilityUsed').filter((a) => a.ability === 'callStrike')).toHaveLength(0);

    const crash = lane({ age: 'cosmic' });
    const ground = foes(crash, 'star_legionnaire', [560, 620]);
    const m3 = devSpawn(crash, 0, 'mothership', { p: 600 });
    kill(crash, m3.id);
    const boom = ofKind(stepN(crash, 1), 'hit').filter((h) => h.sourceId === m3.id && h.sourceKind === 'ability');
    expect(boom.map((h) => h.targetId).sort()).toEqual([...ground].sort());
    expect(boom.every((h) => h.damage === 35000)).toBe(true);
  });

  it('Sapper: siegeOnly walks past to the base; its Short Fuse burst hits ground enemies and never the base', () => {
    const sim = lane({ age: 'industrial' });
    const s = devSpawn(sim, 0, 'sapper', { p: L - 40 });
    const ev = stepN(sim, 60);
    const base = ofKind(ev, 'baseDamaged').filter((b) => b.side === 1);
    expect(base[0]?.damage).toBe(24000);
    const [near] = foes(sim, 'riveter', [L - 60]);
    const before = sim.state.sides[1].baseHp;
    kill(sim, s.id);
    const ev2 = stepN(sim, 1);
    const burst = ofKind(ev2, 'hit').filter((h) => h.sourceId === s.id && h.sourceKind === 'ability');
    expect(burst.map((h) => h.targetId)).toEqual([near]);
    expect(burst[0]?.damage).toBe(18000);
    expect(ofKind(ev2, 'baseDamaged')).toHaveLength(0);
    expect(sim.state.sides[1].baseHp).toBe(before);
  });

  it('Land Dreadnought: riders on a ranged Legendary; the crew bails out as 2 summoned Carbineers', () => {
    const sim = lane({ age: 'industrial' });
    foes(sim, 'riveter', [250]);
    const d = devSpawn(sim, 0, 'land_dreadnought', { p: 100 });
    const ev = stepN(sim, 40);
    const riders = ofKind(ev, 'attackStarted').filter((a) => a.id === d.id && a.attackIndex > 0);
    expect(riders.length).toBeGreaterThanOrEqual(4);
    kill(sim, d.id);
    const spawned = ofKind(stepN(sim, 1), 'unitSpawned');
    expect(spawned.map((u) => [u.card, u.summoned])).toEqual([
      ['carbineer', true],
      ['carbineer', true],
    ]);
    expect(sim.state.sides[0].pop).toBe(0);
  });

  it('Warp Stalker: the pounce search reaches 200 lu beyond the blocker (the Sabertooth only 150)', () => {
    const sim = lane({ age: 'cosmic' });
    const [blocker] = foes(sim, 'hover_tank', [200]);
    const [ranger] = foes(sim, 'ion_ranger', [380]);
    const w = devSpawn(sim, 0, 'warp_stalker', { p: 160 });
    const ev = stepN(sim, 40);
    const leap = ofKind(ev, 'abilityUsed').find((a) => a.ability === 'pounce' && a.id === w.id);
    expect(leap).toBeDefined();
    expect(pLu(sim, w.id)).toBeGreaterThan(300);
    const bite = ofKind(ev, 'hit').find((h) => h.sourceId === w.id && h.targetId === ranger);
    // First strike ×2 (pounce rule): 140 × 2
    expect(bite?.damage).toBe(28000);
    expect(blocker).toBeDefined();

    const sim2 = lane({ age: 'cosmic' });
    foes(sim2, 'hover_tank', [200]);
    foes(sim2, 'ion_ranger', [380]);
    const sab = devSpawn(sim2, 0, 'sabertooth', { p: 160 });
    expect(ofKind(stepN(sim2, 40), 'abilityUsed').filter((a) => a.ability === 'pounce' && a.id === sab.id)).toHaveLength(0);
  });

  it('Tidal Wave: a sweep that hits every ground enemy in its zone once and never air', () => {
    const sim = lane({ age: 'bronze' });
    const ground = foes(sim, 'hoplite', [420, 520, 640], 5000);
    const [air] = foes(sim, 'gyrocopter', [500], 5000);
    const ev = cast(sim, 500);
    ev.push(...stepN(sim, 70));
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power');
    expect(hits.map((h) => h.targetId).sort()).toEqual([...ground].sort());
    expect(hits.some((h) => h.targetId === air)).toBe(false);
    // A5.7: Tidal Wave now deals 170 (was 130; 150 before the fix pass)
    expect(hits.every((h) => h.damage === 17000)).toBe(true);
  });

  it('Warp Strike: a paradrop of a melee card; 4 summoned Star Legionnaires 150 lu beyond the enemy front', () => {
    const sim = lane({ age: 'cosmic', altPower: true });
    foes(sim, 'hover_tank', [700, 500], 5000);
    const ev = cast(sim, undefined, 'field');
    ev.push(...stepN(sim, 20));
    const drop = ofKind(ev, 'unitSpawned').filter((u) => u.card === 'star_legionnaire');
    // A5.7: 4 (was 3), a Field drop
    expect(drop).toHaveLength(4);
    expect(drop.every((u) => u.summoned && u.x === 650000)).toBe(true);
    expect(sim.state.sides[0].pop).toBe(0);
    const empty = lane({ age: 'cosmic', altPower: true });
    expect(ofKind(cast(empty, undefined, 'field'), 'powerTelegraph')[0]?.x).toBe(1000000);
  });
});

describe('A17.15 rule 4: the underdog bounty compares global age indices', () => {
  function killBounty(format: FormatId, ownAge: string, victim: string): number {
    const sim = lane({ format, age: ownAge });
    devSetXp(sim, 0, 0);
    const v = devSpawn(sim, 1, victim, { p: L - 300 });
    stun(sim, v.id, 100);
    kill(sim, v.id);
    const died = ofKind(stepN(sim, 1), 'died').find((d) => d.id === v.id);
    return died?.bountyGold ?? -1;
  }

  it('the tutorial skips Bronze: a Medieval side (position 1, index 2) killing a Medieval card gets no underdog bonus', () => {
    // 50% of the Footman's 50 gold = 25 (A18.3.3); the underdog bonus would make it 37.5.
    expect(killBounty('tutorial', 'medieval', 'footman')).toBe(25000);
    // A Gunpowder card (index 3) is a real underdog kill: +50%.
    expect(killBounty('tutorial', 'medieval', 'corsair')).toBe(37500);
    // The same in Full War, where position and index agree.
    expect(killBounty('full', 'medieval', 'footman')).toBe(25000);
    expect(killBounty('full', 'bronze', 'footman')).toBe(37500);
    // A window that starts in Bronze (A18.3.4): position 0 is index 1, so a Bronze side is no underdog
    // against a Bronze card, and a Medieval card still pays the bonus.
    expect(killBounty('short.bronze', 'bronze', 'phalangite')).toBe(Math.trunc((((real.units.phalangite?.cost ?? 0) * 1000) / 2)));
    expect(killBounty('short.bronze', 'bronze', 'footman')).toBe(37500);
  });
});
