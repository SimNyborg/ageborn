/**
 * The 365-day economy sim (DESIGN B12 `sim:economy`, A6.9 pacing check).
 *
 * An engaged player, modelled through the `Meta` contract exactly as the app drives it: every day the
 * timers tick (04:00 reset), 7 ladder matches are finished at a 60% win rate (each claims a ready
 * Sundial Capsule, win or lose; the Sundial replaced capsule charges and the Supply Capsule on
 * 2026-09-30, A6.3, A15.4; until then the player played until 4 wins had used a charge and claimed the
 * Daily/Supply Capsule), Trophy Road nodes are claimed, every capsule and crate is opened, and cards are
 * upgraded (the active War Plan first, then the cheapest upgrade). Quests progress from each match's
 * `MatchStats`. A casual player (3 matches a day, over 730 days in a full-year run so every card
 * finishes) is run too and reported, not gated.
 *
 * `EconomyRecorder` (pure) turns what happened into the A6.9 measures; `economyChecks` compares them with
 * the table within ±20% and checks that the copy and Amber finish dates are less than 30 days apart.
 * The gate uses the median of `seeds` runs (30 by default: one seed is too noisy for a ±20% band).
 * Without `src/meta` (WP7) the tool writes a skipped report and exits 0.
 *
 * The capsule rules (the Sundial, the 7-tier ladder, the 200-slot bag, the Supply odds, the Legendary
 * catch-up) run through the real meta code; nothing here copies them.
 */
import type { AgeId, CardId, Clock, CompiledContent, FormatId, MatchStats, Meta, PendingCapsule, Rarity, Result, SaveDoc, Side } from '../src/contracts';
import { asContent, content as gameContent, isReleased, type Content } from '../src/content';
import { chanceBp, seedSfc32, type Sfc32State } from '../src/core/rng';
import { loadMeta } from './lib/modules';
import { mean, median } from './lib/stats';
import { fmtNum, infoCheck, markdownTable, rangeCheck, skippedCheck, startReport, type Check, type Report } from './report';

const DAY_MS = 86_400_000;
const fmtPct = (x: number): string => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : 'n/a');
const MONTH_DAYS = 30.44;
const YEAR_DAYS = 365.25;

/** A6.9 targets. Months are converted at 30.44 days. */
export const ECONOMY_TARGETS = {
  tolerance: 0.2,
  // The 2026-09-29 capsule ladder (owner: "keep today's time to max a card"): time-to-max targets are the
  // measured 100-seed medians of the model before the ladder (A6.9). The content re-tune (2026-10-04,
  // CONTENT_PLAN 8) keeps them for the 208-card pool and rebases the income rows on the all-ages table
  // (A6.4, Arena 3 and up, where the player spends nearly the whole year): before it, 16.0 copies and
  // 411 Amber per bag capsule and about 98 copies and 3,030 Amber a day for the 88-card pool.
  copiesPerBagCapsule: 38,
  // Amber re-tune (owner feedback 2026-10-07): capsule Amber ×0.65 on the all-ages table (×0.8 on the
  // Arena 1-2 table), so Amber is a real constraint beside copies: 710 Amber per bag capsule and ~5,150
  // a day before.
  amberPerBagCapsule: 460,
  // The Sundial (2026-09-30, A6.3): one every 5 h is 4.8 a day, all claimed by 7 matches; the 2-pip
  // Clay meter fills from the ladder matches that bring none (the Supply Capsule retired).
  sundialCapsulesPerDay: 4.8,
  clayCapsulesPerDay: 1.1,
  copiesPerDay: 240,
  amberPerDay: 3600,
  /**
   * Dust a day in the averaging window (days 11-120). Owner decision 2026-10-07: spare copies (beyond what
   * L10 needs) turn into Dust when their capsule opens, at 1 / 3 / 15 / 60 per copy, so Dust is back at
   * the ~470 a day it was before the years-long Amber curve (176 after it, when copies converted only at L10).
   */
  dustPerDay: 470,
  commonMaxDays: 110,
  rareMaxDays: 101,
  epicMaxDays: 69,
  legendaryMaxDays: 112,
  /** The casual player (3 matches a day) is reported, not gated: its matches per day. */
  casualMatchesPerDay: 3,
  /**
   * Days a full-year run gives the casual player: 3 matches a day do not max every card within 365
   * days (the per-rarity medians would read "not reached"), so it runs two years. Shorter smoke runs
   * keep their own length.
   */
  casualDays: 730,
  // Design targets (A6.9). The 2026-10-04 re-tune rebased them on the 208-card pool (CONTENT_PLAN 8):
  // all 16 Legendaries owned in about 3 weeks (8 in 2 before), the whole collection in about 7.25
  // months (5.25 before). The focused War Plan at L7 stays an open Phase 3 item (about 6 weeks wanted,
  // about 3 months measured before and after the content waves).
  allLegendariesDays: 21,
  planL7Days: 42,
  copiesDoneDays: 7.25 * MONTH_DAYS,
  // The years-long curve (owner decision 2026-10-07, A6.6): Amber is the last gate of the whole
  // collection, about 3.5 years for the A6.9 player (10 months after the first Amber re-tune, 7-7.5
  // months copy-gated before it). A 365-day run projects it from the Amber still missing at the run's end
  // and the last 60 days' Amber income (`amberDoneProjected`); a 1,500-day run checks the projection.
  amberDoneDays: 3.5 * YEAR_DAYS,
  /** "Whole collection maxed: ~3.5 years", Amber-gated (~10 months until the years-long curve, 2026-10-07). */
  collectionMaxedDays: 3.5 * YEAR_DAYS,
  /** Amber finishes at least 30 days after the copies: Amber, not copies, is the long goal (30-120 days until the years-long curve). */
  amberLagMinDays: 30,
  /** Amber gate: at least this share of days 11-120 ends with a copy-ready upgrade the Amber cannot pay. */
  amberBlockedShareMin: 0.75,
  // The War-Plan-only player (owner decision 2026-10-07): levels only its active War Plan's cards
  // (`focusAges` 8), the player who never ran short of Amber before the years-long curve.
  /** Days the War-Plan-only player is run in a full-year run (18 months, so the plan target can be seen). */
  planDays: 548,
  /** Every card of the active War Plan (48 unit slots and the turret slots filled as turrets drop) at L10: 12-18 months. */
  planMaxDays: [12 * MONTH_DAYS, 18 * MONTH_DAYS] as const,
  /** Days 10-364 that end with a copy-ready War Plan upgrade the Amber cannot pay ("you must save up"). */
  planBlockedShareMin: 0.75,
  /** An upgrade to L10 costs at least this many days of Amber income (median at the time it is bought): several days of saving. */
  topUpgradeDaysMin: 3,
  /** No upgrade costs more than this many days of Amber income at the time it is bought: each level stays reachable. */
  upgradeDaysMax: 14,
  /** The first week stays generous: the Amber backlog on day 7 is 1-7 days of Amber income. */
  week1BacklogDays: [1, 7] as const,
  /** The first War Plan's mean level on day 7 (3.65 before the re-tune: the cards you play keep their pace). */
  week1PlanLevelMin: 3.3,
} as const;

export interface EconomyModel {
  days: number;
  winRateBp: number;
  /** Finished ladder matches a day (A6.9: 7; each claims a ready Sundial Capsule, A6.3). */
  matchesPerDay: number;
  seed: number;
  /** Runs seeds `seed` .. `seed + seeds − 1` and gates on the median of each measure. */
  seeds: number;
  /** Days used for the per-day averages (steady state before the collection maxes out). */
  averageDays: [number, number];
  /**
   * Ladder lengths played, cycled match by match through each day (2026-10-07: trophies and Amber scale
   * with the length, A15.8). Empty: the arena's first length (Short War), the A6.9 player.
   */
  formats: readonly FormatId[];
  /**
   * Which cards the player levels: 0 = every card it owns (the collector, the A6.9 player); N = only the
   * War Plan's cards in its first N ages (a focused player: 3 for a Short War player, 8 for the whole
   * plan). Owner feedback 2026-10-07: players level the cards they play, so Amber must bind there too.
   */
  focusAges: number;
  /**
   * Days the War-Plan-only player (`focusAges` 8) runs beside the collector, gated by `planChecks`
   * (owner decision 2026-10-07); 0 skips it. Runs shorter than a year use their own length.
   */
  planDays: number;
}

