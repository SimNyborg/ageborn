/**
 * A18 rules (DESIGN A18.2-A18.5, A18.11; SIM_VERSION 3.0.0): the War Council, stacking caps, Mail,
 * engagement freshness, three stances and the Hold flag, side modifiers, victory rules, six tray slots,
 * formats as age windows, the A18.3.2 XP sources, and the age-index shift. Rule tests run on the frozen
 * fixture (which carries a frozen copy of the War Council); the pacing numbers on the live content.
 */
import { describe, expect, it } from 'vitest';
import type { AgeDef, AgeId, CompiledContent, MatchConfig, SimEvent, SideConfig } from '@/contracts';
import { content as live } from '@/content';
import { createSim } from '../createSim';
import { capSum, unitDamageBonusBp } from '../damage';
import { devGrantResearch, devPlaceTurret, devSetBaseBp, devSetGold, devSetXp, devSpawn, simCtx, stepN, unitById } from '../debug';
import { emptyUnitFx } from '../researchRules';
import { turretRange } from '../systems/targeting';
import { arena, fixture, L, matchConfig, ofKind, pLu, sideConfig, Stamper, stun } from './helpers';

const R = (pick: 0 | 1, rank: 1 | 2 | 3 = 1) => ({ t: 'research' as const, side: 0 as const, track: 'economy' as const, rank, pick });

/** Steps until `id` lands a hit and returns its damage (centi), or −1. */
function nextHit(sim: ReturnType<typeof arena>, id: number, max = 200): number {
  for (let i = 0; i < max; i += 1) {
    const hit = ofKind(sim.step([]), 'hit').find((h) => h.sourceId === id);
    if (hit) return hit.damage;
  }
  return -1;
}

