/**
 * Forts (DESIGN A16.14, spec sections 2-3; SIM_VERSION 5.0.0): the `fort` command and its deny order,
 * scaffolds, blocking, the contact rule, targeting, damage, decay and the Siege switch, bounty, camps and
 * levies, field towers, traps, powers and caps, formations, observation, hashing and determinism.
 *
 * Rule tests run on the frozen fixture (Stone and Medieval forts); cards the fixture lacks (the Sandbag
 * Bunker, the Hardlight Barrier, the Pillbox, Engineers' scaffold) run on the live tables through the shim.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, CardId, CompiledContent, FormatId, MatchConfig, SideConfig, SimEvent } from '@/contracts';
import { raw } from '@/content/raw';
import { LANE_MLU, MILLI } from '@/core';
import { createSim } from '../createSim';
import { makeImpact, unitDamage } from '../damage';
import { devGrantResearch, devMove, devPlaceFort, devPlaceTurret, devSetGold, devSetPower, devSpawn, simCtx, stepN, unitById } from '../debug';
import { hashState } from '../hashState';
import { buildReplay, verifyReplay } from '../replay';
import { compileForSim } from '../shim';
import { computeMatchStats } from '../stats';
import { fixture, matchConfig, sideConfig, Stamper } from './helpers';

const live = compileForSim(raw);

/** Side-1 own-frame p of a side-0 frame p (lu): tests place enemies in the defender's frame. */
const foeP = (p: number): number => LANE_MLU / MILLI - p;

interface FortSimOpts {
  content?: CompiledContent;
  format?: FormatId;
  /** The Fort card per age for both sides (default: none). */
  fort?: Partial<Record<AgeId, CardId>>;
  /** Side 1's cards when different. */
  foeFort?: Partial<Record<AgeId, CardId>>;
  clock?: boolean;
  modifiers?: string[];
  plan?: NonNullable<Parameters<typeof sideConfig>[1]>['plan'];
}

function withForts(s: SideConfig, fort: Partial<Record<AgeId, CardId>> | undefined): SideConfig {
  const loadouts = { ...s.loadouts };
  for (const age of Object.keys(loadouts) as AgeId[]) {
    const l = loadouts[age];
    if (l) loadouts[age] = { ...l, fort: fort?.[age] ?? null };
  }
  return { ...s, loadouts };
}

function fortConfig(o: FortSimOpts = {}): MatchConfig {
  const content = o.content ?? fixture;
  const p0 = withForts(sideConfig(content, { plan: o.plan }), o.fort);
  const p1 = withForts(sideConfig(content, { isBot: true, label: 'AI Test', plan: o.plan }), o.foeFort ?? o.fort);
  return matchConfig({
    content,
    seed: 7,
    format: o.format ?? 'full',
    sides: [p0, p1],
    ...(o.clock ? {} : { training: { noClock: true } }),
    ...(o.modifiers ? { modifiers: o.modifiers } : {}),
  });
}

function fortSim(o: FortSimOpts = {}) {
  const sim = createSim(fortConfig(o));
  return { sim, st: new Stamper(sim), ctx: simCtx(sim) };
}

const rejection = (ev: readonly SimEvent[]): string | null => {
  const r = ev.find((e) => e.e === 'commandRejected');
  return r && r.e === 'commandRejected' ? r.reason : null;
};

const READY = 400; // the Fort slot is first ready at 0:20 (A16.14.2)
const SCAFFOLD = 100; // 5 s
const RECHARGE = 500; // 25 s

function forts(ctx: ReturnType<typeof simCtx>, side?: 0 | 1) {
  return ctx.s.units.filter((u) => u.fort && (side === undefined || u.side === side));
}

