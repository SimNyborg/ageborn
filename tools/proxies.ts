/**
 * Scripted player proxies for the exploit tests (DESIGN B12 `sim:exploits`, A2.14, A2.10 exploit table).
 *
 * Each proxy is a deterministic `BotController` that plays like a human with one fixed habit:
 *
 * 1. `treasury_greed`: buys all 3 Treasury levels first.
 * 2. `turret_turtle`: 4 turrets with Hold (target: wins 35-45% against tier VII).
 * 3. `cheap_spam`: only ever trains the cheapest unit.
 * 4. `heavy_ranged`: Heavy plus mass Ranged, held back until the pop cap, then one push.
 * 5. `mass_splash`: Grenadier, Bronze Cannon, Radio Operator and every other splash card.
 * 6. `heal_stack`: healers behind a Heavy wall.
 * 7. `xp_bank`: banks XP to the cap before every evolve.
 * 8. `power_on_evolve`: saves the Age Power for the moment before each evolve.
 * 9. `random_spam`: a uniformly random affordable tray unit, no turrets, no Treasury, evolves at once,
 *    power on auto-aim when full (A16.5).
 * 10. `mono_heavy`, `mono_ranged`, `mono_antiair`: the mono family at m = 100% (A16.5): only that role
 *    group while the tray has one, otherwise random; no turrets, no Treasury.
 *
 * Human-like strategies for the AI strength matrix (`strength.ts`, owner feedback 2026-09-28):
 *
 * 11. `few_then_evolve`: a casual player who keeps a few soldiers on the lane (at most 4 alive), one
 *     turret, and evolves as soon as it can.
 * 12. `rush`: spends every coin at once on the strongest melee it can afford (Heavy, then Infantry),
 *     always Charges, no turrets, no Treasury.
 * 13. `save_counter`: A16.5's Save-and-counter, the skilled scripted player: counter-picks from the
 *     counter matrix against what it sees, banks to 300 gold and then spends it all (defends at once
 *     when threatened), 2 turrets, Treasury 1, casts the power on a zone worth 350+ gold, evolves in a
 *     safe window of at most 2 s, and fires Last Stand when 4+ enemies are at the gate.
 *
 * `balanced` is a plain reference player; the tools also use it as the stand-in bot when `src/ai`
 * cannot be loaded. Proxies see the same `Observation` as bots (A7.1) with a 300 ms reaction delay and
 * decide every 0.5 s, so they never outpace a human. Plans are derived from content by role and
 * ability, so the proxies follow content changes.
 */
import type { BotController, CardId, Command, CompiledContent, FormatId, Loadout, Observation, Side, UnitDef } from '../src/contracts';
import { pickWeighted, seedSfc32, type Sfc32State } from '../src/core/rng';
import { agesOf, baselinePlan, clonePlan, turretsOfAge, unitsOfAge, type Plan } from './lib/plans';

export type ProxyId =
  | 'balanced'
  | 'treasury_greed'
  | 'turret_turtle'
  | 'cheap_spam'
  | 'heavy_ranged'
  | 'mass_splash'
  | 'heal_stack'
  | 'xp_bank'
  | 'power_on_evolve'
  | 'random_spam'
  | 'mono_heavy'
  | 'mono_ranged'
  | 'mono_antiair'
  | 'few_then_evolve'
  | 'rush'
  | 'save_counter';

/** Mono family groups (A16.5): Heavy, anti-air and Ranged. */
export type MonoGroup = 'heavy' | 'antiAir' | 'ranged';

export interface Strategy {
  id: ProxyId;
  title: string;
  /** How the next unit is chosen (`melee`: the priciest affordable Heavy or Infantry; `counter`: counter-pick). */
  train: 'weighted' | 'cheapest' | 'heavyRanged' | 'random' | 'mono' | 'melee' | 'counter';
  /** `mono`: the role group trained. */
  mono?: MonoGroup;
  /** Power: `value` casts on a clump, `full` casts on auto-aim as soon as the ring is full. */
  /** Tray-slot weights for `weighted` training. */
  weights: [number, number, number, number, number];
  /** Treasury levels to buy. */
  treasury: number;
  /** Save for the Treasury before training (unless the base is threatened). */
  treasuryFirst: boolean;
  /** Mounts to fill with turrets. */
  turrets: number;
  modernise: boolean;
  stance: 'charge' | 'hold' | 'massThenCharge';
  evolve: 'asap' | 'bank';
  power: 'value' | 'beforeEvolve' | 'full';
  /** Whole gold kept back before training. */
  reserve: number;
  /** Trains only while fewer own (non-summoned) units than this are alive. */
  maxAlive?: number;
  /** Banks to this much gold, then spends it all (a wave); threats are answered at once. */
  bankTo?: number;
  /** `value` power: the zone must hold this much enemy value (whole gold); default: 3 units near mid. */
  powerMinValue?: number;
  /** Evolve waits up to this long for no enemy ground unit within 300 lu of the own gate. */
  safeEvolveMs?: number;
  /** Last Stand only when this many enemies are within 450 lu (default: whenever armed). */
  lastStandFoes?: number;
  plan(content: CompiledContent): Plan;
}