export function economyDefaults(): EconomyModel {
  return { days: 365, winRateBp: 6000, matchesPerDay: 7, seed: 1, seeds: 30, averageDays: [11, 120], formats: [], focusAges: 0, planDays: ECONOMY_TARGETS.planDays };
}

/**
 * The mixed-length player (owner feedback 2026-10-07, reported beside the A6.9 player): 7 Ladder matches a
 * day, 3 Short, 2 Standard, 1 Long and 1 No clock (about 75 minutes a day at the A2.10 medians).
 */
export const MIXED_FORMATS: readonly FormatId[] = ['short', 'standard', 'short', 'full', 'short', 'standard', 'last'];

/**
 * The median of each measure over several runs. A milestone some runs never reach counts as later
 * than every reached day, so it is null when at least half the runs miss it.
 */
export function medianMeasures(list: readonly EconomyMeasures[]): EconomyMeasures {
  const first = list[0];
  if (!first) throw new Error('medianMeasures: no runs');
  if (list.length === 1) return first;
  const num = (f: (m: EconomyMeasures) => number): number => median(list.map(f));
  const day = (f: (m: EconomyMeasures) => number | null): number | null => {
    const xs = list.map((m) => f(m) ?? Number.POSITIVE_INFINITY).sort((a, b) => a - b);
    const hi = xs[Math.floor(xs.length / 2)] as number;
    const v = xs.length % 2 === 1 ? hi : ((xs[xs.length / 2 - 1] as number) + hi) / 2;
    return Number.isFinite(v) ? v : null;
  };
  return {
    days: first.days,
    copiesPerBagCapsule: num((m) => m.copiesPerBagCapsule),
    amberPerBagCapsule: num((m) => m.amberPerBagCapsule),
    perDay: {
      win: num((m) => m.perDay.win),
      daily: num((m) => m.perDay.daily),
      clay: num((m) => m.perDay.clay),
      copies: num((m) => m.perDay.copies),
      amber: num((m) => m.perDay.amber),
      dust: num((m) => m.perDay.dust),
      quests: num((m) => m.perDay.quests),
    },
    maxDay: {
      common: day((m) => m.maxDay.common),
      rare: day((m) => m.maxDay.rare),
      epic: day((m) => m.maxDay.epic),
      legendary: day((m) => m.maxDay.legendary),
    },
    dustTotal: num((m) => m.dustTotal),
    allLegendariesDay: day((m) => m.allLegendariesDay),
    cards100Day: day((m) => m.cards100Day),
    albumCompleteDay: day((m) => m.albumCompleteDay),
    maxed50Day: day((m) => m.maxed50Day),
    planL7Day: day((m) => m.planL7Day),
    levelMaxDay: {
      common: day((m) => m.levelMaxDay.common),
      rare: day((m) => m.levelMaxDay.rare),
      epic: day((m) => m.levelMaxDay.epic),
      legendary: day((m) => m.levelMaxDay.legendary),
    },
    amberGate: {
      blockedShare: num((m) => m.amberGate.blockedShare),
      blockedShareWeek1: num((m) => m.amberGate.blockedShareWeek1),
      blockedShareYear: num((m) => m.amberGate.blockedShareYear),
      backlogDays: {
        d7: num((m) => m.amberGate.backlogDays.d7),
        d30: num((m) => m.amberGate.backlogDays.d30),
        d90: num((m) => m.amberGate.backlogDays.d90),
      },
      bankDays: num((m) => m.amberGate.bankDays),
    },
    starter: {
      level7: num((m) => m.starter.level7),
      plan7: num((m) => m.starter.plan7),
      maxed7: num((m) => m.starter.maxed7),
      maxed30: num((m) => m.starter.maxed30),
      planMaxDay: day((m) => m.starter.planMaxDay),
    },
    planMaxDay: day((m) => m.planMaxDay),
    upgradeCost: {
      maxDays: num((m) => m.upgradeCost.maxDays),
      topMedianDays: num((m) => m.upgradeCost.topMedianDays),
      topMaxDays: num((m) => m.upgradeCost.topMaxDays),
    },
    copiesDoneDay: day((m) => m.copiesDoneDay),
    amberDoneDay: day((m) => m.amberDoneDay),
    collectionMaxedDay: day((m) => m.collectionMaxedDay),
    amberDoneProjected: day((m) => m.amberDoneProjected),
    collectionMaxedProjected: day((m) => m.collectionMaxedProjected),
  };
}

// ---------------------------------------------------------------------------------------------
// Recorder (pure).

export interface DayTotals {
  copies: number;
  amber: number;
  /** Dust earned (capsule bonus Dust, copies past L10, duplicate skins and items, road, quests, feats). */
  dust: number;
  capsules: Partial<Record<PendingCapsule['kind'], number>>;
  matches: number;
  wins: number;
  /** Quests claimed (daily and weekly). */
  quests: number;
}

export interface EconomyMeasures {
  days: number;
  copiesPerBagCapsule: number;
  amberPerBagCapsule: number;
  perDay: { win: number; daily: number; clay: number; copies: number; amber: number; dust: number; quests: number };
  /** Dust earned over the whole run (reported: Dust buys card copies, skins and items, A6.6). */
  dustTotal: number;
  /** Median day a card of each rarity has received the copies for L10 (null = never). */
  maxDay: Record<Rarity, number | null>;
  allLegendariesDay: number | null;
  /** Collection milestones (titles, 2026-10-04): 100 cards owned, every card owned, 50 cards at the cap. */
  cards100Day: number | null;
  albumCompleteDay: number | null;
  maxed50Day: number | null;
  planL7Day: number | null;
  /** Median day a card of each rarity actually reached L10 (copies and Amber both paid; null = never). */
  levelMaxDay: Record<Rarity, number | null>;
  /**
   * The Amber gate (owner feedback 2026-10-07): is Amber a real constraint beside the copies? Measured at
   * the end of each day, after the player upgraded everything it could.
   */
  amberGate: {
    /** Share of the averaging window's days that end with an upgrade the player has the copies for but not the Amber. */
    blockedShare: number;
    /** The same for days 0-6. */
    blockedShareWeek1: number;
    /** The same for days 10-364 (the War-Plan-only gate: "most days from day ~10"). */
    blockedShareYear: number;
    /** Amber for every upgrade the copies allow, at the end of day 7, 30 and 90, in days of Amber income (trailing 7 days). */
    backlogDays: { d7: number; d30: number; d90: number };
    /** Median end-of-day Amber balance over the averaging window, in days of Amber income. */
    bankDays: number;
  };
  /** The starter cards (owned in a new save) and the first War Plan's cards in the first week. */
  starter: {
    /** Mean level of the starter cards at the end of day 7. */
    level7: number;
    /** Mean level of the first War Plan's cards at the end of day 7. */
    plan7: number;
    /** Starter cards at L10 at the end of day 7 and day 30. */
    maxed7: number;
    maxed30: number;
    /** Day every card of the first War Plan reached L10. */
    planMaxDay: number | null;
  };
  /** Day every card of the active War Plan (units and turrets, as it is that day) is at L10. */
  planMaxDay: number | null;
  /**
   * What each upgrade cost in days of Amber income at the time (trailing 7 days): the most expensive
   * upgrade of the run, and the median and largest upgrade to L10 (NaN while none was bought).
   */
  upgradeCost: { maxDays: number; topMedianDays: number; topMaxDays: number };
  copiesDoneDay: number | null;
  amberDoneDay: number | null;
  collectionMaxedDay: number | null;
  /**
   * `amberDoneDay`, or, when the run ended first, its projection: the last day plus the Amber still
   * missing divided by the last 60 days' mean Amber income. Null when no Amber came in at the end.
   */
  amberDoneProjected: number | null;
  /** `collectionMaxedDay`, or, once the copies are done, the later of the copies and `amberDoneProjected`. */
  collectionMaxedProjected: number | null;
}