describe('fort placement (A16.14.2)', () => {
  it('rejects in the deny order and accepts on a legal pad', () => {
    const { sim, st, ctx } = fortSim({ fort: { stone: 'palisade' } });
    devSetGold(sim, 0, 1000);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 0 }))).toBe('fortRecharge');
    stepN(sim, READY);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 5 as never }))).toBe('badCommand');
    expect(rejection(st.step({ t: 'fort', side: 0, pad: -1 as never }))).toBe('badCommand');
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 1.5 as never }))).toBe('badCommand');
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 3 }))).toBe('fortPadKind');
    const gold = ctx.s.sides[0].gold;
    const pop = ctx.s.sides[0].pop;
    const ev = st.step({ t: 'fort', side: 0, pad: 2 });
    expect(rejection(ev)).toBeNull();
    const placed = ev.find((e) => e.e === 'fortPlaced');
    expect(placed).toMatchObject({ side: 0, card: 'palisade', pad: 2, x: 300 * MILLI, cost: 125 });
    expect(ctx.s.sides[0].gold).toBe(gold - 125 * MILLI + ctx.econ.passiveGoldPerTick);
    expect(ctx.s.sides[0].pop).toBe(pop + 6);
    const wall = forts(ctx, 0)[0];
    expect(wall?.fort).toMatchObject({ pad: 2, kind: 'wall', done: false, doneTick: ctx.s.tick + SCAFFOLD });
    // A scaffold stands at 50% of max HP; max HP = the age's Heavy Common HP × the loadout multiplier.
    expect(wall?.maxHp).toBe(560 * 100);
    expect(wall?.hp).toBe(280 * 100);
    expect(ctx.s.sides[0].fortReadyTick).toBe(ctx.s.tick + RECHARGE);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 1 }))).toBe('fortRecharge');
  });

  it('noFort for an empty slot; fortPadTaken, fortMax, popFull and noGold', () => {
    const empty = fortSim();
    stepN(empty.sim, READY);
    expect(rejection(empty.st.step({ t: 'fort', side: 0, pad: 0 }))).toBe('noFort');
    expect(rejection(empty.st.step({ t: 'fort', side: 0, pad: 9 as never }))).toBe('badCommand');

    const { sim, st, ctx } = fortSim({ fort: { stone: 'palisade' } });
    devSetGold(sim, 0, 1000);
    stepN(sim, READY);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 0 }))).toBeNull();
    stepN(sim, RECHARGE);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 0 }))).toBe('fortPadTaken');
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 1 }))).toBeNull();
    stepN(sim, RECHARGE);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 2 }))).toBe('fortMax');
    // Free one fort: popFull and noGold come last.
    const w = forts(ctx, 0)[0];
    if (w) w.hp = 0;
    stepN(sim, 1);
    ctx.s.sides[0].pop = 58;
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 2 }))).toBe('popFull');
    ctx.s.sides[0].pop = 0;
    devSetGold(sim, 0, 100);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 2 }))).toBe('noGold');
  });

  it('fortPadEnemy: no enemy ground unit within 120 lu; air does not count', () => {
    const { sim, st } = fortSim({ fort: { stone: 'palisade' } });
    stepN(sim, READY);
    const e = devSpawn(sim, 1, 'bonker', { p: foeP(160 + 119) });
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 0 }))).toBe('fortPadEnemy');
    devMove(sim, e.id, foeP(1000));
    devSpawn(sim, 1, 'gyrocopter', { p: foeP(170) });
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 0 }))).toBeNull();
  });

  it('camps: Field pads need the second frontmost trained unit 100 lu past the pad; one camp at a time', () => {
    const { sim, st } = fortSim({ fort: { stone: 'war_camp' } });
    devSetGold(sim, 0, 1000);
    stepN(sim, READY);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 3 }))).toBe('fortPadField');
    // One runner forward is not enough (rank 2, A16.14.2), and summons never count.
    devSpawn(sim, 0, 'bonker', { p: 900 });
    devSpawn(sim, 0, 'bonker', { p: 900, summoned: true });
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 3 }))).toBe('fortPadField');
    devSpawn(sim, 0, 'bonker', { p: 745 });
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 3 }))).toBeNull();
    stepN(sim, RECHARGE);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 0 }))).toBe('fortCampMax');
  });

  it('Siege: no placing (fortSiege comes before fortRecharge)', () => {
    const { sim, st, ctx } = fortSim({ fort: { stone: 'palisade' }, clock: true, format: 'short' });
    const siege = ctx.siegeTick as number;
    stepN(sim, siege);
    expect(ctx.s.phase).toBe('siege');
    ctx.s.sides[0].fortReadyTick = ctx.s.tick + 100;
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 0 }))).toBe('fortSiege');
  });

  it('Engineers cut the scaffold to 3 s (A16.14.5)', () => {
    const { sim, st, ctx } = fortSim({ content: live, fort: { stone: 'palisade' } });
    devGrantResearch(sim, 0, 'defences.engineers');
    stepN(sim, READY);
    st.step({ t: 'fort', side: 0, pad: 0 });
    expect(forts(ctx, 0)[0]?.fort?.doneTick).toBe(ctx.s.tick + 60);
  });
});

describe('scaffold and completion (A16.14.2)', () => {
  it('completes after 5 s: the other half of its HP (damage kept), fortBuilt, and pushes overlapping enemies out', () => {
    const { sim, st, ctx } = fortSim({ fort: { stone: 'palisade' } });
    stepN(sim, READY);
    st.step({ t: 'fort', side: 0, pad: 2 });
    const wall = forts(ctx, 0)[0];
    if (!wall) throw new Error('no wall');
    wall.hp -= 1000;
    // Enemies overlapping the scaffold (Rams, which never hit a scaffold): one short of its centre is
    // pushed out, one past it (toward the owner's gate) keeps going.
    const before = devSpawn(sim, 1, 'battering_ram', { p: foeP(310) });
    const past = devSpawn(sim, 1, 'battering_ram', { p: foeP(290) });
    let built: SimEvent | undefined;
    for (let i = 0; i < SCAFFOLD + 2 && !built; i += 1) {
      devMove(sim, before.id, foeP(310));
      devMove(sim, past.id, foeP(290));
      built = sim.step([]).find((e) => e.e === 'fortBuilt');
    }
    expect(built).toMatchObject({ id: wall.id });
    expect(wall.fort?.done).toBe(true);
    expect(wall.hp).toBe(56000 - 1000);
    // Pushed to the near edge: wall centre 300 + 24 + 24 (a large unit's half-width).
    expect(unitById(sim, before.id)?.x).toBe((300 + 24 + 24) * MILLI);
    expect(unitById(sim, past.id)?.x ?? LANE_MLU).toBeLessThanOrEqual(290 * MILLI);
  });

  it('a scaffold does not block; a completed fort blocks enemies and never its own units', () => {
    const { sim, st, ctx } = fortSim({ content: fixture, fort: { stone: 'palisade' } });
    stepN(sim, READY);
    st.step({ t: 'fort', side: 0, pad: 2 });
    // A Battering Ram only hits blockers: it walks straight through a scaffold.
    const ram = devSpawn(sim, 1, 'battering_ram', { p: foeP(360) });
    stepN(sim, 40);
    expect(LANE_MLU - (unitById(sim, ram.id)?.x ?? 0)).toBeGreaterThan(foeP(300) * MILLI);
    ctx.s.units = ctx.s.units.filter((u) => u.id !== ram.id);
    stepN(sim, SCAFFOLD);
    expect(forts(ctx, 0)[0]?.fort?.done).toBe(true);
    // Own units walk through their own wall.
    const own = devSpawn(sim, 0, 'bonker', { p: 250 });
    stepN(sim, 60);
    expect((unitById(sim, own.id)?.x ?? 0) / MILLI).toBeGreaterThan(300 + 24 + 12);
    ctx.s.units = ctx.s.units.filter((u) => u.id !== own.id);
    ctx.s.sides[0].pop -= 2;
    // An enemy is stopped at the wall's edge.
    const foe = devSpawn(sim, 1, 'bonker', { p: foeP(500) });
    stepN(sim, 200);
    const fx = (unitById(sim, foe.id)?.x ?? 0) / MILLI;
    expect(fx).toBeGreaterThanOrEqual(300 + 24 + 12);
    expect(fx).toBeLessThanOrEqual(300 + 24 + 12 + 16);
  });
});