describe('War Council: the research slot (A18.5.1)', () => {
  it('pays at the start, runs 10 s for rank I, completes with researchDone and grows the economy level', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const ev = st.step(R(0));
    expect(ofKind(ev, 'researchStarted')).toEqual([{ e: 'researchStarted', side: 0, pick: 'economy.granary', cost: 150000, endTick: 201, tick: 1 }]);
    // paid at the start; the tick's passive income (6 gold/s) lands after the command
    expect(sim.state.sides[0].gold).toBe(175000 - 150000 + 300);
    expect(sim.observe(1).foe.research.current).toBe('economy.granary');
    stepN(sim, 199);
    expect(sim.state.sides[0].research.owned).toEqual([]);
    const done = stepN(sim, 1);
    expect(ofKind(done, 'researchDone')).toEqual([{ e: 'researchDone', side: 0, pick: 'economy.granary', tick: 201 }]);
    expect(ofKind(done, 'treasuryUp')[0]?.level).toBe(1);
    expect(sim.observe(0).me.research).toEqual({ owned: ['economy.granary'], current: null, progressBp: 0, ranksOpen: 1 });
  });

  it('one slot: a second item waits; the pair partner and a missing rank below are rejected', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 5000);
    expect(ofKind(st.step(R(0), R(1)), 'commandRejected').map((r) => r.reason)).toEqual(['researchBusy']);
    stepN(sim, 200);
    const again = st.step(R(1), R(0));
    expect(ofKind(again, 'commandRejected').map((r) => r.reason)).toEqual(['otherPickOwned', 'researchOwned']);
    // Troops rank II needs rank I of the same class line
    const rank2 = st.step({ t: 'research', side: 0, track: 'troops', group: 'heavy', rank: 2, pick: 0 });
    expect(ofKind(rank2, 'commandRejected')[0]?.reason).toBe('rankLocked');
    const bad = st.step({ t: 'research', side: 0, track: 'troops', group: 'heavy', rank: 3, pick: 0 });
    expect(ofKind(bad, 'commandRejected')[0]?.reason).toBe('badCommand');
  });

  it('ranks open with the window position (A18.5.1: 5-age window rank II at the 2nd age)', () => {
    const sim = arena({ format: 'full' });
    const st = new Stamper(sim);
    devSetGold(sim, 0, 5000);
    st.step(R(0));
    stepN(sim, 200);
    expect(sim.observe(0).me.research.ranksOpen).toBe(1);
    expect(ofKind(st.step(R(0, 2)), 'commandRejected')[0]?.reason).toBe('rankLocked');
    simCtx(sim).s.sides[0].ageIndex = 1;
    expect(sim.observe(0).me.research.ranksOpen).toBe(2);
    expect(ofKind(st.step(R(0, 2)), 'researchStarted')[0]?.cost).toBe(300000);
  });

  it('cancel refunds 75%; research continues through Ascension', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 1000);
    st.step(R(0));
    const c = st.step({ t: 'researchCancel', side: 0 });
    expect(ofKind(c, 'researchCancelled')[0]?.refund).toBe(112500);
    expect(sim.state.sides[0].gold).toBe(1000000 - 150000 + 112500 + 600);
    expect(ofKind(st.step({ t: 'researchCancel', side: 0 }), 'commandRejected')[0]?.reason).toBe('nothingToCancel');
    st.step(R(0));
    devSetXp(sim, 0, 5000);
    st.step({ t: 'evolve', side: 0 });
    const ev = stepN(sim, 200);
    expect(ofKind(ev, 'ageUp')).toHaveLength(1);
    expect(ofKind(ev, 'researchDone')).toHaveLength(1);
  });

  it('underdog discount −20%: behind in age position, or 20+ points of base HP lower', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 5000);
    simCtx(sim).s.sides[1].ageIndex = 1;
    expect(ofKind(st.step(R(0)), 'researchStarted')[0]?.cost).toBe(120000);
    st.step({ t: 'researchCancel', side: 0 });
    simCtx(sim).s.sides[1].ageIndex = 0;
    devSetBaseBp(sim, 0, 8000);
    expect(ofKind(st.step(R(0)), 'researchStarted')[0]?.cost).toBe(120000);
    st.step({ t: 'researchCancel', side: 0 });
    devSetBaseBp(sim, 0, 8100);
    expect(ofKind(st.step(R(0)), 'researchStarted')[0]?.cost).toBe(150000);
  });

  it('is never retroactive: units already on the lane keep their stats (A18.2 rule 2)', () => {
    const sim = arena();
    const before = devSpawn(sim, 0, 'bonker', { p: 400 });
    devGrantResearch(sim, 0, 'troops.infantry.weapons');
    const after = devSpawn(sim, 0, 'bonker', { p: 400 });
    const other = devSpawn(sim, 0, 'pebbler', { p: 20 });
    const ctx = simCtx(sim);
    expect(unitDamageBonusBp(ctx, unitById(sim, before.id)!)).toBe(0);
    expect(unitDamageBonusBp(ctx, unitById(sim, after.id)!)).toBe(1000);
    // another class line is not touched
    expect(unitById(sim, other.id)?.fx).toBeNull();
    // and it shows in the hit: a stunned target takes 10% more from the later Bonker
    const t1 = devSpawn(sim, 1, 'drum_shaman', { p: L - 430 });
    stun(sim, t1.id, 400);
    unitById(sim, before.id)!.lastEngagedTick = sim.state.tick;
    unitById(sim, after.id)!.lastEngagedTick = sim.state.tick;
    const hits: SimEvent[] = [];
    for (let i = 0; i < 60; i += 1) hits.push(...ofKind(sim.step([]), 'hit'));
    const dmg = (id: number): number | undefined => (hits.find((h) => h.e === 'hit' && h.sourceId === id) as { damage: number } | undefined)?.damage;
    expect(dmg(after.id)).toBe(Math.trunc(((dmg(before.id) ?? 0) * 11000) / 10000));
  });
});