const TICKS_PER_DECISION = 10;
/** 300 ms, the reaction floor bots also respect (A7.3). */
export const PROXY_DELAY_TICKS = 6;
/** Enemy units this close to our gate (milli-lu) count as a threat. */
const THREAT_P = 450_000;
const CHARGED_PPM = 1_000_000;
/** The XP cap is 1.5× the threshold (A2.4); `xpBp` is XP in bp of the threshold. */
const BANK_XP_BP = 14_500;

const splashy = (u: UnitDef): boolean =>
  u.attacks.some((a) => (a.splashRadius ?? 0) > 0) || u.abilities.some((ab) => ab.kind === 'callStrike' || ab.kind === 'onDeathExplode');
const healer = (u: UnitDef): boolean => u.abilities.some((ab) => ab.kind === 'heal');

/** Puts `cards` into the loadout's unit slots `slots` (in order), skipping cards already present. */
function placeUnits(l: Loadout, cards: CardId[], slots: number[], keep: (id: CardId | null) => boolean): void {
  const free = slots.filter((s) => !keep(l.units[s] ?? null));
  for (const c of cards) {
    if (l.units.includes(c)) continue;
    const s = free.shift();
    if (s === undefined) return;
    l.units[s] = c;
  }
}

function splashPlan(content: CompiledContent): Plan {
  const plan = clonePlan(baselinePlan(content));
  for (const age of agesOf(content)) {
    const l = plan[age] as Loadout;
    const isSplash = (id: CardId | null): boolean => id !== null && content.units[id] !== undefined && splashy(content.units[id]);
    placeUnits(l, unitsOfAge(content, age).filter(splashy).map((u) => u.id), [4, 2], isSplash);
    const splashTurrets = turretsOfAge(content, age).filter((t) => (t.attack.splashRadius ?? 0) > 0);
    const [first, second] = splashTurrets;
    if (first && !l.turrets.includes(first.id)) l.turrets[1] = first.id;
    if (second && !l.turrets.includes(second.id)) l.turrets[0] = second.id;
  }
  return plan;
}

function healPlan(content: CompiledContent): Plan {
  const plan = clonePlan(baselinePlan(content));
  for (const age of agesOf(content)) {
    const l = plan[age] as Loadout;
    const heal = unitsOfAge(content, age).filter(healer).map((u) => u.id);
    placeUnits(l, heal, [4, 1], (id) => id !== null && content.units[id] !== undefined && healer(content.units[id]));
  }
  return plan;
}

const base = (content: CompiledContent): Plan => baselinePlan(content);

const BALANCED: Strategy = {
  id: 'balanced',
  title: 'Balanced reference player',
  train: 'weighted',
  weights: [4, 3, 2, 2, 1],
  treasury: 1,
  treasuryFirst: false,
  turrets: 2,
  modernise: true,
  stance: 'charge',
  evolve: 'asap',
  power: 'value',
  reserve: 0,
  plan: base,
};

