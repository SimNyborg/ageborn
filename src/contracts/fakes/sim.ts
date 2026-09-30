/**
 * Fake `Sim` that replays a canned `SimEvent` stream (DESIGN C2/WP0 task 5).
 *
 * Lets render, HUD, audio and session work (WP5, WP6, WP11) run before the real sim (WP2) exists.
 * Each `step()` advances one tick and returns the canned events stamped with that tick. Commands are
 * recorded in `received` but otherwise ignored. A small reducer keeps `state` roughly consistent with
 * the events (spawns, deaths, HP, gold, XP, age, turrets, phase, outcome) so views have something to
 * read; units do not walk on their own, the stream places them where they fight.
 *
 * Units follow DESIGN B3: x in milli-lu (lane = 1,200,000), HP and damage in centi-units,
 * gold and XP in milli-units.
 */
import type { TimedCommand } from '../commands';
import type { MatchOutcome, SimEvent } from '../events';
import type { Side } from '../ids';
import type { Observation } from '../observation';
import type { MatchConfig, Sim, SideState, SimState, UnitState } from '../sim';
import { fakeContent, fakeSideConfig } from './content';

/** Lane length in milli-lu; mirrors core `LANE_MLU` (A17.2), which contracts may not import (B2). */
const LANE_MILLI = 2_000_000;
const BASE_HP_CENTI = 1_000_000;

/** A short scripted skirmish: spawn, ranged hit, melee hit, power kill, turret, evolve, Overdrive, retreat. */
export const cannedBattleEvents: readonly SimEvent[] = [
  { tick: 1, e: 'unitSpawned', id: 1, side: 0, card: 'bonker', x: 540_000, summoned: false, level: 1 },
  { tick: 1, e: 'unitSpawned', id: 2, side: 1, card: 'pebbler', x: 700_000, summoned: false, level: 1 },
  { tick: 1, e: 'queueChanged', side: 0 },
  { tick: 5, e: 'attackStarted', id: 2, targetId: 1, windupTicks: 14, attackIndex: 0 },
  { tick: 19, e: 'projectileFired', pid: 3, from: 2, targetId: 1, toX: 540_000, travelTicks: 7, visualId: 'proj.rock' },
  {
    tick: 26, e: 'hit', targetId: 1, sourceId: 2, sourceCard: 'pebbler', castId: null, sourceKind: 'unit',
    damage: 1800, shieldAbsorbed: 0, heavy: false, modBp: 10000, x: 540_000, dmgType: 'blunt',
  },
  { tick: 27, e: 'attackStarted', id: 1, targetId: 2, windupTicks: 8, attackIndex: 0 },
  {
    tick: 35, e: 'hit', targetId: 2, sourceId: 1, sourceCard: 'bonker', castId: null, sourceKind: 'unit',
    damage: 2000, shieldAbsorbed: 0, heavy: false, modBp: 10000, x: 700_000, dmgType: 'blunt',
  },
  { tick: 40, e: 'knockback', id: 2, fromX: 700_000, toX: 703_000 },
  { tick: 50, e: 'powerReady', side: 0, slot: 'field' },
  {
    tick: 51, e: 'powerTelegraph', side: 0, slot: 'field', power: 'stampede', castId: 1, x: 700_000, zone: 500_000,
    cost: 100, targetId: -1, telegraphMs: 1000,
  },
  { tick: 71, e: 'powerImpact', side: 0, power: 'stampede', castId: 1, x: 703_000, index: 0 },
  {
    tick: 71, e: 'hit', targetId: 2, sourceId: -1, sourceCard: 'stampede', castId: 1, sourceKind: 'power',
    damage: 5000, shieldAbsorbed: 0, heavy: true, modBp: 10000, x: 703_000, dmgType: 'blunt',
  },
  {
    tick: 71, e: 'died', id: 2, side: 1, card: 'pebbler', killerId: null, killerCard: 'stampede', killerKind: 'power',
    killerSide: 0, bountyGold: 22_500, bountyXp: 0, x: 703_000,
  },
  { tick: 71, e: 'goldEarned', side: 0, amount: 22_500, reason: 'bounty', x: 703_000 },
  { tick: 80, e: 'turretBuildStart', side: 1, mount: 0, card: 'rock_tosser' },
  { tick: 100, e: 'turretBuilt', side: 1, mount: 0, card: 'rock_tosser' },
  { tick: 105, e: 'turretFired', side: 1, mount: 0, targetId: 1 },
  { tick: 110, e: 'baseDamaged', side: 1, sourceId: 1, damage: 2000, hp: 998_000, maxHp: BASE_HP_CENTI },
  { tick: 110, e: 'xpEarned', side: 0, amount: 2_400, reason: 'base' },
  { tick: 120, e: 'ascendStart', side: 0, age: 'medieval' },
  { tick: 170, e: 'ageUp', side: 0, age: 'medieval' },
  { tick: 170, e: 'unitSpawned', id: 4, side: 0, card: 'footman', x: 20_000, summoned: true, level: 1 },
  { tick: 170, e: 'unitSpawned', id: 5, side: 0, card: 'footman', x: 20_000, summoned: true, level: 1 },
  { tick: 200, e: 'phaseChanged', phase: 'overdrive' },
  { tick: 220, e: 'emote', side: 1, emote: 'gg' },
  { tick: 240, e: 'matchEnded', result: { winner: 0, reason: 'retreat', tick: 240, baseHpBp: [10000, 9980] } },
];

