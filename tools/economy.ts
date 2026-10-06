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
const MONTH_DAYS = 30.44;

/** A6.9 targets. Months are converted at 30.44 days. */
export const ECONOMY_TARGETS = {
  tolerance: 0.2,
  // The 2026-09-29 capsule ladder (owner: "keep today's time to max a card"): time-to-max targets are the
  // measured 100-seed medians of the model before the ladder (A6.9). The content re-tune (2026-10-04,
  // CONTENT_PLAN 8) keeps them for the 208-card pool and rebases the income rows on the all-ages table
  // (A6.4, Arena 3 and up, where the player spends nearly the whole year): before it, 16.0 copies and
  // 411 Amber per bag capsule and about 98 copies and 3,030 Amber a day for the 88-card pool.
  copiesPerBagCapsule: 38,
  amberPerBagCapsule: 710,
  // The Sundial (2026-09-30, A6.3): one every 5 h is 4.8 a day, all claimed by 7 matches; the 2-pip
  // Clay meter fills from the ladder matches that bring none (the Supply Capsule retired).
  sundialCapsulesPerDay: 4.8,
  clayCapsulesPerDay: 1.1,
  copiesPerDay: 240,
  amberPerDay: 5150,
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
  amberDoneDays: 7 * MONTH_DAYS,
  /** "Whole collection maxed: ~7-7.5 months" (the middle, 7.25 months; ~5-5.5 months for 88 cards). */
  collectionMaxedDays: 7.25 * MONTH_DAYS,
  maxGapDays: 30,
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
}

export function economyDefaults(): EconomyModel {
  return { days: 365, winRateBp: 6000, matchesPerDay: 7, seed: 1, seeds: 30, averageDays: [11, 120] };
}

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
    copiesDoneDay: day((m) => m.copiesDoneDay),
    amberDoneDay: day((m) => m.amberDoneDay),
    collectionMaxedDay: day((m) => m.collectionMaxedDay),
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
  copiesDoneDay: number | null;
  amberDoneDay: number | null;
  collectionMaxedDay: number | null;
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
  private readonly cards: { id: CardId; rarity: Rarity; need: number; age: AgeId }[];
  private readonly amberNeed: number;

  constructor(content: CompiledContent) {
    const c = asContent(content);
    const need = (r: Rarity): number => c.rarities.cards[r].upgradeCopies.reduce((a, b) => a + b, 0);
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

  /** End-of-day collection state (owned and maxed cards, the plan at L7). */
  snapshot(day: number, levels: ReadonlyMap<CardId, number>, planCards: readonly CardId[], maxLevel: number): void {
    this.today(day);
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
      copiesDoneDay: copiesDone,
      amberDoneDay: this.amberDone,
      collectionMaxedDay: maxedAll,
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
  const gap = m.copiesDoneDay !== null && m.amberDoneDay !== null ? Math.abs(m.amberDoneDay - m.copiesDoneDay) : Number.NaN;
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
    near('economy.amberDone', 'Amber for the whole collection (every released card × 4,970)', m.amberDoneDay, T.amberDoneDays, 'days'),
    near('economy.collectionMaxed', 'Whole collection maxed', m.collectionMaxedDay, T.collectionMaxedDays, 'days'),
    rangeCheck('economy.finishGap', 'Gap between the copy and Amber finish dates', gap, 0, T.maxGapDays - 1e-9, { target: `< ${T.maxGapDays} days`, show: (x) => (Number.isFinite(x) ? `${fmtNum(x, 0)} days` : 'not reached') }),
    // The collection milestones (titles, 2026-10-04) are reported, not gated.
    infoCheck(
      'economy.milestones',
      'Collection milestones: 100 cards owned, every card owned, 50 cards maxed, everything maxed',
      [m.cards100Day, m.albumCompleteDay, m.maxed50Day, m.collectionMaxedDay].map((x) => (x === null ? 'not reached' : `day ${x}`)).join(' / '),
    ),
    // Dust is reported, not gated (A6.6 prices did not change with the content re-tune).
    infoCheck('economy.dust', 'Dust earned: a day (averaging window) and over the whole run', `${fmtNum(m.perDay.dust, 0)} /day; ${fmtNum(m.dustTotal, 0)} in ${m.days} days`),
    // A model input rather than a result: the A6.9 player completes 3 quests a day.
    infoCheck('economy.questsPerDay', 'Quests claimed per day (A6.9 assumes 3)', `${fmtNum(m.perDay.quests, 2)} /day`),
  ];
}

// ---------------------------------------------------------------------------------------------
// The player model (drives Meta).

/** Evolve times by position in the window (s), the A18 Balanced mirror medians: 1:13, 2:55, 4:41, 6:34, 8:47, 10:49. */
const EVOLVE_AT_SEC = [73, 175, 281, 394, 527, 649] as const;
/** Typical match length per format (s): the A18.3.4 medians (Short 7:00, Standard 10:30, Full 15:00). */
const MATCH_SEC: Record<FormatId, number> = { tutorial: 180, short: 420, standard: 630, full: 900 };

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