describe('War Council: Economy, Defences, Command (A18.5.3-A18.5.5)', () => {
  it('Granary and Market add income that Overdrive never doubles', () => {
    const sim = arena();
    devGrantResearch(sim, 0, 'economy.granary');
    devGrantResearch(sim, 0, 'economy.market');
    const g = sim.state.sides[0].gold;
    stepN(sim, 20);
    expect(sim.state.sides[0].gold - g).toBe(6000 + 1500 + 2000);
  });

  it('Bounty Hunters: +15 points of bounty; Forage: +40% for kills in the own half', () => {
    const bountyOf = (pick: string | null, p: number): number => {
      const sim = arena();
      if (pick) devGrantResearch(sim, 0, pick);
      const v = devSpawn(sim, 1, 'pebbler', { p: L - p });
      const u = unitById(sim, v.id)!;
      u.hp = 0;
      u.lastHitKind = 'unit';
      u.lastHitSide = 0;
      return ofKind(stepN(sim, 1), 'died')[0]?.bountyGold ?? -1;
    };
    // the frozen fixture pays 60% (A18: 50%); pebbler 75 gold
    expect(bountyOf(null, 600)).toBe(45000);
    expect(bountyOf('economy.bounty_hunters', 600)).toBe(56250);
    expect(bountyOf('economy.forage', 600)).toBe(63000);
    expect(bountyOf('economy.forage', 1200)).toBe(45000);
  });

  it('Watchtowers +40 lu, capped at 560 lu; Quick Loaders and Arsenal apply to turrets at once', () => {
    const sim = arena();
    devPlaceTurret(sim, 0, 0, 'rock_tosser');
    const ctx = simCtx(sim);
    const a = ctx.rules.turrets.rock_tosser!.attack;
    expect(turretRange(ctx, 0, a)).toBe(360000);
    devGrantResearch(sim, 0, 'defences.watchtowers');
    expect(turretRange(ctx, 0, a)).toBe(400000);
    ctx.s.sides[0].fx.turretRange = 300000;
    expect(turretRange(ctx, 0, a)).toBe(560000);
    // Quick Loaders: 1.5 s → round(30 / 1.15) = 26 ticks between shots
    const q = arena();
    devPlaceTurret(q, 0, 0, 'rock_tosser');
    devGrantResearch(q, 0, 'defences.quick_loaders');
    devGrantResearch(q, 0, 'defences.arsenal');
    const foe = devSpawn(q, 1, 'tuskback', { p: L - 200 });
    stun(q, foe.id, 400);
    const shots = ofKind(stepN(q, 80), 'turretFired').map((e) => e.tick);
    expect(shots[1]! - shots[0]!).toBe(26);
  });

  it('Engineers: Modernise costs half and builds in 0.5 s', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devPlaceTurret(sim, 0, 0, 'rock_tosser');
    devGrantResearch(sim, 0, 'defences.engineers');
    simCtx(sim).s.sides[0].ageIndex = 1;
    devSetGold(sim, 0, 1000);
    const g = sim.state.sides[0].gold;
    st.step({ t: 'replaceTurret', side: 0, mount: 0, slot: 0 });
    const card = sim.state.sides[0].turrets[0]!.card;
    const newCost = simCtx(sim).rules.turrets[card]!.cost * 1000;
    expect(g + 300 - sim.state.sides[0].gold).toBe(Math.trunc((newCost - 75000) / 2));
    expect(sim.state.sides[0].turrets[0]!.readyTick - sim.state.tick).toBe(10);
  });

  it('Signal Fires: the side’s powers reload 15% faster (rate bonuses add, the remainder is carried)', () => {
    const sim = arena();
    devGrantResearch(sim, 0, 'command.signal_fires');
    stepN(sim, 20);
    // Rockslide and Stampede reload in 40 s (800 ticks) from 25%: 1,250 ppm a tick, × 1.15 = 1,437.5
    expect(sim.state.sides[0].powerPpm).toEqual([250000 + 28750, 250000 + 28750]);
    expect(sim.state.sides[1].powerPpm).toEqual([250000 + 25000, 250000 + 25000]);
    expect(sim.observe(0).me.powers.home?.reloadMs).toBe(34782);
  });

  it('War Horns: +8% speed while Charging for units spawned after it', () => {
    const sim = arena();
    devGrantResearch(sim, 0, 'command.war_horns');
    const u = devSpawn(sim, 0, 'bonker', { p: 100 });
    stepN(sim, 1);
    // 4,375 mlu per tick × 1.08
    expect(pLu(sim, u.id)).toBeCloseTo(100 + 4.725, 5);
  });
});