function sideState(): SideState {
  return {
    gold: 175_000,
    xp: 0,
    ageIndex: 0,
    ascendUntil: 0,
    queue: [],
    pop: 0,
    treasury: 0,
    mountsOwned: 1,
    turrets: [null, null, null, null],
    powerPpm: [250_000, 250_000],
    powerRem: [0, 0],
    powerLockoutUntil: 0,
    mountSilencedUntil: [0, 0, 0, 0],
    stance: 'charge',
    stanceReadyTick: 0,
    holdP: 320_000,
    flagReadyTick: 0,
    research: { owned: [], cur: -1, startTick: 0, endTick: 0, paid: 0 },
    baseHp: BASE_HP_CENTI,
    baseMaxHp: BASE_HP_CENTI,
    lastStand: 'locked',
    retreated: false,
    callStrikeReadyTick: 0,
    fortReadyTick: 0,
  };
}

/** A `MatchConfig` over the fake content, player vs an AI-labeled bot. */
export function fakeMatchConfig(seed = 1): MatchConfig {
  return {
    seed,
    format: 'short',
    content: fakeContent,
    sides: [fakeSideConfig(), fakeSideConfig({ isBot: true })],
  };
}

export class FakeSim implements Sim {
  readonly state: SimState;
  readonly config: MatchConfig;
  /** Every command passed to `step`, in order. */
  readonly received: TimedCommand[] = [];
  private cursor = 0;
  private readonly events: readonly SimEvent[];

  constructor(o: { events?: readonly SimEvent[]; config?: MatchConfig } = {}) {
    this.events = [...(o.events ?? cannedBattleEvents)].sort((a, b) => a.tick - b.tick);
    this.config = o.config ?? fakeMatchConfig();
    this.state = {
      tick: 0,
      phase: 'regulation',
      sides: [sideState(), sideState()],
      units: [],
      projectiles: [],
      casts: [],
      traps: [],
      rng: [1, 2, 3, 4],
      nextId: 1,
      outcome: null,
      hashes: [],
    };
  }

  /** True once every canned event has been returned. */
  get done(): boolean {
    return this.cursor >= this.events.length;
  }

  step(cmds: readonly TimedCommand[]): readonly SimEvent[] {
    this.received.push(...cmds);
    const s = this.state;
    s.tick++;
    for (const u of s.units) u.prevX = u.x;
    const out: SimEvent[] = [];
    while (this.cursor < this.events.length) {
      const ev = this.events[this.cursor]!;
      if (ev.tick > s.tick) break;
      this.cursor++;
      const stamped: SimEvent = { ...ev, tick: s.tick };
      this.apply(stamped);
      out.push(stamped);
    }
    if (s.tick % 20 === 0) s.hashes.push(this.hash());
    return out;
  }

  /** FNV-1a over a few state fields; stable for the same stream, not the real B3 hash. */
  hash(): number {
    const s = this.state;
    let h = 0x811c9dc5;
    const mix = (n: number): void => {
      h = Math.imul(h ^ (n | 0), 0x01000193) >>> 0;
    };
    mix(s.tick);
    mix(s.units.length);
    for (const u of s.units) {
      mix(u.id);
      mix(u.x);
      mix(u.hp);
    }
    for (const side of s.sides) {
      mix(side.gold);
      mix(side.xp);
      mix(side.baseHp);
    }
    return h >>> 0;
  }