function planCards(s: SaveDoc): CardId[] {
  const plan = s.warPlans[s.activePlan];
  if (!plan) return [];
  const out: CardId[] = [];
  for (const age of Object.keys(plan.loadouts) as AgeId[]) {
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

function upgradeAll(meta: Meta, s: SaveDoc, content: CompiledContent, c: Content, day: number, rec: EconomyRecorder): SaveDoc {
  let save = s;
  const plan = new Set(planCards(save));
  const amberFor = (lvl: number): number => c.rarities.upgradeAmber[lvl - 1] ?? Number.POSITIVE_INFINITY;
  for (let pass = 0; pass < 500; pass += 1) {
    const cands = Object.entries(save.collection)
      .filter(([, e]) => e.level >= 1 && e.level < content.economy.maxLevel)
      .sort(([a, ea], [b, eb]) => Number(plan.has(b)) - Number(plan.has(a)) || amberFor(ea.level) - amberFor(eb.level) || a.localeCompare(b));
    let upgraded = false;
    for (const [id, e] of cands) {
      const r = meta.upgrade(save, id, content);
      if (r.ok) {
        income(rec, day, save, r.value, amberFor(e.level));
        save = r.value;
        upgraded = true;
        break;
      }
    }
    if (!upgraded) break;
  }
  return save;
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
  const mySide: Side = 0;
  for (let day = 0; day < m.days; day += 1) {
    now = Date.UTC(2026, 0, 1, 5) + day * DAY_MS;
    const ticked = meta.tickTimers(save, clock);
    income(rec, day, save, ticked);
    save = ticked;
    // The Supply allowance is retired (A15.4): an old allowance would convert inside applyMatchResult.
    for (let n = 0; n < m.matchesPerDay; n += 1) {
      now += 10 * 60_000;
      const opp = meta.pickOpponent(save, 'ladder', content, clock);
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
    save = upgradeAll(meta, save, content, c, day, rec);
    if (quests) {
      // Twice: quest rewards open and upgrade into "Upgrade 2 cards", which can then be claimed too.
      for (let pass = 0; pass < 2; pass += 1) {
        save = claimQuests(quests, save, content, clock, day, rec);
        save = openAll(meta, save, day, rec);
        save = upgradeAll(meta, save, content, c, day, rec);
      }
      save = rerollStuck(quests, save, content);
    }
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
}

export async function runEconomy(m: EconomyModel, content: CompiledContent = gameContent): Promise<Report<EconomyData>> {
  const rep = startReport<EconomyData>('economy', 'Ageborn 365-day economy sim (DESIGN A6.9)', { ...m, contentHash: content.hash });
  const { meta, reason } = await loadMeta();
  if (!meta) {
    return rep.finish([skippedCheck('economy.all', 'A6.9 pacing check', 'within ±20%, finish gap < 30 days', `skipped: ${reason ?? 'no meta'}`)], { meta: 'unavailable', model: m, measures: null, casual: null }, [
      `Skipped until the meta rules exist: ${reason ?? 'unknown reason'}.`,
    ]);
  }
  try {
    const seeds = Math.max(1, m.seeds);
    const runs = Array.from({ length: seeds }, (_, i) => simulateEconomy(meta, content, { ...m, seed: m.seed + i }).measures(m.averageDays));
    const measures = medianMeasures(runs);
    // The casual player (A15.4): 3 matches a day, reported beside the engaged player, not gated.
    const casualModel = { ...m, matchesPerDay: ECONOMY_TARGETS.casualMatchesPerDay, days: m.days >= 365 ? Math.max(m.days, ECONOMY_TARGETS.casualDays) : m.days };
    const casual = m.matchesPerDay === casualModel.matchesPerDay && m.days === casualModel.days ? measures : medianMeasures(Array.from({ length: seeds }, (_, i) => simulateEconomy(meta, content, { ...casualModel, seed: m.seed + i }).measures(m.averageDays)));
    const casualCheck = infoCheck(
      'economy.casual',
      `Casual player (${casualModel.matchesPerDay} matches a day, ${casualModel.days} days): copies and Sundial Capsules a day; days to max Common / Rare / Epic / Legendary; collection maxed`,
      `${fmtNum(casual.perDay.copies, 1)} copies/day, ${fmtNum(casual.perDay.win, 2)} Sundial/day; ${[casual.maxDay.common, casual.maxDay.rare, casual.maxDay.epic, casual.maxDay.legendary].map((x) => (x === null ? `>${casualModel.days}` : String(x))).join(' / ')} days; collection ${casual.collectionMaxedDay === null ? `>${casualModel.days}` : casual.collectionMaxedDay} days`,
    );
    const notes = [
      `Median of ${seeds} seed${seeds === 1 ? '' : 's'} (${m.seed}-${m.seed + seeds - 1}).`,
      `Per-day averages use days ${m.averageDays[0]}-${m.averageDays[1]}. Amber income is every increase of the Amber balance (matches, quests, capsules, road, Codex Levels) plus what upgrades spent.`,
    ];
    if (!questApi(meta)) notes.push('src/meta exports no claimQuest: quests were never claimed, so quest rewards are missing from every figure.');
    return rep.finish([...economyChecks(measures), casualCheck], { meta: 'src/meta', model: m, measures, casual }, notes);
  } catch (e) {
    return rep.finish([{ id: 'economy.run', metric: 'Player model through Meta', target: 'runs', value: 'error', verdict: 'fail', note: String(e) }], { meta: 'src/meta', model: m, measures: null, casual: null });
  }
}

export function economySections(r: Report<EconomyData>): string[] {
  const m = r.data.measures;
  if (!m) return [];
  const d = (x: number | null): string => (x === null ? 'not reached' : `day ${x}`);
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
        ['Copies done', d(m.copiesDoneDay)],
        ['Amber done', d(m.amberDoneDay)],
        ['Collection maxed', d(m.collectionMaxedDay)],
      ],
    ),
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
              ['Common / Rare / Epic / Legendary to max', [r.data.casual.maxDay.common, r.data.casual.maxDay.rare, r.data.casual.maxDay.epic, r.data.casual.maxDay.legendary].map(d).join(' / ')],
              ['Collection maxed', d(r.data.casual.collectionMaxedDay)],
            ],
          ),
        ]
      : []),
  ];
}