describe('Troops picks and the A18.2 stacking caps', () => {
  it('caps: damage +35%, max HP +30% (a stronger timed buff keeps its own value)', () => {
    expect(capSum(5000, 0, 3500)).toBe(3500);
    expect(capSum(1000, 3000, 3500)).toBe(3500);
    expect(capSum(0, 4000, 3500)).toBe(4000);
    expect(capSum(-800, 2000, 2500)).toBe(1200);
    const sides = [sideConfig(fixture), { ...sideConfig(fixture, { isBot: true, label: 'AI' }), sideMods: { unitHpBp: 5000, unitDamageBp: 5000 } }] as [SideConfig, SideConfig];
    const sim = createSim(matchConfig({ training: { noClock: true }, sides }));
    const u = devSpawn(sim, 1, 'bonker');
    expect(u.maxHp).toBe(Math.trunc((16000 * 13000) / 10000));
    expect(unitDamageBonusBp(simCtx(sim), unitById(sim, u.id)!)).toBe(3500);
  });

  it('Mail: a flat cut per hit, never past the −35% damage-taken floor', () => {
    const hitOn = (mail: boolean, attacker: string): number => {
      const sim = arena();
      if (mail) devGrantResearch(sim, 1, 'troops.infantry.mail');
      const t = devSpawn(sim, 1, 'bonker', { p: L - 520 });
      stun(sim, t.id, 400);
      const a = devSpawn(sim, 0, attacker, { p: 500 });
      unitById(sim, a.id)!.lastEngagedTick = 0;
      stepN(sim, 1);
      unitById(sim, a.id)!.lastEngagedTick = sim.state.tick;
      return nextHit(sim, a.id);
    };
    // N = 25% of the Stone Infantry Common's 20 damage = 5 HP (500 centi)
    const big = hitOn(false, 'tuskback');
    expect(hitOn(true, 'tuskback')).toBe(big - 500);
    const small = hitOn(false, 'bonker');
    expect(hitOn(true, 'bonker')).toBe(Math.max(small - 500, Math.trunc((small * 6500) / 10000)));
  });

  it('Field Care: heals and shields +20% (A18.5.2), also on a shield aura', () => {
    const shieldOf = (care: boolean): number => {
      const sim = arena();
      const foe = devSpawn(sim, 1, 'tuskback', { p: L - 200 });
      stun(sim, foe.id, 2000);
      const fu = unitById(sim, foe.id);
      if (fu) fu.hp = fu.maxHp = 100000000;
      const ursa = devSpawn(sim, 0, 'ursa_paladin', { p: 140 });
      // The fixture's shield aura sits on a Heavy; give it the Support pick's effect directly.
      const u = unitById(sim, ursa.id)!;
      if (care) u.fx = { ...emptyUnitFx(), healBp: 2000 };
      const ally = devSpawn(sim, 0, 'bonker', { p: 100 });
      stun(sim, ally.id, 2000);
      for (let i = 0; i < 300; i += 1) {
        if (ofKind(sim.step([]), 'abilityUsed').some((a) => a.ability === 'periodicShieldAura')) break;
      }
      return unitById(sim, ally.id)!.shield;
    };
    const plain = shieldOf(false);
    expect(plain).toBeGreaterThan(0);
    expect(shieldOf(true)).toBe(Math.trunc((plain * 12000) / 10000));
  });

  it('Plating: −15% damage taken from Infantry only', () => {
    const hitOn = (plating: boolean, attacker: string): number => {
      const sim = arena();
      if (plating) devGrantResearch(sim, 1, 'troops.heavy.plating');
      const t = devSpawn(sim, 1, 'tuskback', { p: L - 520 });
      stun(sim, t.id, 400);
      const a = devSpawn(sim, 0, attacker, { p: attacker === 'pebbler' ? 400 : 500 });
      stepN(sim, 1);
      unitById(sim, a.id)!.lastEngagedTick = sim.state.tick;
      return nextHit(sim, a.id);
    };
    expect(hitOn(true, 'bonker')).toBe(Math.trunc((hitOn(false, 'bonker') * 8500) / 10000));
    expect(hitOn(true, 'pebbler')).toBe(hitOn(false, 'pebbler'));
  });
});