/** Collects per-day totals and per-card milestones. Feed it in day order. */
export class EconomyRecorder {
  readonly totals: DayTotals[] = [];
  private readonly received = new Map<CardId, number>();
  private readonly copiesDone = new Map<CardId, number>();
  private readonly owned = new Map<CardId, number>();
  private readonly maxed = new Map<CardId, number>();
  private amberSum = 0;
  private amberDone: number | null = null;
  private planL7: number | null = null;
  private winCaps = 0;
  private winCopies = 0;
  private winAmber = 0;
  /** End-of-day Amber balance and the Amber of every copy-ready upgrade, by day. */
  private readonly gates: { bank: number; backlog: number }[] = [];
  private starterCards: CardId[] = [];
  private firstPlan: CardId[] = [];
  private readonly levelsByDay: ReadonlyMap<CardId, number>[] = [];
  private firstPlanMax: number | null = null;
  private planMax: number | null = null;
  /** Every upgrade bought: its day, the level it reached and its Amber. */
  private readonly upgrades: { day: number; level: number; amber: number }[] = [];
  private readonly cap: number;
  private readonly cards: { id: CardId; rarity: Rarity; need: number; age: AgeId }[];
  private readonly amberNeed: number;

  constructor(content: CompiledContent) {
    const c = asContent(content);
    this.cap = content.economy.maxLevel;
    const need = (r: Rarity): number => c.rarities.cards[r].upgradeCopies.reduce((a, b) => a + b, 0);
    // Unreleased cards (the release gate) never drop, so they never count toward a milestone.
    this.cards = [
      // Cards held back by the release gate (`released: false`) never drop, so they are not part of the collection.
      ...Object.values(c.units)
        .filter((u) => u.hidden !== true && isReleased(c, u.id))
        .map((u) => ({ id: u.id, rarity: u.rarity, need: need(u.rarity), age: u.age })),
      ...Object.values(c.turrets)
        .filter((t) => isReleased(c, t.id))
        .map((t) => ({ id: t.id, rarity: t.rarity as Rarity, need: need(t.rarity), age: t.age })),
    ];
    this.amberNeed = this.cards.length * c.rarities.upgradeAmber.reduce((a, b) => a + b, 0);
  }

  private today(day: number): DayTotals {
    while (this.totals.length <= day) this.totals.push({ copies: 0, amber: 0, dust: 0, capsules: {}, matches: 0, wins: 0, quests: 0 });
    return this.totals[day] as DayTotals;
  }

  match(day: number, won: boolean): void {
    const t = this.today(day);
    t.matches += 1;
    if (won) t.wins += 1;
  }

  /** A claimed quest (its rewards arrive through `amber` and `capsule`). */
  quest(day: number): void {
    this.today(day).quests += 1;
  }

  amber(day: number, amount: number): void {
    this.today(day).amber += amount;
    this.amberSum += amount;
    if (this.amberDone === null && this.amberSum >= this.amberNeed) this.amberDone = day;
  }

  dust(day: number, amount: number): void {
    this.today(day).dust += amount;
  }

  /**
   * An opened capsule: its kind, whether it came from the bag, its stacks and its Amber (the Amber only
   * feeds the per-capsule average; income is counted by `amber` from currency changes).
   */
  capsule(day: number, kind: PendingCapsule['kind'], fromBag: boolean, stacks: readonly { card: CardId; copies: number }[], amber: number): void {
    const t = this.today(day);
    t.capsules[kind] = (t.capsules[kind] ?? 0) + 1;
    let copies = 0;
    for (const s of stacks) {
      copies += s.copies;
      const got = (this.received.get(s.card) ?? 0) + s.copies;
      this.received.set(s.card, got);
      const card = this.cards.find((c) => c.id === s.card);
      if (card && got >= card.need && !this.copiesDone.has(s.card)) this.copiesDone.set(s.card, day);
    }
    t.copies += copies;
    if (fromBag) {
      this.winCaps += 1;
      this.winCopies += copies;
      this.winAmber += amber;
    }
  }

  /** An upgrade bought on `day` that took a card to `level` for `amber`. */
  upgrade(day: number, level: number, amber: number): void {
    this.today(day);
    this.upgrades.push({ day, level, amber });
  }

  /** The cards a new save owns (the starter cards). */
  starter(cards: readonly CardId[]): void {
    this.starterCards = [...cards];
  }

  /**
   * End-of-day Amber state, after the day's upgrades: the balance and the Amber every upgrade the copies
   * already allow would cost (more than zero means Amber, not copies, held an upgrade back).
   */
  gate(day: number, bank: number, backlog: number): void {
    this.today(day);
    while (this.gates.length <= day) this.gates.push({ bank: 0, backlog: 0 });
    this.gates[day] = { bank, backlog };
  }

  /** End-of-day collection state (owned and maxed cards, the plan at L7). */
  snapshot(day: number, levels: ReadonlyMap<CardId, number>, planCards: readonly CardId[], maxLevel: number): void {
    this.today(day);
    if (this.firstPlan.length === 0 && planCards.length > 0) this.firstPlan = [...planCards];
    if (day === 7 || day === 30) this.levelsByDay[day] = new Map(levels);
    if (this.firstPlan.length > 0 && this.firstPlanMax === null && this.firstPlan.every((c) => (levels.get(c) ?? 0) >= maxLevel)) this.firstPlanMax = day;
    if (planCards.length > 0 && this.planMax === null && planCards.every((c) => (levels.get(c) ?? 0) >= maxLevel)) this.planMax = day;
    for (const [id, lvl] of levels) {
      if (lvl >= 1 && !this.owned.has(id)) this.owned.set(id, day);
      if (lvl >= maxLevel && !this.maxed.has(id)) this.maxed.set(id, day);
    }
    if (this.planL7 === null && planCards.length > 0 && planCards.every((c) => (levels.get(c) ?? 0) >= 7)) this.planL7 = day;
  }