export const STRATEGIES: Record<ProxyId, Strategy> = {
  balanced: BALANCED,
  treasury_greed: { ...BALANCED, id: 'treasury_greed', title: 'Treasury 3 greed', treasury: 3, treasuryFirst: true },
  turret_turtle: {
    ...BALANCED,
    id: 'turret_turtle',
    title: '4-turret turtle with Hold',
    weights: [2, 4, 1, 3, 1],
    turrets: 4,
    stance: 'hold',
    reserve: 50,
  },
  cheap_spam: { ...BALANCED, id: 'cheap_spam', title: 'Cheapest-unit spam', train: 'cheapest', treasury: 0, turrets: 1 },
  heavy_ranged: { ...BALANCED, id: 'heavy_ranged', title: 'Heavy plus mass Ranged at the pop cap', train: 'heavyRanged', stance: 'massThenCharge' },
  mass_splash: { ...BALANCED, id: 'mass_splash', title: 'Mass splash', weights: [2, 1, 3, 3, 3], plan: splashPlan },
  heal_stack: { ...BALANCED, id: 'heal_stack', title: 'Heal stacking', weights: [1, 1, 3, 1, 5], plan: healPlan },
  xp_bank: { ...BALANCED, id: 'xp_bank', title: 'XP bank and double evolve', evolve: 'bank' },
  power_on_evolve: { ...BALANCED, id: 'power_on_evolve', title: 'Power saved for evolve moments', power: 'beforeEvolve' },
  random_spam: { ...BALANCED, id: 'random_spam', title: 'Random spam', train: 'random', treasury: 0, turrets: 0, modernise: false, power: 'full' },
  mono_heavy: { ...BALANCED, id: 'mono_heavy', title: 'Mono Heavy spam', train: 'mono', mono: 'heavy', treasury: 0, turrets: 0, modernise: false, power: 'full' },
  mono_ranged: { ...BALANCED, id: 'mono_ranged', title: 'Mono Ranged spam', train: 'mono', mono: 'ranged', treasury: 0, turrets: 0, modernise: false, power: 'full' },
  mono_antiair: { ...BALANCED, id: 'mono_antiair', title: 'Mono anti-air spam', train: 'mono', mono: 'antiAir', treasury: 0, turrets: 0, modernise: false, power: 'full' },
  few_then_evolve: { ...BALANCED, id: 'few_then_evolve', title: 'A few soldiers, then evolve', treasury: 0, turrets: 1, maxAlive: 4 },
  rush: { ...BALANCED, id: 'rush', title: 'All-out melee rush', train: 'melee', treasury: 0, turrets: 0, modernise: false, power: 'full' },
  save_counter: {
    ...BALANCED,
    id: 'save_counter',
    title: 'Save-and-counter (skilled player)',
    train: 'counter',
    turrets: 2,
    treasury: 1,
    bankTo: 300,
    powerMinValue: 350,
    safeEvolveMs: 2000,
    lastStandFoes: 4,
  },
};

/** Whether a unit belongs to a mono family group (anti-air: any unit that hits air). */
export function inMonoGroup(u: UnitDef, g: MonoGroup): boolean {
  if (g === 'antiAir') return u.attacks.some((a) => a.hitsAir) && !u.tags.includes('air');
  if (g === 'heavy') return u.group === 'heavy';
  return u.group === 'ranged';
}

/** The exploit proxies of B12, in DESIGN order (the reference player excluded). */
export const EXPLOIT_PROXIES: readonly ProxyId[] = [
  'treasury_greed',
  'turret_turtle',
  'cheap_spam',
  'heavy_ranged',
  'mass_splash',
  'heal_stack',
  'xp_bank',
  'power_on_evolve',
  'random_spam',
  'mono_heavy',
];

/** Every other proxy the tools know (run with `--proxies`). */
export const EXTRA_PROXIES: readonly ProxyId[] = ['mono_ranged', 'mono_antiair', 'few_then_evolve', 'rush', 'save_counter'];

/** Enemy ground units this close to the own gate make an evolve unsafe (A7.2). */
const EVOLVE_SAFE_P = 300_000;
/** Last Stand radius (A2.11). */
const LAST_STAND_P = 450_000;

export function isProxyId(s: string): s is ProxyId {
  return Object.hasOwn(STRATEGIES, s);
}

/** A scripted player following one strategy. Deterministic for (strategy, side, seed). */
export class ScriptedPlayer implements BotController {
  readonly snapshotDelayTicks = PROXY_DELAY_TICKS;
  private readonly rng: Sfc32State;
  private readonly maxAgeIndex: number;
  private lastStanceTick = -1_000;
  private lastDecisionTick = -1;
  /** The observation lags, so recent orders are remembered to avoid repeating them. */
  private evolveIssuedTick = -1_000;
  private readonly mountBusyUntil: number[] = [0, 0, 0, 0];
  private readonly ascendWaitTicks: number;
  private readonly mountWaitTicks: number;
  private heavyTrained = 0;
  private rangedTrained = 0;
  /** `massThenCharge`: holding until the army nears the pop cap. */
  private massing = true;

  constructor(
    readonly strategy: Strategy,
    private readonly content: CompiledContent,
    private readonly side: Side,
    seed: number,
    format: FormatId,
  ) {
    this.rng = seedSfc32(`proxy:${strategy.id}:${seed}:${side}`);
    // Wait out the Ascension (or a turret build) plus the observation delay before acting on it again.
    this.ascendWaitTicks = content.ticks.ascend + PROXY_DELAY_TICKS + TICKS_PER_DECISION;
    this.mountWaitTicks = content.ticks.turretBuild + PROXY_DELAY_TICKS + TICKS_PER_DECISION;
    this.maxAgeIndex = content.formats[format].ages.length - 1;
  }