describe('engagement freshness (A18.4.2)', () => {
  it('the first hit after 4 s (fixture: 2 s) with no target is the engagement’s first hit; stance changes never reset it', () => {
    const sim = arena();
    const st = new Stamper(sim);
    // Tuskback's charge (A5.2): ×2 and a knockback on the first hit of an engagement
    const a = devSpawn(sim, 0, 'tuskback', { p: 500 });
    const t = devSpawn(sim, 1, 'tuskback', { p: L - 530 });
    stun(sim, t.id, 2000);
    const first = nextHit(sim, a.id);
    const second = nextHit(sim, a.id);
    expect(first).toBe(second * 2);
    st.step({ t: 'stance', side: 0, mode: 'hold', holdP: 500 });
    stepN(sim, 45);
    st.step({ t: 'stance', side: 0, mode: 'charge' });
    expect(nextHit(sim, a.id)).toBe(second);
    // no target for longer than the window: fresh again
    unitById(sim, t.id)!.hp = 0;
    stepN(sim, 60);
    const t2 = devSpawn(sim, 1, 'tuskback', { p: L - pLu(sim, a.id) - 20 });
    stun(sim, t2.id, 2000);
    expect(nextHit(sim, a.id)).toBe(first);
  });

  it('Ambush: +40% on the engagement’s first hit, only while Holding', () => {
    const firstHit = (hold: boolean): number => {
      const sim = arena();
      devGrantResearch(sim, 0, 'troops.antiArmor.hunters');
      devGrantResearch(sim, 0, 'troops.antiArmor.ambush');
      if (hold) new Stamper(sim).step({ t: 'stance', side: 0, mode: 'hold', holdP: 500 });
      const a = devSpawn(sim, 0, 'spear_hunter', { p: 500 });
      const t = devSpawn(sim, 1, 'bonker', { p: L - 560 });
      stun(sim, t.id, 400);
      return nextHit(sim, a.id);
    };
    expect(firstHit(true)).toBe(Math.trunc((firstHit(false) * 14000) / 10000));
  });
});