  observe(side: Side): Observation {
    const s = this.state;
    const me = s.sides[side];
    const foe = s.sides[side === 0 ? 1 : 0];
    const toP = (x: number): number => (side === 0 ? x : LANE_MILLI - x);
    const ages = Object.values(this.config.content.ages).sort((a, b) => a.index - b.index);
    const ageId = ages[me.ageIndex]?.id ?? 'stone';
    const loadout = this.config.sides[side].loadouts[ageId];
    const turretsOf = (st: SideState): Observation['me']['turrets'] =>
      st.turrets.map((t) => (t ? { card: t.card, age: t.age } : null));
    const hpBp = (st: SideState): number => Math.trunc((st.baseHp * 10000) / st.baseMaxHp);
    const picks = this.config.content.research.picks;
    const researchView = (st: SideState): Observation['me']['research'] => ({
      owned: st.research.owned.map((i) => picks[i]?.id ?? ''),
      current: st.research.cur >= 0 ? (picks[st.research.cur]?.id ?? null) : null,
      progressBp: 0,
      ranksOpen: 1,
    });
    return {
      tick: s.tick,
      side,
      phase: s.phase,
      ages: ages.map((a) => a.id),
      me: {
        gold: me.gold,
        xpBp: 0,
        ageIndex: me.ageIndex,
        queue: me.queue.map((q) => q.card),
        pop: me.pop,
        treasury: me.treasury,
        mountsOwned: me.mountsOwned,
        turrets: turretsOf(me),
        powers: {
          home: loadout?.powers.home ? { card: loadout.powers.home, ppm: me.powerPpm[0], cost: 100, reloadMs: 40000, rateBp: 10000 } : null,
          field: loadout?.powers.field ? { card: loadout.powers.field, ppm: me.powerPpm[1], cost: 100, reloadMs: 40000, rateBp: 10000 } : null,
        },
        powerLockoutUntil: 0,
        stance: me.stance,
        holdP: Math.trunc(me.holdP / 1000),
        research: researchView(me),
        baseHpBp: hpBp(me),
        lastStand: me.lastStand,
        tray: loadout ? [...loadout.units] : [],
        turretCards: loadout ? [...loadout.turrets] : [],
      },
      foe: {
        ageIndex: foe.ageIndex,
        xpBp: 0,
        powers: { home: { card: null, ppm: foe.powerPpm[0] }, field: { card: null, ppm: foe.powerPpm[1] } },
        turrets: turretsOf(foe),
        baseHpBp: hpBp(foe),
        stance: foe.stance,
        holdP: Math.trunc(foe.holdP / 1000),
        research: researchView(foe),
        treasury: foe.treasury,
        lastStand: foe.lastStand,
        scouted: [...new Set(s.units.filter((u) => u.side !== side).map((u) => u.card))],
      },
      telegraphs: [],
      units: s.units.map((u) => ({
        id: u.id,
        side: u.side,
        card: u.card,
        level: u.level,
        p: toP(u.x),
        hp: u.hp,
        maxHp: u.maxHp,
        shield: u.shield,
        air: u.air,
        summoned: u.summoned,
      })),
    };
  }

  private unit(id: number): UnitState | undefined {
    return this.state.units.find((u) => u.id === id);
  }