describe('contact rule (A16.14.2)', () => {
  it('a blocked group hits the wall with at most 5 units: the front rank first, then those within 60 lu behind', () => {
    const { sim, ctx } = fortSim();
    const wall = devPlaceFort(sim, 0, 'palisade', { pad: 2, done: true });
    for (let i = 0; i < 10; i += 1) devSpawn(sim, 1, 'bonker', { p: foeP(340 + i * 8) });
    stepN(sim, 30);
    expect(ctx.contact.size).toBeGreaterThanOrEqual(4);
    expect(ctx.contact.size).toBeLessThanOrEqual(5);
    for (const f of ctx.contact.values()) expect(f).toBe(wall);
    // Over one attack interval (1 s) the wall takes at most 5 hits.
    const hits: number[] = [];
    for (let t = 0; t < 20; t += 1) for (const e of sim.step([])) if (e.e === 'hit' && e.targetId === wall) hits.push(e.sourceId);
    expect(hits.length).toBeGreaterThanOrEqual(4);
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  it('the cap is a hard limit: reach units (Spear Hunters, range 60) never hit a wall with more than 5', () => {
    const { sim, ctx } = fortSim();
    const wall = devPlaceFort(sim, 0, 'palisade', { pad: 2, done: true });
    for (let i = 0; i < 10; i += 1) devSpawn(sim, 1, 'spear_hunter', { p: foeP(340 + i * 8) });
    stepN(sim, 30);
    expect(ctx.contact.size).toBeLessThanOrEqual(5);
    // Every 2 s window: at most 5 distinct attackers, all of them in the contact set.
    for (let w = 0; w < 3 && unitById(sim, wall); w += 1) {
      const by = new Set<number>();
      for (let t = 0; t < 40; t += 1) {
        for (const e of sim.step([])) if (e.e === 'hit' && e.targetId === wall) by.add(e.sourceId);
      }
      expect(by.size).toBeGreaterThan(0);
      expect(by.size).toBeLessThanOrEqual(5);
    }
  });
});

describe('targeting (A16.14.2)', () => {
  it('range ≥ 100: units first, then the base, then forts; a lone fort in range is shot', () => {
    const { sim } = fortSim();
    const wall = devPlaceFort(sim, 0, 'palisade', { pad: 2, done: true });
    const peb = devSpawn(sim, 1, 'pebbler', { p: foeP(450) });
    const hitsOn = (n: number, target: number): number => {
      let k = 0;
      for (let i = 0; i < n; i += 1) for (const e of sim.step([])) if (e.e === 'hit' && e.targetId === target && e.sourceId === peb.id) k += 1;
      return k;
    };
    expect(hitsOn(100, wall)).toBeGreaterThan(0);
    expect(unitById(sim, peb.id)?.attacks[0]?.targetId).toBe(wall);
    // With an enemy unit in range as well, the Pebbler turns to the unit at once (a fort is never sticky).
    const own = devSpawn(sim, 0, 'tuskback', { p: 330 });
    stepN(sim, 3);
    expect(unitById(sim, peb.id)?.attacks[0]?.targetId).toBe(own.id);
  });

  it('a ranged unit that can reach the base never shoots a wall instead', () => {
    const { sim } = fortSim();
    const wall = devPlaceFort(sim, 0, 'palisade', { pad: 2, done: true });
    const peb = devSpawn(sim, 1, 'pebbler', { p: foeP(150) });
    let onWall = 0;
    let onBase = 0;
    for (let i = 0; i < 80; i += 1) {
      for (const e of sim.step([])) {
        if (e.e === 'hit' && e.targetId === wall && e.sourceId === peb.id) onWall += 1;
        if (e.e === 'baseDamaged' && e.side === 0 && e.sourceId === peb.id) onBase += 1;
      }
    }
    expect(onBase).toBeGreaterThan(0);
    expect(onWall).toBe(0);
  });

  it('turrets never target forts; towers never target bases or forts', () => {
    const { sim } = fortSim();
    devPlaceTurret(sim, 0, 0, 'rock_tosser');
    // An enemy fort placed (by the dev helper) inside the turret's reach is ignored.
    const foeWall = devPlaceFort(sim, 1, 'palisade', { p: foeP(200), done: true });
    const tower = devPlaceFort(sim, 0, 'sling_perch', { pad: 1, done: true });
    let fired = 0;
    let hitWall = 0;
    for (let i = 0; i < 200; i += 1) {
      for (const e of sim.step([])) {
        if (e.e === 'turretFired' && e.side === 0) fired += 1;
        if (e.e === 'attackStarted' && e.id === tower) fired += 1;
        if (e.e === 'hit' && e.targetId === foeWall) hitWall += 1;
      }
    }
    expect(fired).toBe(0);
    expect(hitWall).toBe(0);
  });
});

describe('damage to forts (A16.14.2 section 2.5)', () => {
  const firstHitOn = (card: string, wallCard: string, o: FortSimOpts = {}, p = 340): SimEvent | undefined => {
    const { sim } = fortSim(o);
    const wall = devPlaceFort(sim, 0, wallCard, { pad: 2, done: true });
    devSpawn(sim, 1, card, { p: foeP(p) });
    for (let i = 0; i < 200; i += 1) {
      const h = sim.step([]).find((e) => e.e === 'hit' && e.targetId === wall);
      if (h) return h;
    }
    return undefined;
  };

  it('Heavy ×2 (the structure mod), Infantry ×1, ranged ×0.5; siege-only units hit with their vs-base damage', () => {
    expect(firstHitOn('destrier_knight', 'palisade')).toMatchObject({ modBp: 20000 });
    expect(firstHitOn('bonker', 'palisade')).toMatchObject({ modBp: 10000, damage: 2000 });
    expect(firstHitOn('pebbler', 'palisade', {}, 450)).toMatchObject({ modBp: 5000, damage: 900 });
    expect(firstHitOn('battering_ram', 'palisade')).toMatchObject({ modBp: 10000, damage: 160 * 100 });
    // A Legendary's attacks carry it too.
    expect(firstHitOn('ursa_paladin', 'palisade')).toMatchObject({ modBp: 20000 });
  });

  it('forts take ×2 in Siege; forts ignore statuses and knockback', () => {
    const { sim, ctx } = fortSim({ clock: true, format: 'short' });
    stepN(sim, (ctx.siegeTick as number) - 1);
    const wall = devPlaceFort(sim, 0, 'palisade', { pad: 2, done: true });
    devSpawn(sim, 1, 'bonker', { p: foeP(340) });
    let h: SimEvent | undefined;
    for (let i = 0; i < 100 && !h; i += 1) h = sim.step([]).find((e) => e.e === 'hit' && e.targetId === wall);
    expect(ctx.s.phase).toBe('siege');
    expect(h).toMatchObject({ damage: 4000 });
    expect(unitById(sim, wall)?.statuses).toEqual([]);
  });
});

describe('decay and the Siege switch (A16.14.2 section 2.6)', () => {
  it('from 60 s after completion a fort loses 1% of max HP per second', () => {
    const { sim, ctx } = fortSim();
    const id = devPlaceFort(sim, 0, 'palisade', { pad: 0, done: true });
    const u = unitById(sim, id);
    if (!u?.fort) throw new Error('no fort');
    stepN(sim, u.fort.decayFromTick - ctx.s.tick);
    expect(u.hp).toBe(u.maxHp);
    stepN(sim, 20);
    expect(u.hp).toBe(u.maxHp - Math.ceil(u.maxHp / 100));
    stepN(sim, 20);
    expect(u.hp).toBe(u.maxHp - 2 * Math.ceil(u.maxHp / 100));
  });

  it('Siege switches every completed fort to 2%/s at once: none lives past scaffold + 50 s into Siege', () => {
    const { sim, st, ctx } = fortSim({ fort: { stone: 'palisade' }, clock: true, format: 'short' });
    const siege = ctx.siegeTick as number;
    devSetGold(sim, 0, 1000);
    stepN(sim, siege - SCAFFOLD - 2);
    st.step({ t: 'fort', side: 0, pad: 0 });
    const w = forts(ctx, 0)[0];
    let gone = -1;
    for (let i = 0; i < 2000 && gone < 0; i += 1) {
      const ev = sim.step([]);
      if (ev.some((e) => e.e === 'fortDecayed' && e.id === w?.id)) gone = ctx.s.tick;
    }
    expect(gone).toBeGreaterThan(siege);
    expect(gone - siege).toBeLessThanOrEqual(1000);
  });

  it('a decayed fort pays nobody; one an enemy hit within 3 s pays that enemy', () => {
    for (const credited of [false, true]) {
      const { sim, ctx } = fortSim();
      const id = devPlaceFort(sim, 0, 'palisade', { pad: 0, done: true });
      const u = unitById(sim, id);
      if (!u?.fort) throw new Error('no fort');
      stepN(sim, u.fort.decayFromTick - ctx.s.tick);
      u.hp = 1;
      if (credited) {
        u.fort.lastEnemyHitTick = ctx.s.tick - 10;
        u.lastHitSide = 1;
        u.lastHitKind = 'unit';
        u.lastHitCard = 'bonker';
        u.lastHitId = 999;
      }
      const gold1 = ctx.s.sides[1].gold;
      const ev = stepN(sim, 20);
      const dec = ev.find((e) => e.e === 'fortDecayed');
      const died = ev.find((e) => e.e === 'died' && e.id === id);
      expect(dec).toMatchObject(credited ? { id, creditedTo: 1 } : { id });
      if (!credited) expect(dec && 'creditedTo' in dec ? dec.creditedTo : undefined).toBeUndefined();
      expect(died).toMatchObject(credited ? { killerKind: 'unit', killerSide: 1, bountyGold: 62500, bountyXp: 87500 } : { killerKind: 'decay', bountyGold: 0 });
      if (credited) expect(ctx.s.sides[1].gold).toBeGreaterThanOrEqual(gold1 + 62500);
      expect(ctx.s.sides[0].pop).toBe(0);
    }
  });
});

describe('bounty (A16.14.2 section 2.7)', () => {
  it('a destroyed fort (or scaffold) pays the killer 50% gold and 70% XP; the owner gets no loss XP', () => {
    for (const scaffold of [true, false]) {
      const { sim, ctx } = fortSim();
      const id = devPlaceFort(sim, 0, 'palisade', { pad: 2, done: !scaffold });
      const u = unitById(sim, id);
      if (!u) throw new Error('no fort');
      u.hp = 100;
      devSpawn(sim, 1, 'bonker', { p: foeP(340) });
      const ev = stepN(sim, 60);
      const died = ev.find((e) => e.e === 'died' && e.id === id);
      expect(died).toMatchObject({ killerSide: 1, killerKind: 'unit', bountyGold: 62500, bountyXp: 87500 });
      expect(ev.some((e) => e.e === 'xpEarned' && e.side === 0 && e.reason === 'loss')).toBe(false);
      expect(ev.some((e) => e.e === 'fortDecayed')).toBe(false);
      expect(ctx.s.sides[0].pop).toBe(0);
    }
  });
});

describe('camps and levies (A16.14.3)', () => {
  it('a levy every 8 s after a first at 2 s, at most 2 alive, 40% of the Infantry Common, cost 0, no bounty', () => {
    const { sim, ctx } = fortSim();
    const camp = devPlaceFort(sim, 0, 'war_camp', { pad: 0, done: true });
    const spawns: SimEvent[] = [];
    for (let i = 0; i < 40 + 160 * 3; i += 1) for (const e of sim.step([])) if (e.e === 'unitSpawned' && e.from === camp) spawns.push(e);
    expect(spawns.map((e) => e.tick)).toEqual([40, 200]);
    const levies = ctx.s.units.filter((u) => u.card === 'cave_youth');
    expect(levies).toHaveLength(2);
    const l = levies[0];
    expect(l?.summoned).toBe(true);
    expect(l?.maxHp).toBe(64 * 100);
    expect(l?.dmg[0]).toBe(8 * 100);
    expect(ctx.s.sides[0].pop).toBe(6);
    // A dead levy frees a place: the next comes at once (the timer never banks a second spawn).
    if (l) l.hp = 0;
    const ev = stepN(sim, 2);
    const died = ev.find((e) => e.e === 'died' && e.id === l?.id);
    expect(died).toMatchObject({ bountyGold: 0, bountyXp: 0 });
    expect(ev.filter((e) => e.e === 'unitSpawned' && e.from === camp)).toHaveLength(1);
    expect(fixture.units.cave_youth).toMatchObject({ cost: 0, aiValue: 8, levy: true, hidden: true, group: 'infantry' });
  });

  it('levies always march: they ignore Hold', () => {
    const { sim, st, ctx } = fortSim();
    st.step({ t: 'stance', side: 0, mode: 'hold' });
    devPlaceFort(sim, 0, 'war_camp', { pad: 0, done: true });
    stepN(sim, 400);
    const levy = ctx.s.units.find((u) => u.card === 'cave_youth');
    expect((levy?.x ?? 0) / MILLI).toBeGreaterThan(400);
  });

  it('camps stop sending levies in Siege', () => {
    const { sim, ctx } = fortSim({ clock: true, format: 'short' });
    stepN(sim, ctx.siegeTick as number);
    const camp = devPlaceFort(sim, 0, 'war_camp', { pad: 0, done: true });
    const ev = stepN(sim, 400);
    expect(ev.filter((e) => e.e === 'unitSpawned' && e.from === camp)).toEqual([]);
  });
});

describe('field towers (A16.14.3)', () => {
  it('shoot with a 0% windup at the nearest enemy unit in range, ×1.5 the Ranged Common', () => {
    const { sim } = fortSim();
    const tower = devPlaceFort(sim, 0, 'sling_perch', { pad: 1, done: true });
    const foe = devSpawn(sim, 1, 'tuskback', { p: foeP(430) });
    let started: SimEvent | undefined;
    let hit: SimEvent | undefined;
    for (let i = 0; i < 200 && !hit; i += 1) {
      for (const e of sim.step([])) {
        if (e.e === 'attackStarted' && e.id === tower) started ??= e;
        if (e.e === 'hit' && e.sourceId === tower) hit = e;
      }
    }
    expect(started).toMatchObject({ windupTicks: 0, targetId: foe.id });
    expect(hit).toMatchObject({ targetId: foe.id, damage: 2700 });
  });

  it('reach never passes own-frame p 560: range = min(card, 560 − pad − 16)', () => {
    const { sim } = fortSim({ content: live, fort: { stone: 'palisade', modern: 'pillbox' } });
    const obs = sim.observe(0);
    expect(obs.me.fort?.pads.map((p) => p.p)).toEqual([160, 230, 300, 640, 820]);
    const pill = live.forts.pillbox;
    expect(pill?.attack?.range).toBe(260);
    const { sim: s2 } = fortSim({ content: live });
    const tw = devPlaceFort(s2, 0, 'pillbox', { pad: 2, done: true });
    const u = unitById(s2, tw);
    expect(u).toBeDefined();
    // An enemy 250 lu from the tower's edge (inside the card range, outside the clamp) is not shot; one
    // 240 lu away is (both on the first tick, before anyone moves).
    const far = devSpawn(s2, 1, 'trench_raider', { p: foeP(300 + 16 + 250 + 12) });
    expect(stepN(s2, 1).some((e) => e.e === 'attackStarted' && e.id === tw)).toBe(false);
    devMove(s2, far.id, foeP(300 + 16 + 240 + 12));
    expect(stepN(s2, 1).some((e) => e.e === 'attackStarted' && e.id === tw)).toBe(true);
  });

  it('Suppress silences towers; towers deal ×0.5 in Siege', () => {
    const { sim, ctx } = fortSim();
    const tower = devPlaceFort(sim, 0, 'sling_perch', { pad: 1, done: true });
    const u = unitById(sim, tower);
    if (!u?.fort) throw new Error('no tower');
    u.fort.silencedUntilTick = ctx.s.tick + 100;
    devSpawn(sim, 1, 'tuskback', { p: foeP(430) });
    expect(stepN(sim, 99).some((e) => e.e === 'attackStarted' && e.id === tower)).toBe(false);
    expect(stepN(sim, 5).some((e) => e.e === 'attackStarted' && e.id === tower)).toBe(true);

    const siege = fortSim({ clock: true, format: 'short' });
    stepN(siege.sim, siege.ctx.siegeTick as number);
    const t2 = devPlaceFort(siege.sim, 0, 'sling_perch', { pad: 1, done: true });
    devSpawn(siege.sim, 1, 'tuskback', { p: foeP(430) });
    let hit: SimEvent | undefined;
    for (let i = 0; i < 200 && !hit; i += 1) hit = siege.sim.step([]).find((e) => e.e === 'hit' && e.sourceId === t2);
    expect(hit).toMatchObject({ damage: 1350 });
  });

  it('a Suppress cast jams the enemy towers (towerSilenced)', () => {
    const cfg = fortConfig({ content: live, format: 'w1.medieval', plan: { warPath: 7 } });
    const sim = createSim(cfg);
    const st = new Stamper(sim);
    const tower = devPlaceFort(sim, 0, 'longbow_tower', { pad: 1, done: true });
    // Side 1 needs its front at p ≥ 1,370 to Suppress (A2.9.4).
    devSpawn(sim, 1, 'footman', { p: 1400 });
    devSpawn(sim, 1, 'footman', { p: 1400 });
    devSetPower(sim, 1, 1000000, 'field');
    devSetGold(sim, 1, 1000);
    const ev = st.step({ t: 'power', side: 1, slot: 'field' });
    expect(rejection(ev)).toBeNull();
    const later = stepN(sim, 40);
    expect(later.find((e) => e.e === 'towerSilenced')).toMatchObject({ side: 0, id: tower });
  });
});

describe('traps (A16.14.3)', () => {
  it('arm after 2 s, fire on the nearest enemy ground unit within 30 lu, 1 s apart, slow, then expire and free their pop', () => {
    const { sim, st, ctx } = fortSim({ fort: { stone: 'spike_pit' } });
    stepN(sim, READY);
    const ev0 = st.step({ t: 'fort', side: 0, pad: 1 });
    const trapId = ev0.find((e) => e.e === 'fortPlaced')?.e === 'fortPlaced' ? (ev0.find((e) => e.e === 'fortPlaced') as { id: number }).id : -1;
    expect(ctx.s.traps).toHaveLength(1);
    expect(ctx.s.sides[0].pop).toBe(3);
    // Air never triggers it.
    devSpawn(sim, 1, 'gyrocopter', { p: foeP(230) });
    const armed = stepN(sim, 40);
    expect(armed.find((e) => e.e === 'trapArmed')).toMatchObject({ id: trapId });
    expect(armed.some((e) => e.e === 'trapTriggered')).toBe(false);
    const foe = devSpawn(sim, 1, 'tuskback', { p: foeP(235) });
    const triggers: SimEvent[] = [];
    let expired = false;
    let slowed = false;
    for (let i = 0; i < 100; i += 1) {
      for (const e of sim.step([])) {
        if (e.e === 'trapTriggered') triggers.push(e);
        if (e.e === 'trapExpired' && e.id === trapId) expired = true;
        if (e.e === 'statusApplied' && e.id === foe.id && e.kind === 'slow') slowed = true;
      }
      devMove(sim, foe.id, foeP(235));
    }
    expect(triggers.map((e) => (e.e === 'trapTriggered' ? e.charge : -1))).toEqual([0, 1, 2]);
    expect(triggers[1]!.tick - triggers[0]!.tick).toBe(20);
    expect(slowed).toBe(true);
    expect(expired).toBe(true);
    expect(ctx.s.traps).toHaveLength(0);
    expect(ctx.s.sides[0].pop).toBe(0);
  });

  it('expire at the start of Siege', () => {
    const { sim, ctx } = fortSim({ clock: true, format: 'short' });
    stepN(sim, (ctx.siegeTick as number) - 10);
    devPlaceFort(sim, 0, 'spike_pit', { pad: 1, done: true });
    const ev = stepN(sim, 20);
    expect(ev.some((e) => e.e === 'trapExpired')).toBe(true);
    expect(ctx.s.traps).toHaveLength(0);
  });
});

describe('powers and caps (A16.14.2, A16.14.3)', () => {
  it('powers never target forts: a strike with only an enemy fort on the lane finds nothing', () => {
    const { sim, st } = fortSim({ plan: { warPath: 9 } });
    devPlaceFort(sim, 1, 'palisade', { pad: 2, done: true });
    devSetPower(sim, 0, 1000000, 'field');
    devSetGold(sim, 0, 1000);
    expect(rejection(st.step({ t: 'power', side: 0, slot: 'field' }))).toBe('powerNoTarget');
  });

  it('levies rank last in power caps: a trained unit always takes a slot first', () => {
    const { sim, st, ctx } = fortSim();
    for (let i = 0; i < 4; i += 1) devSpawn(sim, 1, 'cave_youth', { p: foeP(420 + i), summoned: true });
    for (let i = 0; i < 6; i += 1) devSpawn(sim, 1, 'bonker', { p: foeP(560 + i * 4) });
    devSetPower(sim, 0, 1000000, 'home');
    devSetGold(sim, 0, 1000);
    expect(rejection(st.step({ t: 'power', side: 0, slot: 'home', p: 500 }))).toBeNull();
    const cast = ctx.s.casts[0];
    stepN(sim, 60);
    const hit = cast?.hitIds.map((id) => ctx.s.units.find((u) => u.id === id)?.card ?? 'dead') ?? [];
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.filter((c) => c === 'cave_youth')).toEqual([]);
  });

  it('buffs skip forts and rank levies last (Hunt Cry: 8 units while others qualify)', () => {
    const { sim, st, ctx } = fortSim({ plan: { warPath: 7 } });
    const wall = devPlaceFort(sim, 0, 'palisade', { pad: 2, done: true });
    const levy = devSpawn(sim, 0, 'cave_youth', { p: 900, summoned: true });
    for (let i = 0; i < 8; i += 1) devSpawn(sim, 0, 'bonker', { p: 200 + i * 10 });
    devSetPower(sim, 0, 1000000, 'field');
    devSetGold(sim, 0, 1000);
    expect(rejection(st.step({ t: 'power', side: 0, slot: 'field' }))).toBeNull();
    stepN(sim, 12);
    expect(unitById(sim, wall)?.statuses).toEqual([]);
    expect(unitById(sim, levy.id)?.statuses).toEqual([]);
    expect(ctx.s.units.filter((u) => u.card === 'bonker' && u.statuses.length > 0)).toHaveLength(8);
  });
});

describe('formations (A16.14.2)', () => {
  it('followSupport ignores an own wall ahead: alone, a Drum Shaman stays at p ≤ 200', () => {
    const { sim } = fortSim();
    devPlaceFort(sim, 0, 'palisade', { pad: 2, done: true });
    const shaman = devSpawn(sim, 0, 'drum_shaman', { p: 40 });
    stepN(sim, 300);
    expect((unitById(sim, shaman.id)?.x ?? 0) / MILLI).toBeLessThanOrEqual(200);
  });

  it('the front rank ignores an own wall ahead: three units walk past it side by side', () => {
    const { sim } = fortSim();
    devPlaceFort(sim, 0, 'palisade', { pad: 2, done: true });
    const us = [0, 1, 2].map(() => devSpawn(sim, 0, 'bonker', { p: 280 }));
    stepN(sim, 60);
    const xs = us.map((u) => unitById(sim, u.id)?.x ?? 0);
    expect(new Set(xs).size).toBe(1);
    expect((xs[0] ?? 0) / MILLI).toBeGreaterThan(330);
  });
});

describe('special walls (A16.14.3)', () => {
  it('Sandbag Bunker: own units within 60 lu behind take −20% from attacks with range ≥ 100 only', () => {
    const { sim, ctx } = fortSim({ content: live });
    devPlaceFort(sim, 0, 'sandbag_bunker', { pad: 2, done: true });
    const u = devSpawn(sim, 0, 'trench_raider', { p: 262 });
    stepN(sim, 1);
    const target = unitById(sim, u.id);
    if (!target) throw new Error('no unit');
    expect(target.auraCoverBp).toBe(2000);
    const imp = makeImpact(1, 0, 'rifleman');
    imp.dmg = 10000;
    imp.srcRange = 260 * MILLI;
    expect(unitDamage(ctx, imp, target, true).dmg).toBe(8000);
    imp.srcRange = 16 * MILLI;
    expect(unitDamage(ctx, imp, target, true).dmg).toBe(10000);
  });

  it('Hardlight Barrier: 1% of max HP per second after 3 s without damage, until its decay starts', () => {
    const { sim, ctx } = fortSim({ content: live });
    const id = devPlaceFort(sim, 0, 'hardlight_barrier', { pad: 2, done: true });
    const u = unitById(sim, id);
    if (!u?.fort) throw new Error('no barrier');
    u.hp = Math.trunc(u.maxHp / 2);
    u.lastDamageTick = ctx.s.tick;
    stepN(sim, 59);
    expect(u.hp).toBe(Math.trunc(u.maxHp / 2));
    stepN(sim, 21);
    expect(u.hp).toBeGreaterThan(Math.trunc(u.maxHp / 2));
    // Once its decay starts it never regenerates again.
    stepN(sim, u.fort.decayFromTick - ctx.s.tick);
    u.hp = Math.trunc(u.maxHp / 2);
    stepN(sim, 60);
    expect(u.hp).toBeLessThan(Math.trunc(u.maxHp / 2));
  });
});

describe('safe pads (A16.14.1)', () => {
  /** Is pad 0 (p 160, the only safe pad with no turret) safe one tick after a walking Bonker spawns at p? */
  function safeWith(p: number, buffBp: number): boolean {
    const { sim } = fortSim({ fort: { stone: 'palisade' } });
    const foe = devSpawn(sim, 1, 'bonker', { p: foeP(p) });
    const u = unitById(sim, foe.id);
    if (buffBp > 0) u?.statuses.push({ kind: 'speedBuff', magnitudeBp: buffBp, untilTick: 100000, amount: 0, frozen: false, sourceId: 0 });
    sim.step([]);
    return sim.observe(0).me.fort?.pads[0]?.safe === true;
  }

  it('reads a walking enemy at its current speed: a speed buff turns a just-safe pad unsafe', () => {
    let lastSafe = -1;
    for (let p = 900; p >= 300; p -= 10) {
      if (!safeWith(p, 0)) break;
      lastSafe = p;
    }
    expect(lastSafe).toBeGreaterThan(300);
    expect(safeWith(lastSafe, 2000)).toBe(false);
  });
});

describe('observation (A16.14.7)', () => {
  it('shows my slot and pads, the enemy ring (card once placed), forts as units and traps to both sides', () => {
    const { sim, st } = fortSim({ fort: { stone: 'palisade' }, foeFort: { stone: 'spike_pit' } });
    let o = sim.observe(0);
    expect(o.me.fort).toMatchObject({ card: 'palisade', cost: 125, readyTicks: READY, alive: 0, campAlive: false });
    expect(o.me.fort?.pads.map((p) => [p.kind, p.legal])).toEqual([
      ['home', true],
      ['home', true],
      ['home', true],
      ['field', false],
      ['field', false],
    ]);
    expect(o.foe.fort).toEqual({ card: null, readyTicks: READY });
    stepN(sim, READY);
    st.step({ t: 'fort', side: 0, pad: 1 }, { t: 'fort', side: 1, pad: 0 });
    o = sim.observe(0);
    expect(o.foe.fort).toEqual({ card: 'spike_pit', readyTicks: RECHARGE });
    expect(o.units.find((u) => u.card === 'palisade')).toMatchObject({ fort: 'wall', scaffold: true, p: 230 * MILLI });
    expect(o.traps).toEqual([{ id: expect.any(Number), side: 1, card: 'spike_pit', p: LANE_MLU - 160 * MILLI, armed: false, charges: 3 }]);
    expect(sim.observe(1).traps?.[0]?.p).toBe(160 * MILLI);
  });
});

describe('hash, determinism and replays (B3)', () => {
  function scripted() {
    const cfg = fortConfig({ fort: { stone: 'palisade', medieval: 'levy_camp' }, foeFort: { stone: 'war_camp', medieval: 'wolf_pits' }, clock: true, format: 'short' });
    const sim = createSim(cfg);
    const st = new Stamper(sim);
    for (let t = 0; t < 3000 && !sim.state.outcome; t += 1) {
      const cmds: Parameters<Stamper['step']> = [];
      if (t % 20 === 0) cmds.push({ t: 'train', side: 0, slot: t % 60 === 0 ? 2 : 0 }, { t: 'train', side: 1, slot: 0 });
      if (t % 100 === 5) cmds.push({ t: 'fort', side: 0, pad: (t / 100) % 3 === 0 ? 2 : 1 }, { t: 'fort', side: 1, pad: 0 });
      st.step(...cmds);
    }
    return sim;
  }

  it('the same commands give the same hashes; the state hash covers the fort fields', () => {
    const a = scripted();
    const b = scripted();
    expect(a.hash()).toBe(b.hash());
    expect(a.state.hashes).toEqual(b.state.hashes);
    const { sim, ctx } = fortSim();
    const f = unitById(sim, devPlaceFort(sim, 0, 'war_camp', { pad: 0, done: true }));
    devPlaceFort(sim, 1, 'spike_pit', { pad: 0 });
    const h = hashState(ctx.s);
    if (f?.fort) f.fort.campNextTick += 1;
    const h2 = hashState(ctx.s);
    expect(h2).not.toBe(h);
    const t = ctx.s.traps[0];
    if (t) t.charges -= 1;
    expect(hashState(ctx.s)).not.toBe(h2);
    ctx.s.sides[0].fortReadyTick += 1;
    expect(hashState(ctx.s)).not.toBe(h2);
  });

  it('a match with fort commands replays to the same hash', () => {
    const cfg = fortConfig({ fort: { stone: 'palisade' }, foeFort: { stone: 'sling_perch' }, clock: true, format: 'short', modifiers: ['sudden_siege'] });
    const sim = createSim(cfg);
    const st = new Stamper(sim);
    const events: SimEvent[] = [];
    for (let t = 0; t < 40000 && !sim.state.outcome; t += 1) {
      const cmds: Parameters<Stamper['step']> = [];
      if (t % 100 === 50) cmds.push({ t: 'train', side: 0, slot: 0 }, { t: 'train', side: 1, slot: t % 200 === 50 ? 2 : 1 });
      if (t % 100 === 0) cmds.push({ t: 'fort', side: 0, pad: ((t / 100) % 3) as 0 | 1 | 2 }, { t: 'fort', side: 1, pad: ((t / 100) % 3) as 0 | 1 | 2 });
      events.push(...st.step(...cmds));
    }
    expect(sim.state.outcome).not.toBeNull();
    const doc = buildReplay(sim);
    expect(doc.commands.some((c) => c.t === 'fort')).toBe(true);
    const check = verifyReplay(doc, cfg.content);
    expect(check.ok).toBe(true);
    // The recorded match's own events: side 1 placed Sling Perches (150 gold each).
    const placed = events.filter((e) => e.e === 'fortPlaced' && e.side === 1).length;
    const stats = computeMatchStats(events, { format: cfg.format, content: cfg.content }, 1);
    expect(placed).toBeGreaterThan(0);
    expect(stats.forts?.placed).toBe(placed);
    expect(stats.forts?.gold).toBe(placed * (cfg.content.forts['sling_perch']?.cost ?? 0));
  });

  it('stats count forts placed and their gold', () => {
    const { sim, st } = fortSim({ fort: { stone: 'palisade' } });
    const events: SimEvent[] = [];
    events.push(...stepN(sim, READY));
    events.push(...st.step({ t: 'fort', side: 0, pad: 0 }));
    events.push(...stepN(sim, 200));
    const s = computeMatchStats(events, { format: 'full', content: fixture }, 0);
    expect(s.forts).toMatchObject({ placed: 1, gold: 125 });
    expect(s.trained).toBe(0);
  });

  it('a loadout without a Fort card rejects every fort command (noFort)', () => {
    const sim = createSim(matchConfig({ training: { noClock: true } }));
    const st = new Stamper(sim);
    stepN(sim, READY);
    expect(rejection(st.step({ t: 'fort', side: 0, pad: 0 }))).toBe('noFort');
  });
});