  onTick(obs: Observation): Command[] {
    // Decide every 0.5 s of game time, once per observation (while the delay ring fills, the same
    // oldest observation is handed over several times).
    if (obs.tick % TICKS_PER_DECISION !== 0 || obs.tick === this.lastDecisionTick) return [];
    this.lastDecisionTick = obs.tick;
    const st = this.strategy;
    const side = this.side;
    const econ = this.content.economy;
    const me = obs.me;
    const out: Command[] = [];
    let gold = Math.trunc(me.gold / 1000);
    const threat = obs.units.filter((u) => u.side !== side && u.p < THREAT_P).length >= 2;
    const nearMid = obs.units.filter((u) => u.side !== side && u.p > this.content.economy.powerZoneClamp[0] * 1000 && u.p < this.content.economy.powerZoneClamp[1] * 1000).length;

    if (me.lastStand === 'armed') out.push({ t: 'lastStand', side });

    // Evolve and power (A2.4, A2.9).
    const ascending = obs.tick - this.evolveIssuedTick < this.ascendWaitTicks;
    const canEvolve = !ascending && me.xpBp >= 10_000 && me.ageIndex < this.maxAgeIndex;
    const charged = me.powerPpm >= CHARGED_PPM;
    let evolveNow = canEvolve && (st.evolve === 'asap' || me.xpBp >= BANK_XP_BP);
    if (charged) {
      if (st.power === 'beforeEvolve' && me.ageIndex < this.maxAgeIndex) {
        if (evolveNow) {
          out.push({ t: 'power', side });
          evolveNow = false; // evolve on the next decision, after the cast
        }
      } else if (st.power === 'full' || nearMid >= 3 || threat) {
        out.push({ t: 'power', side });
      }
    }
    if (evolveNow) {
      out.push({ t: 'evolve', side });
      this.evolveIssuedTick = obs.tick;
    }

    // Treasury (A2.3). A Treasury-first player buys nothing else until it is maxed, and trains only
    // when the base is threatened.
    let greedy = false;
    if (me.treasury < st.treasury) {
      const cost = econ.treasuryCosts[me.treasury] ?? Number.POSITIVE_INFINITY;
      if (gold >= cost) {
        out.push({ t: 'treasury', side });
        gold -= cost;
      }
      if (st.treasuryFirst) {
        if (!threat) return out;
        greedy = true;
      }
    }

    // Turrets: build on owned empty mounts, modernise outdated ones, buy mounts (A2.8, A2.3).
    let boughtInfra = false;
    for (let m = 0; m < me.mountsOwned && m < 4 && !greedy; m += 1) {
      if (obs.tick < (this.mountBusyUntil[m] ?? 0)) continue;
      const t = me.turrets[m] ?? null;
      const slot = this.turretSlot(me.turretCards, m);
      if (slot === null) break;
      const card = me.turretCards[slot] as CardId;
      const cost = this.content.turrets[card]?.cost ?? Number.POSITIVE_INFINITY;
      if (t === null && m < st.turrets && gold >= cost) {
        out.push({ t: 'buildTurret', side, mount: m as 0 | 1 | 2 | 3, slot });
        gold -= cost;
        boughtInfra = true;
        this.mountBusyUntil[m] = obs.tick + this.mountWaitTicks;
      } else if (t !== null && st.modernise && this.content.ages[t.age].index < me.ageIndex) {
        const credit = Math.trunc(((this.content.turrets[t.card]?.cost ?? 0) * econ.sellRefundBp) / 10_000);
        const price = cost - credit;
        if (gold >= price) {
          out.push({ t: 'replaceTurret', side, mount: m as 0 | 1 | 2 | 3, slot });
          gold -= price;
          this.mountBusyUntil[m] = obs.tick + this.mountWaitTicks;
        }
      }
    }
    if (me.mountsOwned < st.turrets && me.mountsOwned < 4 && !greedy) {
      const cost = econ.mountCosts[me.mountsOwned] ?? Number.POSITIVE_INFINITY;
      if (gold >= cost + (threat ? 100 : 0)) {
        out.push({ t: 'buyMount', side });
        gold -= cost;
        boughtInfra = true;
      }
    }

    // Stance (A2.7, 2 s cooldown).
    const want = this.wantedStance(me.pop);
    if (want !== me.stance && obs.tick - this.lastStanceTick >= 60) {
      out.push({ t: 'stance', side, stance: want });
      this.lastStanceTick = obs.tick;
    }

    // Training (A2.7): fill the shared queue while gold allows, but save for the next turret or mount
    // the strategy wants unless the base is threatened.
    const saving = threat || boughtInfra ? 0 : this.infrastructureGoal(me);
    let queued = me.queue.length;
    for (let i = 0; i < 4 && queued < econ.queueMax; i += 1) {
      const slot = this.pickTrain(me.tray, gold);
      if (slot === null) break;
      const card = me.tray[slot] as CardId;
      const cost = this.content.units[card]?.cost ?? Number.POSITIVE_INFINITY;
      if (gold < cost + (threat ? 0 : st.reserve) + saving) break;
      out.push({ t: 'train', side, slot: slot as 0 | 1 | 2 | 3 | 4 });
      gold -= cost;
      queued += 1;
      const group = this.content.units[card]?.group;
      if (group === 'heavy' || group === 'legendary') this.heavyTrained += 1;
      if (group === 'ranged') this.rangedTrained += 1;
    }
    return out;
  }