describe('three stances and the Hold flag (A18.4.2)', () => {
  it('the flag is clamped to [320, 800] and snapped to 20 lu; a move is accepted once per 1 s', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const ev = st.step({ t: 'stance', side: 0, mode: 'hold', holdP: 1000 });
    expect(ofKind(ev, 'stanceChanged')[0]).toMatchObject({ stance: 'hold', holdP: 800 });
    expect(ofKind(st.step({ t: 'stance', side: 0, mode: 'hold', holdP: 333 }), 'commandRejected')[0]?.reason).toBe('flagCooldown');
    stepN(sim, 20);
    expect(ofKind(st.step({ t: 'stance', side: 0, mode: 'hold', holdP: 333 }), 'stanceChanged')[0]?.holdP).toBe(340);
    stepN(sim, 20);
    expect(ofKind(st.step({ t: 'stance', side: 0, mode: 'hold', holdP: 10 }), 'stanceChanged')[0]?.holdP).toBe(320);
    expect(ofKind(st.step({ t: 'stance', side: 0, mode: 'hold' }), 'commandRejected')[0]?.reason).toBe('sameStance');
    expect(sim.observe(1).foe.holdP).toBe(320);
  });

  it('Hold keeps units at the flag; Fall back walks units with no target to p = 200 at full speed', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const far = devSpawn(sim, 0, 'bonker', { p: 700 });
    const near = devSpawn(sim, 0, 'bonker', { p: 300 });
    st.step({ t: 'stance', side: 0, mode: 'hold', holdP: 500 });
    stepN(sim, 200);
    expect(pLu(sim, far.id)).toBe(500);
    expect(pLu(sim, near.id)).toBe(500);
    stepN(sim, 40);
    st.step({ t: 'stance', side: 0, mode: 'fallback' });
    // full speed back: 4.375 lu per tick
    expect(pLu(sim, far.id)).toBeCloseTo(495.625, 5);
    stepN(sim, 200);
    expect(pLu(sim, far.id)).toBe(200);
    const fresh = devSpawn(sim, 0, 'bonker', { p: 20 });
    stepN(sim, 100);
    expect(pLu(sim, fresh.id)).toBe(200);
  });

  it('engaged units keep fighting under Fall back', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const a = devSpawn(sim, 0, 'bonker', { p: 500 });
    const t = devSpawn(sim, 1, 'tuskback', { p: L - 520 });
    stun(sim, t.id, 400);
    stepN(sim, 5);
    st.step({ t: 'stance', side: 0, mode: 'fallback' });
    stepN(sim, 40);
    expect(pLu(sim, a.id)).toBe(500);
  });
});

describe('side modifiers (A18.11) and victory rules (A18.7.3)', () => {
  function boss(mods: SideConfig['sideMods'], extra: Partial<MatchConfig> = {}) {
    const sides = [sideConfig(fixture), { ...sideConfig(fixture, { isBot: true, label: 'AI Boss' }), sideMods: mods }] as [SideConfig, SideConfig];
    return createSim(matchConfig({ training: { noClock: true }, sides, ...extra }));
  }

  it('a boss base: +50% base HP (kept across an evolve) and an extra fixed turret on a fifth mount', () => {
    const sim = boss({ baseHpBp: 5000, extraTurret: 'rock_tosser' });
    expect(sim.state.sides[1].baseMaxHp).toBe(1500000);
    expect(sim.state.sides[0].baseMaxHp).toBe(1000000);
    expect(sim.state.sides[1].turrets).toHaveLength(5);
    expect(sim.state.sides[1].turrets[4]).toMatchObject({ card: 'rock_tosser', state: 'active' });
    const st = new Stamper(sim);
    expect(ofKind(st.step({ t: 'sellTurret', side: 1, mount: 4 as 0 }), 'commandRejected')[0]?.reason).toBe('badCommand');
    devSetXp(sim, 1, 5000);
    st.step({ t: 'evolve', side: 1 });
    stepN(sim, 60);
    expect(sim.state.sides[1].baseMaxHp).toBe(Math.trunc((1350000 * 15000) / 10000));
    // the fixed turret fires
    const u = devSpawn(sim, 0, 'tuskback', { p: L - 200 });
    stun(sim, u.id, 400);
    expect(ofKind(stepN(sim, 40), 'turretFired').some((e) => e.side === 1 && e.mount === 4)).toBe(true);
  });

  it('Hold out: the side whose base stands at the set time wins', () => {
    const sim = createSim(matchConfig({ training: { noClock: true }, victory: { kind: 'survive', atMs: 2000 } }));
    stepN(sim, 39);
    expect(sim.state.outcome).toBeNull();
    stepN(sim, 1);
    expect(sim.state.outcome).toMatchObject({ winner: 0, reason: 'objective', tick: 40 });
  });

  it('Take the tower: hits aimed at the base also hit the marked turret; it cannot be sold', () => {
    const sim = createSim(matchConfig({ training: { noClock: true }, victory: { kind: 'target', mount: 0, hp: 200 } }));
    devPlaceTurret(sim, 1, 0, 'rock_tosser');
    const st = new Stamper(sim);
    expect(ofKind(st.step({ t: 'sellTurret', side: 1, mount: 0 }), 'commandRejected')[0]?.reason).toBe('mountLocked');
    const a = devSpawn(sim, 0, 'tuskback', { p: L - 30 });
    unitById(sim, a.id)!.lastEngagedTick = sim.state.tick;
    for (let i = 0; i < 400 && !sim.state.outcome; i += 1) sim.step([]);
    expect(sim.state.outcome).toMatchObject({ winner: 0, reason: 'objective' });
    expect(sim.state.sides[1].baseHp).toBeGreaterThan(0);
  });
});