  measures(avg: [number, number]): EconomyMeasures {
    const [a, b] = avg;
    const span = this.totals.slice(a, b + 1);
    const perDay = (f: (t: DayTotals) => number): number => mean(span.map(f));
    const byRarity = (r: Rarity): number | null => {
      const days = this.cards.filter((c) => c.rarity === r).map((c) => this.copiesDone.get(c.id));
      if (days.some((d) => d === undefined)) return null;
      return median(days as number[]);
    };
    const legendaries = this.cards.filter((c) => c.rarity === 'legendary');
    const allOwned = legendaries.every((c) => this.owned.has(c.id)) ? Math.max(...legendaries.map((c) => this.owned.get(c.id) as number)) : null;
    const copiesDone = this.cards.every((c) => this.copiesDone.has(c.id)) ? Math.max(...this.cards.map((c) => this.copiesDone.get(c.id) as number)) : null;
    const maxedAll = this.cards.every((c) => this.maxed.has(c.id)) ? Math.max(...this.cards.map((c) => this.maxed.get(c.id) as number)) : null;
    const ownedDays = this.cards.map((c) => this.owned.get(c.id)).filter((d): d is number => d !== undefined).sort((a, b) => a - b);
    const maxedDays = this.cards.map((c) => this.maxed.get(c.id)).filter((d): d is number => d !== undefined).sort((a, b) => a - b);
    const levelByRarity = (r: Rarity): number | null => {
      const days = this.cards.filter((c) => c.rarity === r).map((c) => this.maxed.get(c.id));
      if (days.some((d) => d === undefined)) return null;
      return median(days as number[]);
    };
    // Amber income per day over the 7 days up to `day` (the first days count from day 0).
    const income7 = (day: number): number => {
      const from = Math.max(0, day - 6);
      const xs = this.totals.slice(from, day + 1).map((t) => t.amber);
      return xs.length ? Math.max(1, mean(xs)) : 1;
    };
    const backlogDays = (day: number): number => {
      const g = this.gates[day];
      return g ? g.backlog / income7(day) : Number.NaN;
    };
    const blocked = (from: number, to: number): number => {
      const span = this.gates.slice(from, to + 1);
      return span.length ? span.filter((g) => g.backlog > 0).length / span.length : Number.NaN;
    };
    const bankSpan = this.gates.slice(a, b + 1).map((g, i) => g.bank / income7(a + i));
    const costDays = this.upgrades.map((u) => ({ level: u.level, days: u.amber / income7(u.day) }));
    const top = costDays.filter((u) => u.level >= this.cap).map((u) => u.days);
    // The whole collection's Amber, projected past the run's end at the last 60 days' income.
    const last = this.totals.slice(-60);
    const lastRate = last.length ? mean(last.map((t) => t.amber)) : 0;
    const amberProjected = this.amberDone ?? (lastRate > 0 ? this.totals.length - 1 + Math.ceil((this.amberNeed - this.amberSum) / lastRate) : null);
    const levelsAt = (day: number, ids: readonly CardId[]): number[] => ids.map((id) => this.levelsByDay[day]?.get(id) ?? 0);
    const atCap = (lv: number[]): number => lv.filter((l) => l >= this.cap).length;
    return {
      days: this.totals.length,
      copiesPerBagCapsule: this.winCaps ? this.winCopies / this.winCaps : Number.NaN,
      amberPerBagCapsule: this.winCaps ? this.winAmber / this.winCaps : Number.NaN,
      perDay: {
        win: perDay((t) => t.capsules.win ?? 0),
        daily: perDay((t) => t.capsules.daily ?? 0),
        clay: perDay((t) => t.capsules.meter ?? 0),
        copies: perDay((t) => t.copies),
        amber: perDay((t) => t.amber),
        dust: perDay((t) => t.dust),
        quests: perDay((t) => t.quests),
      },
      dustTotal: this.totals.reduce((n, t) => n + t.dust, 0),
      maxDay: { common: byRarity('common'), rare: byRarity('rare'), epic: byRarity('epic'), legendary: byRarity('legendary') },
      allLegendariesDay: allOwned,
      cards100Day: ownedDays.length >= 100 ? (ownedDays[99] as number) : null,
      albumCompleteDay: ownedDays.length === this.cards.length ? (ownedDays[ownedDays.length - 1] as number) : null,
      maxed50Day: maxedDays.length >= 50 ? (maxedDays[49] as number) : null,
      planL7Day: this.planL7,
      levelMaxDay: { common: levelByRarity('common'), rare: levelByRarity('rare'), epic: levelByRarity('epic'), legendary: levelByRarity('legendary') },
      amberGate: {
        blockedShare: blocked(a, b),
        blockedShareWeek1: blocked(0, 6),
        blockedShareYear: blocked(10, 364),
        backlogDays: { d7: backlogDays(7), d30: backlogDays(30), d90: backlogDays(90) },
        bankDays: bankSpan.length ? median(bankSpan) : Number.NaN,
      },
      starter: {
        level7: this.levelsByDay[7] && this.starterCards.length ? mean(levelsAt(7, this.starterCards)) : Number.NaN,
        plan7: this.levelsByDay[7] && this.firstPlan.length ? mean(levelsAt(7, this.firstPlan)) : Number.NaN,
        maxed7: this.levelsByDay[7] ? atCap(levelsAt(7, this.starterCards)) : Number.NaN,
        maxed30: this.levelsByDay[30] ? atCap(levelsAt(30, this.starterCards)) : Number.NaN,
        planMaxDay: this.firstPlanMax,
      },
      planMaxDay: this.planMax,
      upgradeCost: {
        maxDays: costDays.length ? Math.max(...costDays.map((u) => u.days)) : Number.NaN,
        topMedianDays: top.length ? median(top) : Number.NaN,
        topMaxDays: top.length ? Math.max(...top) : Number.NaN,
      },
      copiesDoneDay: copiesDone,
      amberDoneDay: this.amberDone,
      collectionMaxedDay: maxedAll,
      amberDoneProjected: amberProjected,
      collectionMaxedProjected: maxedAll ?? (copiesDone !== null && amberProjected !== null ? Math.max(copiesDone, amberProjected) : null),
    };
  }
}

