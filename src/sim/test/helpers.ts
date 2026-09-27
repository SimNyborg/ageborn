/**
 * Test helpers for the sim: content, plans, configs and a deterministic scripted player.
 *
 * Unit tests and golden replays run on the frozen fixture content (tests/fixtures/content, compiled by
 * the sim's shim), so balance tuning in src/content/raw never breaks them (DESIGN B13).
 */
import type {
  AgeId,
  CardId,
  Command,
  CompiledContent,
  FormatId,
  Loadout,
  MatchConfig,
  Observation,
  Side,
  SideConfig,
  Sim,
  SimEvent,
  TimedCommand,
} from '@/contracts';
import { randInt, seedSfc32, type Sfc32State } from '@/core';
import { raw as fixtureRaw } from '../../../tests/fixtures/content';
import { createSim } from '../createSim';
import { compileForSim } from '../shim';

export const fixture: CompiledContent = compileForSim(fixtureRaw);

export const AGES: readonly AgeId[] = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];

/** Every unit card of an age (non-hidden), in table order. */
export function unitsOf(content: CompiledContent, age: AgeId): CardId[] {
  return Object.values(content.units)
    .filter((u) => u.age === age && !u.hidden)
    .map((u) => u.id);
}

export function turretsOf(content: CompiledContent, age: AgeId): CardId[] {
  return Object.values(content.turrets)
    .filter((t) => t.age === age)
    .map((t) => t.id);
}

function byGroup(content: CompiledContent, age: AgeId, group: string, rarity?: string): CardId | null {
  const u = Object.values(content.units).find((d) => d.age === age && d.group === group && !d.hidden && (!rarity || d.rarity === rarity));
  return u ? u.id : null;
}

function powerOf(content: CompiledContent, age: AgeId, slot: 'default' | 'alternate'): CardId {
  const p = Object.values(content.powers).find((d) => d.age === age && d.slot === slot);
  return p ? p.id : '';
}

/**
 * The A2.14 baseline loadout of an age: the 3 Commons, the AA Rare and the Support Rare, both Common
 * turrets and the default power. `swap` replaces a card by role group (units) or rarity (turrets).
 */
export function baselineLoadout(
  content: CompiledContent,
  age: AgeId,
  o: { epic?: boolean; legendary?: boolean; rareTurret?: boolean; epicTurret?: boolean; altPower?: boolean } = {},
): Loadout {
  const units = [
    byGroup(content, age, 'infantry', 'common'),
    byGroup(content, age, 'ranged', 'common'),
    byGroup(content, age, 'heavy', 'common'),
    byGroup(content, age, 'antiArmor'),
    byGroup(content, age, 'support'),
  ];
  if (o.epic) units[4] = byGroup(content, age, 'epic');
  if (o.legendary) units[o.epic ? 3 : 4] = byGroup(content, age, 'legendary');
  const t = Object.values(content.turrets).filter((d) => d.age === age);
  const commons = t.filter((d) => d.rarity === 'common').map((d) => d.id);
  const turrets: (CardId | null)[] = [commons[0] ?? null, commons[1] ?? null];
  if (o.rareTurret) turrets[0] = t.find((d) => d.rarity === 'rare')?.id ?? turrets[0] ?? null;
  if (o.epicTurret) turrets[1] = t.find((d) => d.rarity === 'epic')?.id ?? turrets[1] ?? null;
  return { units, turrets, power: powerOf(content, age, o.altPower ? 'alternate' : 'default') };
}

export function sideConfig(
  content: CompiledContent,
  o: { level?: number; label?: string; isBot?: boolean; loadouts?: Partial<Record<AgeId, Loadout>>; plan?: Parameters<typeof baselineLoadout>[2] } = {},
): SideConfig {
  const levels: Record<CardId, number> = {};
  for (const id of [...Object.keys(content.units), ...Object.keys(content.turrets)]) levels[id] = o.level ?? 1;
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const age of AGES) loadouts[age] = o.loadouts?.[age] ?? baselineLoadout(content, age, o.plan);
  return { label: o.label ?? 'Player', isBot: o.isBot ?? false, loadouts, levels, skins: {} };
}