  /** Gold to keep for the next wanted turret on an empty owned mount, or the next wanted mount. */
  private infrastructureGoal(me: Observation['me']): number {
    const want = Math.min(this.strategy.turrets, 4);
    for (let m = 0; m < Math.min(me.mountsOwned, want); m += 1) {
      if ((me.turrets[m] ?? null) !== null) continue;
      const slot = this.turretSlot(me.turretCards, m);
      const card = slot === null ? null : me.turretCards[slot];
      return card ? (this.content.turrets[card]?.cost ?? 0) : 0;
    }
    return me.mountsOwned < want ? (this.content.economy.mountCosts[me.mountsOwned] ?? 0) : 0;
  }

  private turretSlot(cards: readonly (CardId | null)[], mount: number): 0 | 1 | null {
    const pref = (mount % 2) as 0 | 1;
    if (cards[pref]) return pref;
    const alt = (1 - pref) as 0 | 1;
    return cards[alt] ? alt : null;
  }

  /** `massThenCharge` holds until the army is 6 pop short of the cap, pushes, and masses again below half. */
  private wantedStance(pop: number): 'charge' | 'hold' {
    const st = this.strategy.stance;
    if (st !== 'massThenCharge') return st;
    const cap = this.content.economy.popCap;
    if (this.massing && pop >= cap - 6) this.massing = false;
    else if (!this.massing && pop < cap / 2) this.massing = true;
    return this.massing ? 'hold' : 'charge';
  }

  private pickTrain(tray: readonly (CardId | null)[], gold: number): number | null {
    const slots = tray.map((c, i) => (c !== null && this.content.units[c] ? i : -1)).filter((i) => i >= 0);
    if (slots.length === 0) return null;
    const unit = (i: number): UnitDef => this.content.units[tray[i] as CardId] as UnitDef;
    switch (this.strategy.train) {
      case 'random': {
        // Uniform over the affordable units; nothing affordable waits for gold.
        const ok = slots.filter((i) => unit(i).cost <= gold);
        if (ok.length === 0) return null;
        return ok[pickWeighted(this.rng, ok.map(() => 1))] as number;
      }
      case 'mono': {
        const g = this.strategy.mono ?? 'heavy';
        const hit = slots.filter((i) => inMonoGroup(unit(i), g));
        const pool = hit.length > 0 ? hit : slots;
        return pool[pickWeighted(this.rng, pool.map(() => 1))] as number;
      }
      case 'cheapest': {
        let best = slots[0] as number;
        for (const i of slots) if (unit(i).cost < unit(best).cost) best = i;
        return best;
      }
      case 'heavyRanged': {
        const wantHeavy = this.heavyTrained * 3 < this.rangedTrained;
        const groups = wantHeavy ? ['heavy', 'legendary'] : ['ranged'];
        const hit = slots.find((i) => groups.includes(unit(i).group));
        return hit ?? (slots[0] as number);
      }
      default: {
        const w = slots.map((i) => this.strategy.weights[i] ?? 0);
        if (w.every((x) => x <= 0)) return slots[0] as number;
        return slots[pickWeighted(this.rng, w)] as number;
      }
    }
  }
}

/** A proxy controller for a side. */
export function createProxy(id: ProxyId, content: CompiledContent, side: Side, seed: number, format: FormatId): ScriptedPlayer {
  return new ScriptedPlayer(STRATEGIES[id], content, side, seed, format);
}