  private apply(ev: SimEvent): void {
    const s = this.state;
    switch (ev.e) {
      case 'unitSpawned': {
        const def = this.config.content.units[ev.card];
        const hp = (def?.hp ?? 100) * 100;
        s.units.push({
          id: ev.id, side: ev.side, card: ev.card, level: ev.level, x: ev.x, prevX: ev.x,
          hp, maxHp: hp, shield: 0, innateShield: 0, mode: 'walk', attacks: [], statuses: [],
          air: def?.tags.includes('air') ?? false, summoned: ev.summoned, timers: [], lastDamageTick: 0,
        });
        s.units.sort((a, b) => a.id - b.id);
        s.nextId = Math.max(s.nextId, ev.id + 1);
        if (!ev.summoned) s.sides[ev.side].pop += def ? this.config.content.economy.popByGroup[def.group] : 0;
        break;
      }
      case 'attackStarted': {
        const u = this.unit(ev.id);
        if (u) u.mode = 'attack';
        break;
      }
      case 'projectileFired':
        s.nextId = Math.max(s.nextId, ev.pid + 1);
        break;
      case 'hit': {
        const u = this.unit(ev.targetId);
        if (u) {
          u.hp = Math.max(0, u.hp - ev.damage);
          u.lastDamageTick = s.tick;
        }
        break;
      }
      case 'healed': {
        const u = this.unit(ev.id);
        if (u) u.hp = Math.min(u.maxHp, u.hp + ev.amount);
        break;
      }
      case 'knockback': {
        const u = this.unit(ev.id);
        if (u) u.x = ev.toX;
        break;
      }
      case 'died': {
        const u = this.unit(ev.id);
        if (u && !u.summoned) {
          const def = this.config.content.units[u.card];
          s.sides[u.side].pop -= def ? this.config.content.economy.popByGroup[def.group] : 0;
        }
        s.units = s.units.filter((x) => x.id !== ev.id);
        break;
      }
      case 'goldEarned':
        s.sides[ev.side].gold += ev.amount;
        break;
      case 'xpEarned':
        s.sides[ev.side].xp += ev.amount;
        break;
      case 'baseDamaged':
        s.sides[ev.side].baseHp = ev.hp;
        s.sides[ev.side].baseMaxHp = ev.maxHp;
        break;
      case 'turretBuildStart':
      case 'turretBuilt':
      case 'turretReplaced': {
        const def = this.config.content.turrets[ev.card];
        s.sides[ev.side].turrets[ev.mount] = {
          card: ev.card, age: def?.age ?? 'stone', level: 1,
          state: ev.e === 'turretBuilt' ? 'active' : 'building',
          readyTick: s.tick, attack: { targetId: -1, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 },
        };
        break;
      }
      case 'turretSold':
        s.sides[ev.side].turrets[ev.mount] = null;
        break;
      case 'mountBought':
        s.sides[ev.side].mountsOwned = ev.mount + 1;
        break;
      case 'treasuryUp':
        s.sides[ev.side].treasury = ev.level;
        break;
      case 'ascendStart':
        s.sides[ev.side].ascendUntil = s.tick + this.config.content.ticks.ascend;
        break;
      case 'ageUp':
        s.sides[ev.side].ageIndex = this.config.content.ages[ev.age].index;
        s.sides[ev.side].ascendUntil = 0;
        break;
      case 'powerReady':
        s.sides[ev.side].powerPpm[ev.slot === 'home' ? 0 : 1] = 1_000_000;
        break;
      case 'powerTelegraph':
        s.sides[ev.side].powerPpm[ev.slot === 'home' ? 0 : 1] = 0;
        break;
      case 'stanceChanged':
        s.sides[ev.side].stance = ev.stance;
        s.sides[ev.side].holdP = ev.holdP * 1000;
        break;
      case 'lastStandArmed':
        s.sides[ev.side].lastStand = 'armed';
        break;
      case 'lastStandCharge':
        s.sides[ev.side].lastStand = 'charging';
        break;
      case 'lastStandFire':
        s.sides[ev.side].lastStand = 'used';
        break;
      case 'phaseChanged':
        s.phase = ev.phase;
        break;
      case 'matchEnded':
        s.outcome = ev.result;
        s.phase = 'ended';
        if (ev.result.reason === 'retreat' && ev.result.winner !== null) {
          s.sides[ev.result.winner === 0 ? 1 : 0].retreated = true;
        }
        break;
      default:
        break;
    }
  }
}

/** Convenience: a fresh fake sim over the canned stream. */
export function createFakeSim(o?: { events?: readonly SimEvent[]; config?: MatchConfig }): FakeSim {
  return new FakeSim(o);
}

/** Runs a fake sim until its stream ends (or `maxTicks`) and returns every event. */
export function drainFakeSim(sim: FakeSim, maxTicks = 100_000): { events: SimEvent[]; outcome: MatchOutcome | null } {
  const events: SimEvent[] = [];
  for (let i = 0; i < maxTicks && !sim.done; i++) events.push(...sim.step([]));
  return { events, outcome: sim.state.outcome };
}
