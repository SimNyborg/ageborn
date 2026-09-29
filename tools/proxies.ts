/**
 * Scripted player proxies for the exploit tests (DESIGN B12 `sim:exploits`, A2.14, A2.10 exploit table).
 *
 * Each proxy is a deterministic `BotController` that plays like a human with one fixed habit:
 *
 * 1. `eco_greed`: the Economy track first (Granary, Market), saving for it before training (A18.12;
 *    the Treasury greed proxy before A18.5.4).
 * 2. `turret_turtle`: 4 turrets with Hold (target: wins 35-45% against tier VII).
 * 3. `cheap_spam`: only ever trains the cheapest unit.
 * 4. `heavy_ranged`: Heavy plus mass Ranged, held back until the pop cap, then one push.
 * 5. `mass_splash`: Grenadier, Bronze Cannon, Radio Operator and every other splash card.
 * 6. `heal_stack`: healers behind a Heavy wall.
 * 7. `xp_bank`: banks XP to the cap before every evolve.
 * 8. `power_on_evolve`: saves the Age Power for the moment before each evolve.
 * 9. `random_spam`: a uniformly random affordable tray unit, no turrets, no research, evolves at once,
 *    power on auto-aim when full (A16.5).
 * 10. `mono_heavy`, `mono_ranged`, `mono_antiair`: the mono family at m = 100% (A16.5): only that role
 *    group while the tray has one, otherwise random; no turrets, no research.
 *
 * Human-like strategies for the AI strength matrix (`strength.ts`, owner feedback 2026-09-28):
 *
 * 11. `few_then_evolve`: a casual player who keeps a few soldiers on the lane (at most 4 alive), one
 *     turret, and evolves as soon as it can.
 * 12. `rush`: spends every coin at once on the strongest melee it can afford (Heavy, then Infantry),
 *     always Charges, no turrets, no research.
 * 13. `save_counter`: A16.5's Save-and-counter, the skilled scripted player: counter-picks from the
 *     counter matrix against what it sees, banks to 300 gold and then spends it all (defends at once
 *     when threatened), 2 turrets, Granary and a Troops line, casts the power on a zone worth 350+ gold,
 *     evolves in a safe window of at most 2 s, and fires Last Stand when 4+ enemies are at the gate.
 *
 * War Council and stance proxies (A18.12):
 *
 * 14. `no_research`: the Balanced reference player without any research (must lose ≥ 70% to it).
 * 15. `drill_rush`: the melee rush with Infantry Weapons, Rush and War Horns.
 * 16. `tech_turtle`: Defences first, Hold at home, 4 turrets.
 * 17. `flag_ball`: Hold with the flag at 800 behind a Ranged, Support and Heavy ball (Bulwark, Rally,
 *     Shield Wall), charging only at the pop cap or in Siege.
 * 18. `fallback_turtle`: Fall back, 4 turrets, Defences research (Keep Walls and Last Stand Drill are v1.1).
 * 19. `stance_toggler`: the Balanced reference player that flips Charge and Hold on every engagement.
 *
 * `balanced` is a plain reference player; the tools also use it as the stand-in bot when `src/ai`
 * cannot be loaded. Proxies see the same `Observation` as bots (A7.1) with a 300 ms reaction delay and
 * decide every 0.5 s, so they never outpace a human. Plans are derived from content by role and
 * ability, so the proxies follow content changes.
 */
import type { BotController, CardId, Command, CompiledContent, FormatId, Loadout, Observation, ResearchPickDef, ResearchView, Side, StanceMode, UnitDef } from '../src/contracts';
import { nextIncomePick, researchCommand, researchCost, startablePicks } from '../src/core/research';
import { pickWeighted, seedSfc32, type Sfc32State } from '../src/core/rng';
import { agesOf, baselinePlan, clonePlan, turretsOfAge, unitsOfAge, type Plan } from './lib/plans';