/** A6.9 checks: each measure within ±20% of the table; the finish-date gap under 30 days. */
export function economyChecks(m: EconomyMeasures): Check[] {
  const T = ECONOMY_TARGETS;
  const near = (id: string, metric: string, value: number | null, want: number, unit: string): Check => {
    const v = value ?? Number.NaN;
    return rangeCheck(id, metric, v, want * (1 - T.tolerance), want * (1 + T.tolerance), {
      target: `~${fmtNum(want, want < 10 ? 1 : 0)} ${unit} ± 20%`,
      show: (x) => (Number.isFinite(x) ? `${fmtNum(x, x < 10 ? 2 : 0)} ${unit}` : 'not reached'),
    });
  };
  const lag = m.copiesDoneDay !== null && m.amberDoneProjected !== null ? m.amberDoneProjected - m.copiesDoneDay : Number.NaN;
  const days = (x: number): string => (Number.isFinite(x) ? `${fmtNum(x, x < 10 ? 1 : 0)} days` : 'not reached');
  const projected = (reached: number | null): string => (reached === null ? ' (projected past the run)' : '');
  const years = (x: number | null): string => (x === null ? 'not reached' : `${fmtNum(x, 0)} days (${fmtNum(x / YEAR_DAYS, 1)} years)`);
  return [
    near('economy.copiesPerBag', 'Copies per bag capsule', m.copiesPerBagCapsule, T.copiesPerBagCapsule, 'copies'),
    near('economy.amberPerBag', 'Amber per bag capsule', m.amberPerBagCapsule, T.amberPerBagCapsule, 'Amber'),
    near('economy.sundialPerDay', 'Sundial Capsules per day', m.perDay.win, T.sundialCapsulesPerDay, '/day'),
    near('economy.clayPerDay', 'Clay meter capsules per day', m.perDay.clay, T.clayCapsulesPerDay, '/day'),
    // Retired 2026-09-30 (A15.4): a new save never has an allowance, so this reads 0.
    infoCheck('economy.supplyPerDay', 'Supply Capsules per day (retired; old allowances only)', `${fmtNum(m.perDay.daily, 2)} /day`),
    near('economy.copiesPerDay', 'Daily income: copies', m.perDay.copies, T.copiesPerDay, 'copies/day'),
    near('economy.amberPerDay', 'Daily income: Amber', m.perDay.amber, T.amberPerDay, 'Amber/day'),
    near('economy.commonMax', 'Common to max (median card)', m.maxDay.common, T.commonMaxDays, 'days'),
    near('economy.rareMax', 'Rare to max (median card)', m.maxDay.rare, T.rareMaxDays, 'days'),
    near('economy.epicMax', 'Epic to max (median card)', m.maxDay.epic, T.epicMaxDays, 'days'),
    near('economy.legendaryMax', 'Legendary to max (median card)', m.maxDay.legendary, T.legendaryMaxDays, 'days'),
    near('economy.allLegendaries', 'All Legendaries owned', m.allLegendariesDay, T.allLegendariesDays, 'days'),
    near('economy.planL7', 'Focused War Plan at L7', m.planL7Day, T.planL7Days, 'days'),
    near('economy.copiesDone', 'Copies for the whole collection', m.copiesDoneDay, T.copiesDoneDays, 'days'),
    near('economy.amberDone', `Amber for the whole collection (every released card × the A6.6 Amber row)${projected(m.amberDoneDay)}`, m.amberDoneProjected, T.amberDoneDays, 'days'),
    near('economy.collectionMaxed', `Whole collection maxed${projected(m.collectionMaxedDay)}`, m.collectionMaxedProjected, T.collectionMaxedDays, 'days'),
    rangeCheck('economy.amberLag', 'Amber finishes after the copies (Amber done minus copies done)', lag, T.amberLagMinDays, Number.POSITIVE_INFINITY, { target: `≥ ${T.amberLagMinDays} days`, show: days }),
    infoCheck('economy.collectionYears', 'Whole collection maxed, in years (Amber-gated; projected when the run ends first)', years(m.collectionMaxedProjected)),
    // The Amber gate (owner feedback 2026-10-07): Amber decides which card to upgrade, from the first week on.
    rangeCheck('economy.amberBlocked', 'Days 11-120 ending with a copy-ready upgrade the Amber cannot pay', m.amberGate.blockedShare, T.amberBlockedShareMin, 1, { target: `≥ ${Math.round(T.amberBlockedShareMin * 100)}%`, show: fmtPct }),
    rangeCheck('economy.week1Backlog', 'Amber for every copy-ready upgrade on day 7, in days of Amber income', m.amberGate.backlogDays.d7, T.week1BacklogDays[0], T.week1BacklogDays[1], { target: `${T.week1BacklogDays[0]}-${T.week1BacklogDays[1]} days`, show: days }),
    rangeCheck('economy.week1Plan', 'First War Plan: mean card level on day 7', m.starter.plan7, T.week1PlanLevelMin, Number.POSITIVE_INFINITY, { target: `≥ L${T.week1PlanLevelMin}`, show: (x) => (Number.isFinite(x) ? `L${fmtNum(x, 2)}` : 'n/a') }),
    // The collection milestones (titles, 2026-10-04) are reported, not gated.
    infoCheck(
      'economy.milestones',
      'Collection milestones: 100 cards owned, every card owned, 50 cards maxed, everything maxed',
      [m.cards100Day, m.albumCompleteDay, m.maxed50Day, m.collectionMaxedDay].map((x) => (x === null ? 'not reached' : `day ${x}`)).join(' / '),
    ),
    // Dust (owner decision 2026-10-07, A6.6 surplus rule): gated a day in the window, the run's total reported.
    near('economy.dustPerDay', 'Dust a day (spare copies at reveal, capsule bonus Dust, road, quests, feats)', m.perDay.dust, T.dustPerDay, '/day'),
    infoCheck('economy.dust', 'Dust earned: a day (averaging window) and over the whole run', `${fmtNum(m.perDay.dust, 0)} /day; ${fmtNum(m.dustTotal, 0)} in ${m.days} days`),
    // The Amber gate (owner feedback 2026-10-07), reported: how often Amber, not copies, holds an upgrade back.
    infoCheck(
      'economy.amberGate',
      'Amber gate: days ending with a copy-ready upgrade the Amber cannot pay (window / days 0-6); that backlog on day 7 / 30 / 90 and the median bank, in days of Amber income',
      `${fmtPct(m.amberGate.blockedShare)} / ${fmtPct(m.amberGate.blockedShareWeek1)}; backlog ${[m.amberGate.backlogDays.d7, m.amberGate.backlogDays.d30, m.amberGate.backlogDays.d90].map((x) => fmtNum(x, 1)).join(' / ')} days; bank ${fmtNum(m.amberGate.bankDays, 2)} days`,
    ),
    infoCheck(
      'economy.levelMax',
      'Common / Rare / Epic / Legendary at L10 (median card; copies and Amber paid)',
      [m.levelMaxDay.common, m.levelMaxDay.rare, m.levelMaxDay.epic, m.levelMaxDay.legendary].map((x) => (x === null ? 'not reached' : `day ${x}`)).join(' / '),
    ),
    infoCheck(
      'economy.starter',
      'First week: mean level of the starter cards / the first War Plan on day 7; starter cards at L10 on day 7 / 30; first War Plan all L10',
      `L${fmtNum(m.starter.level7, 1)} / L${fmtNum(m.starter.plan7, 1)}; ${fmtNum(m.starter.maxed7, 0)} / ${fmtNum(m.starter.maxed30, 0)} at L10; plan maxed ${m.starter.planMaxDay === null ? 'not reached' : `day ${m.starter.planMaxDay}`}`,
    ),
    // A model input rather than a result: the A6.9 player completes 3 quests a day.
    infoCheck('economy.questsPerDay', 'Quests claimed per day (A6.9 assumes 3)', `${fmtNum(m.perDay.quests, 2)} /day`),
    infoCheck('economy.upgradeCost', 'Upgrade cost in days of Amber income when bought: the dearest upgrade; L10 median / largest', upgradeCostText(m)),
  ];
}

function upgradeCostText(m: EconomyMeasures): string {
  const d = (x: number): string => (Number.isFinite(x) ? fmtNum(x, 1) : 'n/a');
  return `${d(m.upgradeCost.maxDays)} days; L10 ${d(m.upgradeCost.topMedianDays)} / ${d(m.upgradeCost.topMaxDays)} days`;
}

/** The national flags' Dust sink (PLAN 2d, Track D): what every flag costs at the one price, and in days of Dust income. */
export interface FlagSink {
  price: number;
  firstFree: boolean;
  /** The flags of the six regions (the Atlas's 195) and every flag (with the Other flags). */
  atlas: number;
  all: number;
  /** Dust for all 195 and for every flag, the first one on the house when `firstFree`. */
  atlasDust: number;
  allDust: number;
}

export function flagSink(content: CompiledContent): FlagSink | null {
  const col = (asContent(content).cosmetics as Partial<Content['cosmetics']> | undefined)?.collections;
  if (!col) return null;
  const flags = col.items.filter((x) => x.collection === 'nationalFlag' && x.released !== false);
  const atlas = flags.filter((x) => x.region !== 'other').length;
  const price = col.drops.flagDust;
  const firstFree = col.drops.firstFlagFree === true;
  const cost = (n: number): number => Math.max(0, n - (firstFree ? 1 : 0)) * price;
  return { price, firstFree, atlas, all: flags.length, atlasDust: cost(atlas), allDust: cost(flags.length) };
}

/**
 * Info rows (not gated): the Dust a full set of national flags takes, and how many days of the engaged
 * and the casual player's whole Dust income that is (PLAN 2d "Price, checked against tools/economy.ts").
 */
export function flagChecks(sink: FlagSink | null, engaged: EconomyMeasures, casual: EconomyMeasures | null): Check[] {
  if (!sink) return [];
  const days = (dust: number, perDay: number): string => (perDay > 0 ? `${fmtNum(dust / perDay, 0)} days (${fmtNum(dust / perDay / YEAR_DAYS, 1)} years)` : 'no Dust income');
  const row = (who: string, m: EconomyMeasures): string =>
    `${who}: ${fmtNum(m.perDay.dust, 0)} Dust/day; all ${sink.atlas}: ${days(sink.atlasDust, m.perDay.dust)}; all ${sink.all}: ${days(sink.allDust, m.perDay.dust)}`;
  const base = `${sink.price} Dust each${sink.firstFree ? ', the first costs no Dust' : ''}: ${fmtNum(sink.atlasDust, 0)} Dust for the ${sink.atlas}, ${fmtNum(sink.allDust, 0)} with the Other flags`;
  return [
    infoCheck('economy.flags', 'National flags (PLAN 2d): Dust to own every flag at the one price', base),
    infoCheck('economy.flagsEngaged', 'Dust to all flags, engaged player (all its Dust on flags)', row('engaged', engaged)),
    ...(casual ? [infoCheck('economy.flagsCasual', `Dust to all flags, casual player (${ECONOMY_TARGETS.casualMatchesPerDay} matches a day, all its Dust on flags)`, row('casual', casual))] : []),
  ];
}