describe('seven troops and age windows (A18.9, A18.3.4)', () => {
  it('trains from tray slots 6 and 7; slot 8 is a bad command', () => {
    const sc = sideConfig(fixture);
    const stone = sc.loadouts.stone!;
    const sim = createSim(
      matchConfig({ training: { noClock: true }, sides: [{ ...sc, loadouts: { ...sc.loadouts, stone: { ...stone, units: [...stone.units.slice(0, 5), 'sabertooth', 'mammoth_matriarch'] } } }, sideConfig(fixture, { isBot: true, label: 'AI' })] }),
    );
    const st = new Stamper(sim);
    devSetGold(sim, 0, 1000);
    expect(ofKind(st.step({ t: 'train', side: 0, slot: 5 }), 'queueChanged')).toHaveLength(1);
    expect(sim.state.sides[0].queue[0]?.card).toBe('sabertooth');
    expect(ofKind(st.step({ t: 'train', side: 0, slot: 6 }), 'queueChanged')).toHaveLength(1);
    expect(sim.state.sides[0].queue[1]?.card).toBe('mammoth_matriarch');
    expect(ofKind(st.step({ t: 'train', side: 0, slot: 7 as 6 }), 'commandRejected')[0]?.reason).toBe('badCommand');
    expect(sim.observe(0).me.tray).toHaveLength(7);
  });

  it('live formats are windows: Short 3, Standard 5, Full 7 ages with the A18.3.4 clocks; thresholds follow the position', () => {
    expect(live.formats.short).toMatchObject({ ages: ['stone', 'bronze', 'medieval'], overdriveMs: 300000, siegeMs: 390000, finalBellMs: 510000 });
    expect(live.formats.standard?.ages).toHaveLength(5);
    expect(live.formats.standard).toMatchObject({ overdriveMs: 480000, siegeMs: 600000, finalBellMs: 750000 });
    expect(live.formats.full?.ages).toEqual(['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future']);
    expect(live.formats.full).toMatchObject({ overdriveMs: 720000, siegeMs: 870000, finalBellMs: 1050000 });
    expect(live.formats['w1.stone']).toMatchObject({ overdriveMs: 210000, siegeMs: 270000, finalBellMs: 360000 });
    expect(live.formats['w2.medieval']).toMatchObject({ ages: ['medieval', 'gunpowder'], overdriveMs: 255000, siegeMs: 330000, finalBellMs: 435000 });
    expect(live.formats['w4.bronze']).toMatchObject({ overdriveMs: 390000, siegeMs: 495000, finalBellMs: 630000 });
    expect(live.formats.tutorial?.xpToNextOverride).toEqual([610, 580, 390, 900]);
    // the same threshold leaves the first age of any window, whatever the age (A18.3.2; the numbers
    // are tuned by the pacing run, docs/decisions.md)
    const first = live.formats.short?.xpToNextOverride?.[0] ?? 0;
    expect(first).toBeGreaterThan(0);
    expect(live.formats['short.gunpowder']?.xpToNextOverride).toEqual(live.formats.short?.xpToNextOverride);
    expect(live.formats.full?.xpToNextOverride?.slice(0, 2)).toEqual(live.formats.short?.xpToNextOverride);
    const a = createSim(matchConfig({ content: live, format: 'short.gunpowder', sides: [sideConfig(live), sideConfig(live, { isBot: true })] }));
    const b = createSim(matchConfig({ content: live, format: 'short', sides: [sideConfig(live), sideConfig(live, { isBot: true })] }));
    const threshold = (s: ReturnType<typeof createSim>): number => {
      devSetXp(s, 0, first - 1);
      const before = s.observe(0).me.xpBp;
      devSetXp(s, 0, first);
      return before < 10000 && s.observe(0).me.xpBp === 10000 ? first : -1;
    };
    expect(threshold(a)).toBe(first);
    expect(threshold(b)).toBe(first);
    // a window that starts later starts its base at that age's P and HP
    expect(a.state.sides[0].baseMaxHp).toBe(live.ages.gunpowder.baseHp * 100);
    expect(a.observe(0).ages).toEqual(['gunpowder', 'industrial', 'modern']);
  });

  it('A18.3.2 XP on the live content: 5 XP/s passive, kill 70%, loss 50%, 8 XP per 1% of base damage', () => {
    const sides = [sideConfig(live), sideConfig(live, { isBot: true })] as [SideConfig, SideConfig];
    const sim = createSim(matchConfig({ content: live, format: 'short', training: { noClock: true }, sides }));
    stepN(sim, 20);
    expect(sim.state.sides[0].xp).toBe(5000);
    const v = devSpawn(sim, 1, 'bonker', { p: 1000 });
    const u = unitById(sim, v.id)!;
    u.hp = 0;
    u.lastHitKind = 'unit';
    u.lastHitSide = 0;
    const died = ofKind(stepN(sim, 1), 'died')[0];
    const cost = live.units.bonker!.cost * 1000;
    expect(died?.bountyXp).toBe(Math.trunc((cost * 7000) / 10000));
    expect(died?.bountyGold).toBe(Math.trunc((cost * 5000) / 10000));
    expect(sim.state.sides[1].xp).toBe(5000 + 250 + Math.trunc((cost * 5000) / 10000));
    expect(live.economy.baseDamageXpPerPct).toBe(8);
  });
});