export type ProxyId =
  | 'balanced'
  | 'eco_greed'
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
  | 'save_counter'
  | 'no_research'
  | 'drill_rush'
  | 'tech_turtle'
  | 'flag_ball'
  | 'fallback_turtle'
  | 'stance_toggler';

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
  /** Economy income research to buy: Granary, then Market (A18.5.4; the Treasury levels before). */
  income: number;
  /** Save for the income research before training (unless the base is threatened). */
  incomeFirst: boolean;
  /** War Council picks in preference order (A18.5): the first one that can start is researched when the slot is free. */
  research: readonly string[];
  /** No listed research before this match time (ms). */
  researchFromMs?: number;
  /** Mounts to fill with turrets. */
  turrets: number;
  modernise: boolean;
  /**
   * `hold` at `holdP` (default the 320 line), `fallback` (A18.4.2), `massThenCharge` holds until the pop
   * cap, `flagBall` holds at `holdP` and charges at the pop cap or in Siege, `toggle` flips Charge and Hold
   * on every engagement (the stance toggler).
   */
  stance: 'charge' | 'hold' | 'massThenCharge' | 'fallback' | 'flagBall' | 'toggle';
  /** Hold flag p in lu (A18.4.2: 320-800). */
  holdP?: number;
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

/**
 * The researching Balanced script (A18.12 reference): Granary first, then a Troops line for the classes
 * of the baseline plan, the Defences range pick and the rank II abilities as they open.
 */
const BALANCED_RESEARCH: readonly string[] = [
  'troops.infantry.weapons',
  'defences.watchtowers',
  'troops.heavy.plating',
  'troops.antiArmor.hunters',
  'troops.infantry.rush',
  'troops.heavy.trample',
  'economy.market',
  'troops.support.field_care',
  'troops.support.war_drums',
  'defences.arsenal',
  'troops.ranged.weapons',
];