/**
 * The War-Plan-only player (owner decision 2026-10-07: "you must save up"; the game is played for
 * years): levels only its active War Plan's cards. It must meet the Amber gate on most days from day 10,
 * an upgrade to L10 takes several days of saving, no upgrade costs more than two weeks of income, and the
 * whole War Plan reaches L10 in 12-18 months.
 */
export function planChecks(p: EconomyMeasures): Check[] {
  const T = ECONOMY_TARGETS;
  const fmtDays = (x: number): string => (Number.isFinite(x) ? `${fmtNum(x, 1)} days of income` : 'n/a');
  const [lo, hi] = T.planMaxDays;
  return [
    rangeCheck('economy.plan.blocked', 'War-Plan-only player: days 10-364 ending with a copy-ready War Plan upgrade the Amber cannot pay', p.amberGate.blockedShareYear, T.planBlockedShareMin, 1, {
      target: `≥ ${Math.round(T.planBlockedShareMin * 100)}%`,
      show: fmtPct,
    }),
    rangeCheck('economy.plan.topUpgrade', 'War-Plan-only player: an upgrade to L10 in days of Amber income when bought (median)', p.upgradeCost.topMedianDays, T.topUpgradeDaysMin, Number.POSITIVE_INFINITY, {
      target: `≥ ${T.topUpgradeDaysMin} days`,
      show: fmtDays,
    }),
    rangeCheck('economy.plan.maxUpgrade', 'War-Plan-only player: the dearest upgrade in days of Amber income when bought', p.upgradeCost.maxDays, 0, T.upgradeDaysMax, {
      target: `≤ ${T.upgradeDaysMax} days`,
      show: fmtDays,
    }),
    rangeCheck('economy.plan.maxed', 'War-Plan-only player: every card of the active War Plan at L10', p.planMaxDay ?? Number.NaN, lo, hi, {
      target: `${fmtNum(lo / MONTH_DAYS, 0)}-${fmtNum(hi / MONTH_DAYS, 0)} months (${fmtNum(lo, 0)}-${fmtNum(hi, 0)} days)`,
      show: (x) => (Number.isFinite(x) ? `${fmtNum(x, 0)} days (${fmtNum(x / MONTH_DAYS, 1)} months)` : 'not reached'),
    }),
    infoCheck(
      'economy.plan.gate',
      'War-Plan-only player: blocked days 0-6 / 11-120; median bank (days 11-120) in days of income; War Plan L7; the first War Plan on day 7; Amber a day',
      `${fmtPct(p.amberGate.blockedShareWeek1)} / ${fmtPct(p.amberGate.blockedShare)}; bank ${fmtNum(p.amberGate.bankDays, 1)} days; L7 ${p.planL7Day === null ? 'not reached' : `day ${p.planL7Day}`}; L${fmtNum(p.starter.plan7, 2)} on day 7; ${fmtNum(p.perDay.amber, 0)} Amber/day`,
    ),
    infoCheck('economy.plan.upgradeCost', 'War-Plan-only player: upgrade cost in days of Amber income when bought: the dearest; L10 median / largest', upgradeCostText(p)),
  ];
}

// ---------------------------------------------------------------------------------------------
// The player model (drives Meta).

/** Evolve times by position in the window (s), the A18 Balanced mirror medians: 1:13, 2:55, 4:41, 6:34, 8:47, 10:49. */
const EVOLVE_AT_SEC = [73, 175, 281, 394, 527, 649] as const;
/** Typical match length per format (s): the A18.3.4 medians (Short 7:00, Standard 10:30, Full 15:00). */
const MATCH_SEC: Record<FormatId, number> = { tutorial: 180, short: 420, standard: 630, full: 900, last: 975 };

/**
 * Plausible per-match stats of an engaged player, for quest progress only (A6.7): the economy does not
 * depend on them otherwise. Evolves and the final-age time follow the format (A2.4), a third of the
 * matches skip the Treasury, and Last Stand fires in every loss and in one win in five.
 */
export function syntheticStats(content: CompiledContent, format: FormatId, won: boolean, rng: Sfc32State, planCard: CardId | null): MatchStats {
  const evolves = Math.max(0, (content.formats[format]?.ages.length ?? 1) - 1);
  return {
    trained: 40,
    kills: won ? 38 : 30,
    turretKills: 7,
    evolves,
    reachedFinalAgeAtMs: evolves > 0 ? (EVOLVE_AT_SEC[Math.min(evolves, EVOLVE_AT_SEC.length) - 1] as number) * 1000 : null,
    powerMaxHits: 5,
    baseDamage: won ? 33_200 : 12_000,
    heavyKillsByAA: 2,
    usedTreasury: !chanceBp(rng, 3333),
    usedLastStand: !won || chanceBp(rng, 2000),
    ownBaseHpBpAtEnd: won ? 5000 : 0,
    durationMs: (MATCH_SEC[format] ?? 420) * 1000,
    mvpCard: planCard,
  };
}

/**
 * Quest claiming is not part of the `Meta` contract (B15), but A6.9's engaged player completes 3 quests
 * a day, so the model uses the meta package's own `claimQuest` and `rerollQuest` when it exports them
 * (WP7 `MetaRules`); without them quests are left unclaimed and the report says so.
 */
interface QuestApi {
  claimQuest(s: SaveDoc, slot: number | 'weekly', c: CompiledContent, clock: Clock): Result<SaveDoc>;
  rerollQuest: ((s: SaveDoc, slot: number, c: CompiledContent) => Result<SaveDoc>) | null;
}

export function questApi(meta: Meta): QuestApi | null {
  const m = meta as Meta & Partial<Record<'claimQuest' | 'rerollQuest', unknown>>;
  if (typeof m.claimQuest !== 'function') return null;
  return {
    claimQuest: m.claimQuest as QuestApi['claimQuest'],
    rerollQuest: typeof m.rerollQuest === 'function' ? (m.rerollQuest as NonNullable<QuestApi['rerollQuest']>) : null,
  };
}

/** Claims every finished quest (daily slots and the weekly one). */
function claimQuests(api: QuestApi, s: SaveDoc, content: CompiledContent, clock: Clock, day: number, rec: EconomyRecorder): SaveDoc {
  let save = s;
  const slots: (number | 'weekly')[] = [...save.quests.daily.map((_, i) => i), 'weekly'];
  for (const slot of slots) {
    const q = slot === 'weekly' ? save.quests.weekly : save.quests.daily[slot];
    if (!q || q.claimed) continue;
    const r = api.claimQuest(save, slot, content, clock);
    if (!r.ok) continue;
    income(rec, day, save, r.value);
    save = r.value;
    rec.quest(day);
  }
  return save;
}

/** The free daily reroll (A6.7) on the oldest quest still open at the end of the day. */
function rerollStuck(api: QuestApi, s: SaveDoc, content: CompiledContent): SaveDoc {
  if (!api.rerollQuest) return s;
  const slot = s.quests.daily.findIndex((q) => !q.claimed);
  if (slot < 0) return s;
  const r = api.rerollQuest(s, slot, content);
  return r.ok ? r.value : s;
}