export function matchConfig(o: Partial<MatchConfig> & { content?: CompiledContent } = {}): MatchConfig {
  const content = o.content ?? fixture;
  return {
    seed: o.seed ?? 1,
    format: o.format ?? 'full',
    content,
    sides: o.sides ?? [sideConfig(content), sideConfig(content, { label: 'AI Test', isBot: true })],
    ...(o.modifiers ? { modifiers: o.modifiers } : {}),
    ...(o.training ? { training: o.training } : {}),
  };
}

/**
 * A lane with no clock and no economy pressure, for rule tests: noClock, and the tick counter starts at
 * 0. Use the debug helpers to place units.
 */
export function arena(o: Partial<MatchConfig> = {}): Sim {
  return createSim(matchConfig({ training: { noClock: true }, ...o }));
}

/** Stamps commands for the next tick. */
export class Stamper {
  private seq: [number, number] = [0, 0];
  constructor(private readonly sim: Sim) {}
  stamp(cmds: readonly Command[]): TimedCommand[] {
    return cmds.map((c) => {
      this.seq[c.side] += 1;
      return { ...c, tick: this.sim.state.tick + 1, seq: this.seq[c.side] };
    });
  }
  /** Steps once with these commands. */
  step(...cmds: Command[]): readonly SimEvent[] {
    return this.sim.step(this.stamp(cmds));
  }
}

// ---------------------------------------------------------------------------------------------
// Scripted player (deterministic, observation only, like a bot).

export interface Strategy {
  /** Relative weight per tray slot. */
  weights: [number, number, number, number, number];
  /** Turrets to keep (mounts to fill). */
  turrets: number;
  /** Treasury levels to buy. */
  treasury: number;
  /** Save gold above this before training (whole gold). */
  reserve: number;
  /** Cast the power at once when ready (else only with 3+ enemy units near mid-lane). */
  powerAsap: boolean;
  /** Toggle to Hold while ahead in age and behind in army. */
  useHold: boolean;
  /** Decision cadence in ticks. */
  every: number;
  /** Issue some invalid or edge commands to exercise rejections. */
  noisy: boolean;
}

export const STRATEGIES: Record<string, Strategy> = {
  balanced: { weights: [4, 3, 2, 2, 1], turrets: 2, treasury: 1, reserve: 0, powerAsap: true, useHold: false, every: 10, noisy: false },
  rush: { weights: [6, 2, 1, 1, 0], turrets: 1, treasury: 0, reserve: 0, powerAsap: true, useHold: false, every: 5, noisy: false },
  turtle: { weights: [2, 4, 1, 2, 1], turrets: 4, treasury: 2, reserve: 50, powerAsap: false, useHold: true, every: 10, noisy: false },
  greedy: { weights: [2, 2, 3, 2, 2], turrets: 2, treasury: 3, reserve: 100, powerAsap: false, useHold: false, every: 15, noisy: false },
  heavy: { weights: [1, 2, 5, 2, 3], turrets: 2, treasury: 1, reserve: 0, powerAsap: true, useHold: false, every: 10, noisy: true },
};