const BALANCED: Strategy = {
  id: 'balanced',
  title: 'Balanced reference player (researching)',
  train: 'weighted',
  weights: [4, 3, 2, 2, 1],
  income: 1,
  incomeFirst: false,
  research: BALANCED_RESEARCH,
  researchFromMs: 30000,
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
  eco_greed: {
    ...BALANCED,
    id: 'eco_greed',
    title: 'Economy greed (Granary, Market, Bounty Hunters first)',
    income: 2,
    incomeFirst: true,
    research: ['economy.bounty_hunters', ...BALANCED_RESEARCH],
    researchFromMs: 0,
  },
  turret_turtle: {
    ...BALANCED,
    id: 'turret_turtle',
    title: '4-turret turtle with Hold',
    weights: [2, 4, 1, 3, 1],
    turrets: 4,
    stance: 'hold',
    reserve: 50,
  },
  cheap_spam: { ...BALANCED, id: 'cheap_spam', title: 'Cheapest-unit spam', train: 'cheapest', income: 0, research: [], turrets: 1 },
  heavy_ranged: { ...BALANCED, id: 'heavy_ranged', title: 'Heavy plus mass Ranged at the pop cap', train: 'heavyRanged', stance: 'massThenCharge' },
  mass_splash: { ...BALANCED, id: 'mass_splash', title: 'Mass splash', weights: [2, 1, 3, 3, 3], plan: splashPlan },
  heal_stack: { ...BALANCED, id: 'heal_stack', title: 'Heal stacking', weights: [1, 1, 3, 1, 5], plan: healPlan },
  xp_bank: { ...BALANCED, id: 'xp_bank', title: 'XP bank and double evolve', evolve: 'bank' },
  power_on_evolve: { ...BALANCED, id: 'power_on_evolve', title: 'Power saved for evolve moments', power: 'beforeEvolve' },
  random_spam: { ...BALANCED, id: 'random_spam', title: 'Random spam', train: 'random', income: 0, research: [], turrets: 0, modernise: false, power: 'full' },
  mono_heavy: { ...BALANCED, id: 'mono_heavy', title: 'Mono Heavy spam', train: 'mono', mono: 'heavy', income: 0, research: [], turrets: 0, modernise: false, power: 'full' },
  mono_ranged: { ...BALANCED, id: 'mono_ranged', title: 'Mono Ranged spam', train: 'mono', mono: 'ranged', income: 0, research: [], turrets: 0, modernise: false, power: 'full' },
  mono_antiair: { ...BALANCED, id: 'mono_antiair', title: 'Mono anti-air spam', train: 'mono', mono: 'antiAir', income: 0, research: [], turrets: 0, modernise: false, power: 'full' },
  few_then_evolve: { ...BALANCED, id: 'few_then_evolve', title: 'A few soldiers, then evolve', income: 0, research: [], turrets: 1, maxAlive: 4 },
  rush: { ...BALANCED, id: 'rush', title: 'All-out melee rush', train: 'melee', income: 0, research: [], turrets: 0, modernise: false, power: 'full' },
  save_counter: {
    ...BALANCED,
    id: 'save_counter',
    title: 'Save-and-counter (skilled player)',
    train: 'counter',
    turrets: 2,
    income: 1,
    research: ['troops.infantry.weapons', 'troops.antiArmor.hunters', 'defences.watchtowers', 'troops.heavy.plating', 'troops.infantry.rush', 'troops.antiArmor.skirmish'],
    researchFromMs: 30000,
    bankTo: 300,
    powerMinValue: 350,
    safeEvolveMs: 2000,
    lastStandFoes: 4,
  },
  no_research: { ...BALANCED, id: 'no_research', title: 'Balanced without research', income: 0, research: [] },
  drill_rush: {
    ...BALANCED,
    id: 'drill_rush',
    title: 'Drilled Infantry rush (Weapons, Rush, War Horns)',
    train: 'melee',
    income: 0,
    research: ['troops.infantry.weapons', 'command.war_horns', 'troops.infantry.rush', 'troops.heavy.weapons', 'troops.heavy.trample'],
    researchFromMs: 0,
    turrets: 0,
    modernise: false,
    power: 'full',
  },
  tech_turtle: {
    ...BALANCED,
    id: 'tech_turtle',
    title: 'Tech turtle (Defences first, Hold at home, 4 turrets)',
    weights: [2, 4, 1, 3, 1],
    turrets: 4,
    stance: 'hold',
    reserve: 50,
    research: ['defences.watchtowers', 'defences.arsenal', 'troops.ranged.long_draw', 'troops.antiArmor.hunters', 'troops.antiArmor.ambush', 'economy.market'],
    researchFromMs: 0,
  },
  flag_ball: {
    ...BALANCED,
    id: 'flag_ball',
    title: 'Flag ball (Hold at 800: Ranged, Support auras, Bulwark, Shield Wall)',
    weights: [2, 4, 3, 1, 3],
    stance: 'flagBall',
    holdP: 800,
    research: [
      'troops.ranged.weapons',
      'troops.support.field_care',
      'troops.support.rally',
      'troops.heavy.plating',
      'troops.heavy.bulwark',
      'troops.infantry.mail',
      'troops.infantry.shield_wall',
      'command.war_horns',
    ],
  },
  fallback_turtle: {
    ...BALANCED,
    id: 'fallback_turtle',
    title: 'Fall-back turtle (Fall back, 4 turrets, Defences)',
    weights: [2, 4, 1, 3, 1],
    turrets: 4,
    stance: 'fallback',
    reserve: 50,
    research: ['defences.quick_loaders', 'defences.arsenal', 'troops.ranged.long_draw', 'economy.market'],
    researchFromMs: 0,
  },
  stance_toggler: { ...BALANCED, id: 'stance_toggler', title: 'Stance toggler (flips on every engagement)', stance: 'toggle' },
};

/** Whether a unit belongs to a mono family group (anti-air: any unit that hits air). */
export function inMonoGroup(u: UnitDef, g: MonoGroup): boolean {
  if (g === 'antiAir') return u.attacks.some((a) => a.hitsAir) && !u.tags.includes('air');
  if (g === 'heavy') return u.group === 'heavy';
  return u.group === 'ranged';
}