describe('age-index shift (A18.8.3): inserting an age keeps the global-index rules right', () => {
  /** The live content with a gap after every age, as if new ages were inserted between them. */
  function shifted(): CompiledContent {
    const ages = {} as Record<AgeId, AgeDef>;
    for (const [id, a] of Object.entries(live.ages) as [AgeId, AgeDef][]) ages[id] = { ...a, index: a.index * 2 };
    return { ...live, ages, hash: `${live.hash}-shifted` };
  }

  it('underdog bounties and Modernise compare AgeDef.index, never the window position', () => {
    for (const c of [live, shifted()]) {
      const sides = [sideConfig(c), sideConfig(c, { isBot: true })] as [SideConfig, SideConfig];
      const bounty = (victim: string): number => {
        const sim = createSim(matchConfig({ content: c, format: 'short.bronze', training: { noClock: true }, sides }));
        const v = devSpawn(sim, 1, victim, { p: L - 300 });
        const u = unitById(sim, v.id)!;
        u.hp = 0;
        u.lastHitKind = 'unit';
        u.lastHitSide = 0;
        return ofKind(stepN(sim, 1), 'died')[0]?.bountyGold ?? -1;
      };
      expect(bounty('footman')).toBe(37500);
      expect(bounty('phalangite')).toBe(Math.trunc(((c.units.phalangite?.cost ?? 0) * 1000) / 2));
      const sim = createSim(matchConfig({ content: c, format: 'short.bronze', training: { noClock: true }, sides }));
      devPlaceTurret(sim, 0, 0, 'rock_tosser');
      devSetGold(sim, 0, 1000);
      // a Stone turret is older than the Bronze window's first age
      expect(ofKind(new Stamper(sim).step({ t: 'replaceTurret', side: 0, mount: 0, slot: 0 }), 'turretReplaced')).toHaveLength(1);
    }
  });
});