export function scriptedPlayer(content: CompiledContent, side: Side, seed: number, strat: Strategy): (obs: Observation) => Command[] {
  const rng: Sfc32State = seedSfc32(`${seed}:${side}`);
  const econ = content.economy;
  let lastHoldToggle = -1000;
  return (obs) => {
    if (obs.tick % strat.every !== 0) return [];
    const out: Command[] = [];
    const me = obs.me;
    let gold = Math.trunc(me.gold / 1000);
    if (me.lastStand === 'armed') out.push({ t: 'lastStand', side });
    if (me.xpBp >= 10000 && me.ageIndex < 4) out.push({ t: 'evolve', side });
    if (me.powerPpm >= 1000000) {
      const near = obs.units.filter((u) => u.side !== side && u.p > 150000 && u.p < 1050000).length;
      if (strat.powerAsap || near >= 3) out.push({ t: 'power', side, ...(randInt(rng, 3) === 0 ? { p: 300 + randInt(rng, 600) } : {}) });
    }
    if (me.treasury < strat.treasury) {
      const cost = econ.treasuryCosts[me.treasury] ?? 99999;
      if (gold >= cost + strat.reserve) {
        out.push({ t: 'treasury', side });
        gold -= cost;
      }
    }
    // Turrets: modernise outdated ones, fill owned mounts, buy mounts up to the target.
    const owned = me.mountsOwned;
    for (let m = 0; m < owned; m += 1) {
      const t = me.turrets[m];
      const slot = randInt(rng, 2) as 0 | 1;
      const card = me.turretCards[slot];
      if (!card) continue;
      const cost = content.turrets[card]?.cost ?? 99999;
      if (!t && m < strat.turrets && gold >= cost) {
        out.push({ t: 'buildTurret', side, mount: m as 0 | 1 | 2 | 3, slot });
        gold -= cost;
      } else if (t && content.ages[t.age].index < me.ageIndex && gold >= cost) {
        out.push({ t: 'replaceTurret', side, mount: m as 0 | 1 | 2 | 3, slot });
        gold -= cost;
      }
    }
    if (owned < strat.turrets && owned < 4) {
      const cost = econ.mountCosts[owned] ?? 99999;
      if (gold >= cost + 50) {
        out.push({ t: 'buyMount', side });
        gold -= cost;
      }
    }
    if (strat.useHold && obs.tick - lastHoldToggle > 200) {
      const mine = obs.units.filter((u) => u.side === side).length;
      const theirs = obs.units.filter((u) => u.side !== side).length;
      const want = mine + 2 < theirs ? 'hold' : 'charge';
      if (want !== me.stance) {
        out.push({ t: 'stance', side, stance: want });
        lastHoldToggle = obs.tick;
      }
    }
    // Train by weighted slot choice.
    let tries = 3;
    while (tries > 0 && me.queue.length + out.filter((c) => c.t === 'train').length < 5) {
      tries -= 1;
      const weights = strat.weights.map((w, i) => (me.tray[i] ? w : 0));
      const total = weights.reduce((a, b) => a + b, 0);
      if (total === 0) break;
      let r = randInt(rng, total);
      let slot = 0;
      for (; slot < 5; slot += 1) {
        r -= weights[slot] as number;
        if (r < 0) break;
      }
      const card = me.tray[slot];
      const cost = card ? (content.units[card]?.cost ?? 99999) : 99999;
      if (gold >= cost + strat.reserve) {
        out.push({ t: 'train', side, slot: slot as 0 | 1 | 2 | 3 | 4 });
        gold -= cost;
      }
    }
    if (strat.noisy) {
      const n = randInt(rng, 40);
      if (n === 0) out.push({ t: 'cancelTrain', side });
      else if (n === 1) out.push({ t: 'emote', side, emote: 'gg' });
      else if (n === 2) out.push({ t: 'sellTurret', side, mount: randInt(rng, 4) as 0 | 1 | 2 | 3 });
      else if (n === 3) out.push({ t: 'cancelTrain', side, slot: randInt(rng, 5) as 0 | 1 | 2 | 3 | 4 });
      else if (n === 4) out.push({ t: 'evolve', side });
    }
    return out;
  };
}

export interface RunResult {
  sim: Sim;
  events: SimEvent[];
  ticks: number;
}

/**
 * Runs a match with two scripted players until it ends or `maxTicks`. Players read an undelayed
 * observation each tick (test only; the session delays bot observations).
 */
export function runMatch(
  cfg: MatchConfig,
  players: [(obs: Observation) => Command[], (obs: Observation) => Command[]],
  o: { maxTicks?: number; keepEvents?: boolean; onTick?: (sim: Sim, ev: readonly SimEvent[]) => void } = {},
): RunResult {
  const sim = createSim(cfg);
  const stamper = new Stamper(sim);
  const events: SimEvent[] = [];
  const max = o.maxTicks ?? 20000;
  while (!sim.state.outcome && sim.state.tick < max) {
    const cmds = [...players[0](sim.observe(0)), ...players[1](sim.observe(1))];
    const ev = sim.step(stamper.stamp(cmds));
    if (o.keepEvents) for (const e of ev) events.push(e);
    o.onTick?.(sim, ev);
  }
  return { sim, events, ticks: sim.state.tick };
}

export function formatOf(sim: Sim): FormatId {
  return sim.config.format;
}