function planCards(s: SaveDoc, ages = Number.POSITIVE_INFINITY): CardId[] {
  const plan = s.warPlans[s.activePlan];
  if (!plan) return [];
  const out: CardId[] = [];
  for (const age of (Object.keys(plan.loadouts) as AgeId[]).slice(0, ages)) {
    const l = plan.loadouts[age];
    for (const c of [...l.units, ...l.turrets]) if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

function levelsOf(s: SaveDoc): Map<CardId, number> {
  return new Map(Object.entries(s.collection).map(([id, e]) => [id, e.level]));
}

/** Amber and Dust income of one step: the currency change plus the Amber the step itself spent. */
function income(rec: EconomyRecorder, day: number, before: SaveDoc, after: SaveDoc, spent = 0): void {
  const got = after.currencies.amber - before.currencies.amber + spent;
  if (got > 0) rec.amber(day, got);
  const dust = after.currencies.dust - before.currencies.dust;
  if (dust > 0) rec.dust(day, dust);
}

function openAll(meta: Meta, s: SaveDoc, day: number, rec: EconomyRecorder): SaveDoc {
  let save = s;
  for (let guard = 0; guard < 200 && save.capsules.pending.length > 0; guard += 1) {
    const cap = save.capsules.pending[0] as PendingCapsule;
    const r = meta.openCapsule(save, cap.id);
    income(rec, day, save, r.save);
    save = r.save;
    const c = r.reveal.capsule;
    rec.capsule(day, c.kind, c.kind === 'win' && c.scriptIndex === null, c.contents.stacks, c.contents.amber);
  }
  for (let guard = 0; guard < 50 && save.capsules.wardrobe.length > 0; guard += 1) {
    const next = meta.openWardrobe(save, (save.capsules.wardrobe[0] as { id: string }).id).save;
    income(rec, day, save, next);
    save = next;
  }
  return save;
}

function upgradeAll(meta: Meta, s: SaveDoc, content: CompiledContent, c: Content, day: number, rec: EconomyRecorder, focusAges = 0): SaveDoc {
  let save = s;
  const plan = new Set(planCards(save));
  const focus = focusAges > 0 ? new Set(planCards(save, focusAges)) : null;
  const amberFor = (lvl: number): number => c.rarities.upgradeAmber[lvl - 1] ?? Number.POSITIVE_INFINITY;
  for (let pass = 0; pass < 500; pass += 1) {
    const cands = Object.entries(save.collection)
      .filter(([id, e]) => e.level >= 1 && e.level < content.economy.maxLevel && (!focus || focus.has(id)))
      .sort(([a, ea], [b, eb]) => Number(plan.has(b)) - Number(plan.has(a)) || amberFor(ea.level) - amberFor(eb.level) || a.localeCompare(b));
    let upgraded = false;
    for (const [id, e] of cands) {
      const r = meta.upgrade(save, id, content);
      if (r.ok) {
        income(rec, day, save, r.value, amberFor(e.level));
        rec.upgrade(day, e.level + 1, amberFor(e.level));
        save = r.value;
        upgraded = true;
        break;
      }
    }
    if (!upgraded) break;
  }
  return save;
}

/**
 * Amber every upgrade the copies already allow would cost: each owned card climbs as far as its copies
 * reach. Measured after the day's upgrades, so more than zero means Amber held an upgrade back.
 */
export function amberBacklog(s: SaveDoc, content: CompiledContent, only: ReadonlySet<CardId> | null = null): number {
  const c = asContent(content);
  let amber = 0;
  for (const [id, e] of Object.entries(s.collection)) {
    if (e.level < 1 || (only && !only.has(id))) continue;
    const rarity = c.units[id]?.rarity ?? (c.turrets[id]?.rarity as Rarity | undefined);
    if (!rarity) continue;
    const copiesFor = c.rarities.cards[rarity].upgradeCopies;
    let level = e.level;
    let copies = e.copies;
    while (level < content.economy.maxLevel) {
      const need = copiesFor[level - 1];
      const cost = c.rarities.upgradeAmber[level - 1];
      if (need === undefined || cost === undefined || copies < need) break;
      copies -= need;
      amber += cost;
      level += 1;
    }
  }
  return amber;
}

/** Runs the player model for `days` days and returns the recorder. */
export function simulateEconomy(meta: Meta, content: CompiledContent, m: EconomyModel): EconomyRecorder {
  const c = asContent(content);
  const rng = seedSfc32(`economy:${m.seed}`);
  const rec = new EconomyRecorder(content);
  const quests = questApi(meta);
  let now = Date.UTC(2026, 0, 1, 5);
  const clock: Clock = { now: () => now };
  let save = meta.newSave(content, clock, m.seed);
  rec.starter(Object.entries(save.collection).filter(([, e]) => e.level >= 1).map(([id]) => id));
  const mySide: Side = 0;
  for (let day = 0; day < m.days; day += 1) {
    now = Date.UTC(2026, 0, 1, 5) + day * DAY_MS;
    const ticked = meta.tickTimers(save, clock);
    income(rec, day, save, ticked);
    save = ticked;
    // The Supply allowance is retired (A15.4): an old allowance would convert inside applyMatchResult.
    for (let n = 0; n < m.matchesPerDay; n += 1) {
      now += 10 * 60_000;
      const format = m.formats.length > 0 ? m.formats[n % m.formats.length] : undefined;
      const opp = meta.pickOpponent(save, 'ladder', content, clock, format ? { format } : undefined);
      const won = chanceBp(rng, m.winRateBp);
      const stats = syntheticStats(content, opp.format, won, rng, planCards(save)[0] ?? null);
      const r = meta.applyMatchResult(
        save,
        {
          mode: 'ladder',
          outcome: { winner: won ? mySide : 1, reason: 'baseDestroyed', tick: Math.trunc(stats.durationMs / 50), baseHpBp: won ? [5000, 0] : [0, 5000] },
          mySide,
          opponent: opp,
          stats,
        },
        content,
        clock,
      );
      income(rec, day, save, r.save);
      save = r.save;
      rec.match(day, won);
      save = openAll(meta, save, day, rec);
    }
    for (const node of c.trophyRoad.nodes) {
      if (node.trophies > save.trophies.current || save.trophies.roadClaimed.includes(node.trophies) || save.trophies.roadClaimed.includes(node.index)) continue;
      const r = meta.claimRoadNode(save, node.trophies, content, clock);
      if (r.ok) {
        income(rec, day, save, r.value);
        save = r.value;
      }
    }
    save = openAll(meta, save, day, rec);
    save = upgradeAll(meta, save, content, c, day, rec, m.focusAges);
    if (quests) {
      // Twice: quest rewards open and upgrade into "Upgrade 2 cards", which can then be claimed too.
      for (let pass = 0; pass < 2; pass += 1) {
        save = claimQuests(quests, save, content, clock, day, rec);
        save = openAll(meta, save, day, rec);
        save = upgradeAll(meta, save, content, c, day, rec, m.focusAges);
      }
      save = rerollStuck(quests, save, content);
    }
    rec.gate(day, save.currencies.amber, amberBacklog(save, content, m.focusAges > 0 ? new Set(planCards(save, m.focusAges)) : null));
    rec.snapshot(day, levelsOf(save), planCards(save), content.economy.maxLevel);
  }
  return rec;
}

export interface EconomyData {
  meta: string;
  model: EconomyModel;
  measures: EconomyMeasures | null;
  /** The casual player (3 matches a day), reported and not gated; null when it did not run. */
  casual: EconomyMeasures | null;
  /** The War-Plan-only player (levels only its War Plan's cards), gated by `planChecks`; null when it did not run. */
  plan: EconomyMeasures | null;
  /** The casual War-Plan-only player (3 matches a day), reported; null when it did not run. */
  casualPlan: EconomyMeasures | null;
}

/** The War Plan's ages: a War-Plan-only player levels the cards of all of them. */
const PLAN_AGES = 8;

export async function runEconomy(m: EconomyModel, content: CompiledContent = gameContent): Promise<Report<EconomyData>> {
  const rep = startReport<EconomyData>('economy', 'Ageborn 365-day economy sim (DESIGN A6.9)', { ...m, contentHash: content.hash });
  const empty = { model: m, measures: null, casual: null, plan: null, casualPlan: null };
  const { meta, reason } = await loadMeta();
  if (!meta) {
    return rep.finish([skippedCheck('economy.all', 'A6.9 pacing check', 'within ±20%, finish gap < 30 days', `skipped: ${reason ?? 'no meta'}`)], { meta: 'unavailable', ...empty }, [
      `Skipped until the meta rules exist: ${reason ?? 'unknown reason'}.`,
    ]);
  }
  try {
    const seeds = Math.max(1, m.seeds);
    const median30 = (model: EconomyModel): EconomyMeasures => medianMeasures(Array.from({ length: seeds }, (_, i) => simulateEconomy(meta, content, { ...model, seed: m.seed + i }).measures(m.averageDays)));
    const measures = median30(m);
    const fullYear = m.days >= 365;
    // The casual player (A15.4): 3 matches a day, reported beside the engaged player, not gated.
    const casualModel = { ...m, matchesPerDay: ECONOMY_TARGETS.casualMatchesPerDay, days: fullYear ? Math.max(m.days, ECONOMY_TARGETS.casualDays) : m.days };
    const casual = m.matchesPerDay === casualModel.matchesPerDay && m.days === casualModel.days ? measures : median30(casualModel);
    const over = (x: number | null, days: number): string => (x === null ? `>${days}` : String(x));
    const casualCheck = infoCheck(
      'economy.casual',
      `Casual player (${casualModel.matchesPerDay} matches a day, ${casualModel.days} days): copies and Sundial Capsules a day; days to max Common / Rare / Epic / Legendary; collection maxed (projected past the run)`,
      `${fmtNum(casual.perDay.copies, 1)} copies/day, ${fmtNum(casual.perDay.win, 2)} Sundial/day; ${[casual.maxDay.common, casual.maxDay.rare, casual.maxDay.epic, casual.maxDay.legendary].map((x) => over(x, casualModel.days)).join(' / ')} days; collection ${casual.collectionMaxedDay ?? `~${over(casual.collectionMaxedProjected, casualModel.days)} (projected)`} days`,
    );
    // The War-Plan-only player (owner decision 2026-10-07), gated, and its casual twin, reported.
    const planDays = fullYear ? m.planDays : Math.min(m.days, m.planDays);
    const plan = m.planDays > 0 && m.focusAges === 0 ? median30({ ...m, focusAges: PLAN_AGES, days: planDays }) : null;
    const casualPlan = plan ? median30({ ...casualModel, focusAges: PLAN_AGES, days: fullYear ? Math.max(planDays, ECONOMY_TARGETS.casualDays) : planDays }) : null;
    const planRows = plan ? planChecks(plan) : [];
    const casualPlanCheck = casualPlan
      ? [
          infoCheck(
            'economy.casualPlan',
            `Casual War-Plan-only player (${casualModel.matchesPerDay} matches a day, ${casualPlan.days} days): War Plan at L10; blocked days 10-364; upgrade cost in days of income`,
            `${casualPlan.planMaxDay === null ? `>${casualPlan.days}` : casualPlan.planMaxDay} days; ${fmtPct(casualPlan.amberGate.blockedShareYear)}; ${upgradeCostText(casualPlan)}`,
          ),
        ]
      : [];
    const notes = [
      `Median of ${seeds} seed${seeds === 1 ? '' : 's'} (${m.seed}-${m.seed + seeds - 1}).`,
      `Per-day averages use days ${m.averageDays[0]}-${m.averageDays[1]}. Amber income is every increase of the Amber balance (matches, quests, capsules, road, Codex Levels) plus what upgrades spent.`,
      'Finish dates past the end of a run are projected from the Amber still missing and the last 60 days of Amber income (labelled "projected").',
    ];
    if (plan) notes.push(`The War-Plan-only player levels only its active War Plan's cards (every age) and runs ${plan.days} days.`);
    if (!questApi(meta)) notes.push('src/meta exports no claimQuest: quests were never claimed, so quest rewards are missing from every figure.');
    const flagRows = flagChecks(flagSink(content), measures, casual);
    return rep.finish([...economyChecks(measures), ...planRows, casualCheck, ...casualPlanCheck, ...flagRows], { meta: 'src/meta', model: m, measures, casual, plan, casualPlan }, notes);
  } catch (e) {
    return rep.finish([{ id: 'economy.run', metric: 'Player model through Meta', target: 'runs', value: 'error', verdict: 'fail', note: String(e) }], { meta: 'src/meta', ...empty });
  }
}

export function economySections(r: Report<EconomyData>): string[] {
  const m = r.data.measures;
  if (!m) return [];
  const d = (x: number | null): string => (x === null ? 'not reached' : `day ${x}`);
  const proj = (reached: number | null, projected: number | null): string => reached !== null ? `day ${reached}` : projected === null ? 'not reached' : `~day ${projected} (projected, ${fmtNum(projected / YEAR_DAYS, 1)} years)`;
  const p = r.data.plan;
  const cp = r.data.casualPlan;
  return [
    '## Milestones',
    '',
    markdownTable(
      ['Measure', 'Value'],
      [
        ['Common to max (median card)', d(m.maxDay.common)],
        ['Rare to max', d(m.maxDay.rare)],
        ['Epic to max', d(m.maxDay.epic)],
        ['Legendary to max', d(m.maxDay.legendary)],
        ['All Legendaries owned', d(m.allLegendariesDay)],
        ['100 cards owned (Card Scout)', d(m.cards100Day)],
        ['Every card owned (Archivist)', d(m.albumCompleteDay)],
        ['50 cards maxed (Master Smith)', d(m.maxed50Day)],
        ['War Plan at L7', d(m.planL7Day)],
        ['Active War Plan at L10', d(m.planMaxDay)],
        ['Copies done', d(m.copiesDoneDay)],
        ['Amber done', proj(m.amberDoneDay, m.amberDoneProjected)],
        ['Collection maxed', proj(m.collectionMaxedDay, m.collectionMaxedProjected)],
      ],
    ),
    ...(p
      ? [
          '',
          `## War-Plan-only player (levels only its War Plan's cards, ${p.days} days; gated)`,
          '',
          markdownTable(
            ['Measure', 'Value'],
            [
              ['Amber a day (days 11-120)', fmtNum(p.perDay.amber, 0)],
              ['Blocked days 0-6 / 11-120 / 10-364', [p.amberGate.blockedShareWeek1, p.amberGate.blockedShare, p.amberGate.blockedShareYear].map(fmtPct).join(' / ')],
              ['Median bank, days 11-120 (days of income)', fmtNum(p.amberGate.bankDays, 1)],
              ['First War Plan, mean level on day 7', `L${fmtNum(p.starter.plan7, 2)}`],
              ['War Plan at L7', d(p.planL7Day)],
              ['Active War Plan at L10', d(p.planMaxDay)],
              ['Upgrade cost in days of income: dearest; L10 median / largest', upgradeCostText(p)],
            ],
          ),
        ]
      : []),
    ...(r.data.casual
      ? [
          '',
          `## Casual player (${ECONOMY_TARGETS.casualMatchesPerDay} matches a day over ${r.data.casual.days} days; reported, not gated)`,
          '',
          markdownTable(
            ['Measure', 'Value'],
            [
              ['Sundial Capsules per day', fmtNum(r.data.casual.perDay.win, 2)],
              ['Copies per day', fmtNum(r.data.casual.perDay.copies, 1)],
              ['Amber per day', fmtNum(r.data.casual.perDay.amber, 0)],
              ['Common / Rare / Epic / Legendary to max', [r.data.casual.maxDay.common, r.data.casual.maxDay.rare, r.data.casual.maxDay.epic, r.data.casual.maxDay.legendary].map(d).join(' / ')],
              ['Collection maxed', proj(r.data.casual.collectionMaxedDay, r.data.casual.collectionMaxedProjected)],
              ...(cp ? [['War-Plan-only: active War Plan at L10', d(cp.planMaxDay)], ['War-Plan-only: upgrade cost in days of income', upgradeCostText(cp)]] : []),
            ],
          ),
        ]
      : []),
  ];
}