/** The exploit proxies of B12, in DESIGN order (the reference player excluded). */
export const EXPLOIT_PROXIES: readonly ProxyId[] = [
  'eco_greed',
  'turret_turtle',
  'cheap_spam',
  'heavy_ranged',
  'mass_splash',
  'heal_stack',
  'xp_bank',
  'power_on_evolve',
  'random_spam',
  'mono_heavy',
  // A18.12
  'drill_rush',
  'tech_turtle',
  'flag_ball',
  'fallback_turtle',
  'stance_toggler',
];

/** Every other proxy the tools know (run with `--proxies`). */
export const EXTRA_PROXIES: readonly ProxyId[] = ['mono_ranged', 'mono_antiair', 'few_then_evolve', 'rush', 'save_counter', 'no_research'];

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
  /** `bankTo`: spending a banked wave (true) or saving up for the next one. */
  private spending = false;
  /** Tick Evolve was first seen available in the current age (`safeEvolveMs`). */
  private evolveSeenTick = -1;
  private evolveSeenAge = -1;

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
    this.maxAgeIndex = (content.formats[format]?.ages.length ?? 1) - 1;
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

    const foes = obs.units.filter((u) => u.side !== side && u.hp > 0);
    if (me.lastStand === 'armed' && foes.filter((u) => u.p <= LAST_STAND_P).length >= (st.lastStandFoes ?? 0)) out.push({ t: 'lastStand', side });

    // Evolve and power (A2.4, A2.9).
    const ascending = obs.tick - this.evolveIssuedTick < this.ascendWaitTicks;
    const canEvolve = !ascending && me.xpBp >= 10_000 && me.ageIndex < this.maxAgeIndex;
    if (!canEvolve || this.evolveSeenAge !== me.ageIndex) {
      this.evolveSeenTick = canEvolve ? obs.tick : -1;
      this.evolveSeenAge = canEvolve ? me.ageIndex : -1;
    }
    // A2.9.12: proxies are slot-aware: the Home slot casts where "the power" did, the Field slot by the
    // same trigger when equipped; a slot needs to be reloaded and affordable.
    const castable = (['home', 'field'] as const).filter((slot) => {
      const o = me.powers[slot];
      return o !== null && o.ppm >= CHARGED_PPM && gold >= o.cost;
    });
    let evolveNow = canEvolve && (st.evolve === 'asap' || me.xpBp >= BANK_XP_BP);
    if (evolveNow && st.safeEvolveMs !== undefined) {
      const unsafe = foes.some((u) => !u.air && u.p <= EVOLVE_SAFE_P);
      evolveNow = !unsafe || obs.tick - this.evolveSeenTick >= Math.trunc(st.safeEvolveMs / 50);
    }
    for (const slot of castable) {
      const card = me.powers[slot]?.card ?? '';
      if (st.power === 'beforeEvolve' && me.ageIndex < this.maxAgeIndex) {
        if (evolveNow) {
          out.push({ t: 'power', side, slot });
          gold -= me.powers[slot]?.cost ?? 0;
        }
      } else if (st.powerMinValue !== undefined) {
        const zone = this.bestZone(foes, card);
        if (zone.value >= st.powerMinValue) {
          out.push({ t: 'power', side, slot, p: zone.p });
          gold -= me.powers[slot]?.cost ?? 0;
        }
      } else if (st.power === 'full' || nearMid >= 3 || threat) {
        out.push({ t: 'power', side, slot });
        gold -= me.powers[slot]?.cost ?? 0;
      }
    }
    // Evolve on the next decision, after a cast made for it.
    if (st.power === 'beforeEvolve' && out.some((c) => c.t === 'power')) evolveNow = false;
    if (evolveNow) {
      out.push({ t: 'evolve', side });
      this.evolveIssuedTick = obs.tick;
    }

    // War Council (A18.5): the Economy income picks first (the Treasury before A18.5.4), then the
    // strategy's list. An income-first player buys nothing else until it has them, and trains only when
    // the base is threatened.
    let greedy = false;
    const wantIncome = me.treasury < st.income;
    const income = wantIncome ? nextIncomePick(this.content, me.research) : null;
    const listed = !wantIncome || !st.incomeFirst ? this.nextListed(me.research, obs.tick) : null;
    const pick = income ?? listed;
    if (pick) {
      const cost = researchCost(this.content, pick);
      if (gold >= cost + (income ? 0 : st.reserve)) {
        out.push(researchCommand(side, pick));
        gold -= cost;
      }
    }
    if (wantIncome && st.incomeFirst && me.research.current === null) {
      if (!threat) return out;
      greedy = true;
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

    // Stance (A18.4.2: 3 s cooldown; the Hold flag at `holdP`).
    const want = this.wantedStance(me.pop, obs);
    if (obs.tick - this.lastStanceTick >= 60) {
      const flag = want === 'hold' ? st.holdP : undefined;
      if (want !== me.stance || (flag !== undefined && flag !== me.holdP)) {
        out.push(flag === undefined ? { t: 'stance', side, mode: want } : { t: 'stance', side, mode: want, holdP: flag });
        this.lastStanceTick = obs.tick;
      }
    }

    // Training (A2.7): fill the shared queue while gold allows, but save for the next turret or mount
    // the strategy wants unless the base is threatened.
    const saving = threat || boughtInfra ? 0 : this.infrastructureGoal(me);
    let queued = me.queue.length;
    // `maxAlive`: a casual player keeps only a few soldiers on the lane.
    const alive = obs.units.filter((u) => u.side === side && u.hp > 0).length;
    const room = st.maxAlive === undefined ? econ.queueMax : st.maxAlive - alive - queued;
    // `bankTo`: save up a wave, then spend it all; a threat at the gate is answered at once.
    if (st.bankTo !== undefined) {
      if (gold >= st.bankTo + saving) this.spending = true;
      else if (gold < this.cheapestInTray(me.tray)) this.spending = false;
      if (!this.spending && !threat) return out;
    }
    for (let i = 0; i < 4 && queued < econ.queueMax && i < room; i += 1) {
      const slot = this.pickTrain(me.tray, gold, foes, threat);
      if (slot === null) break;
      const card = me.tray[slot] as CardId;
      const cost = this.content.units[card]?.cost ?? Number.POSITIVE_INFINITY;
      if (gold < cost + (threat ? 0 : st.reserve) + saving) break;
      out.push({ t: 'train', side, slot: slot as 0 | 1 | 2 | 3 | 4 | 5 });
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

  /**
   * `massThenCharge` and `flagBall` hold until the army is 6 pop short of the cap, push, and mass again
   * below half (`flagBall` also charges in Siege); `toggle` flips Charge and Hold whenever its front is in
   * a fight (an enemy within 120 lu of its frontmost ground unit).
   */
  private wantedStance(pop: number, obs: Observation): StanceMode {
    const st = this.strategy.stance;
    if (st === 'toggle') {
      const mine = obs.units.filter((u) => u.side === this.side && !u.air && u.hp > 0);
      const front = mine.reduce((m, u) => Math.max(m, u.p), -1);
      // Observation positions are in the observer's frame, enemies included (A2.1).
      const fighting = front >= 0 && obs.units.some((u) => u.side !== this.side && u.hp > 0 && !u.air && u.p - front <= 120_000);
      if (!fighting) return 'charge';
      return obs.me.stance === 'charge' ? 'hold' : 'charge';
    }
    if (st !== 'massThenCharge' && st !== 'flagBall') return st;
    if (st === 'flagBall' && obs.phase === 'siege') return 'charge';
    const cap = this.content.economy.popCap;
    if (this.massing && pop >= cap - 6) this.massing = false;
    else if (!this.massing && pop < cap / 2) this.massing = true;
    return this.massing ? 'hold' : 'charge';
  }

  /** The first pick of the strategy's research list that can start now (after `researchFromMs`). */
  private nextListed(view: ResearchView, tick: number): ResearchPickDef | null {
    if (tick * 50 < (this.strategy.researchFromMs ?? 0) || view.current !== null) return null;
    const open = startablePicks(this.content, view);
    for (const id of this.strategy.research) {
      const p = open.find((q) => q.id === id);
      if (p) return p;
    }
    return null;
  }

  private cheapestInTray(tray: readonly (CardId | null)[]): number {
    let min = Number.POSITIVE_INFINITY;
    for (const c of tray) {
      const u = c === null ? undefined : this.content.units[c];
      if (u && u.cost < min) min = u.cost;
    }
    return min;
  }

  /**
   * The best aim for the equipped power: the window of the power's zone (300 lu when it has none) that
   * holds the most enemy card value inside the power clamp. `p` is whole lu in the own frame.
   */
  private bestZone(foes: Observation['units'], power: CardId): { p: number; value: number } {
    const def = this.content.powers[power];
    const fx = def?.effect as { kind: string; zone?: number; width?: number } | undefined;
    const width = fx?.zone ?? fx?.width ?? 300;
    const [lo, hi] = this.content.economy.powerZoneClamp;
    let best = { p: Math.trunc((lo + hi) / 2), value: 0 };
    for (let p = lo; p <= hi; p += 20) {
      let v = 0;
      for (const u of foes) if (Math.abs(u.p / 1000 - p) <= width / 2) v += this.content.units[u.card]?.cost ?? 0;
      if (v > best.value) best = { p, value: v };
    }
    return best;
  }

  /** Counter score of a unit against the visible enemies (value-weighted, bp of the counter matrix). */
  private counterScore(card: CardId, foes: Observation['units']): number {
    let num = 0;
    let den = 0;
    for (const u of foes) {
      const w = this.content.units[u.card]?.cost ?? 0;
      const m = this.content.counters[card]?.[u.card] ?? 0.5;
      num += m * w;
      den += w;
    }
    return den > 0 ? num / den : 0.5;
  }

  private pickTrain(tray: readonly (CardId | null)[], gold: number, foes: Observation['units'] = [], threat = false): number | null {
    const slots = tray.map((c, i) => (c !== null && this.content.units[c] ? i : -1)).filter((i) => i >= 0);
    if (slots.length === 0) return null;
    const unit = (i: number): UnitDef => this.content.units[tray[i] as CardId] as UnitDef;
    switch (this.strategy.train) {
      case 'melee': {
        // The priciest affordable Heavy (or Legendary), else Infantry; nothing affordable waits for gold.
        const tiers: readonly (readonly UnitDef['group'][])[] = [['heavy', 'legendary', 'epic'], ['infantry']];
        for (const groups of tiers) {
          const ok = slots.filter((i) => groups.includes(unit(i).group) && unit(i).cost <= gold);
          if (ok.length > 0) return ok.reduce((a, b) => (unit(b).cost > unit(a).cost ? b : a));
        }
        const melee = slots.filter((i) => ['heavy', 'infantry'].includes(unit(i).group));
        const pool = melee.length > 0 ? melee : slots;
        return pool.reduce((a, b) => (unit(b).cost < unit(a).cost ? b : a));
      }
      case 'counter': {
        // Counter-pick against the enemies nearest the gate; with none in sight, a Balanced mix. The best
        // counter is saved for unless the gate is threatened (then the best affordable one).
        if (foes.length === 0) {
          const w = slots.map((i) => this.strategy.weights[i] ?? 0);
          return slots[pickWeighted(this.rng, w)] as number;
        }
        const near = [...foes].sort((a, b) => a.p - b.p).slice(0, 8);
        const pool = threat ? slots.filter((i) => unit(i).cost <= gold) : slots;
        if (pool.length === 0) return null;
        let best = pool[0] as number;
        let bestScore = -1;
        for (const i of pool) {
          const sc = this.counterScore(unit(i).id, near);
          if (sc > bestScore || (sc === bestScore && unit(i).cost > unit(best).cost)) {
            best = i;
            bestScore = sc;
          }
        }
        return best;
      }
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
