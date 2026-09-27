/**
 * The 365-day economy sim (DESIGN B12 `sim:economy`, A6.9 pacing check).
 *
 * An engaged player, modelled through the `Meta` contract exactly as the app drives it: every day the
 * timers tick (04:00 reset), the Daily Capsule is claimed, ladder matches are played at a 60% win rate
 * until 4 wins have used a capsule charge, Trophy Road nodes are claimed, every capsule and crate is
 * opened, and cards are upgraded (the active War Plan first, then the cheapest upgrade). Quests progress
 * from each match's `MatchStats`.
 *
 * `EconomyRecorder` (pure) turns what happened into the A6.9 measures; `economyChecks` compares them with
 * the table within ±20% and checks that the copy and Amber finish dates are less than 30 days apart.
 * Without `src/meta` (WP7) the tool writes a skipped report and exits 0.
 */
import type { AgeId, CardId, Clock, CompiledContent, MatchStats, Meta, PendingCapsule, Rarity, SaveDoc, Side } from '../src/contracts';
import { asContent, content as gameContent, type Content } from '../src/content';
import { chanceBp, seedSfc32 } from '../src/core/rng';
import { loadMeta } from './lib/modules';
import { mean, median } from './lib/stats';
import { fmtNum, markdownTable, rangeCheck, skippedCheck, startReport, type Check, type Report } from './report';

const DAY_MS = 86_400_000;
const MONTH_DAYS = 30.44;

/** A6.9 targets. Months are converted at 30.44 days. */
export const ECONOMY_TARGETS = {
  tolerance: 0.2,
  copiesPerBagCapsule: 9.1,
  amberPerBagCapsule: 227,
  winCapsulesPerDay: 4,
  dailyCapsulesPerDay: 1,
  clayCapsulesPerDay: 0.9,
  copiesPerDay: 48,
  amberPerDay: 1700,
  commonMaxDays: 4.5 * MONTH_DAYS,
  rareMaxDays: 4.3 * MONTH_DAYS,
  epicMaxDays: 3 * MONTH_DAYS,
  legendaryMaxDays: 4.5 * MONTH_DAYS,
  allLegendariesDays: 14,
  planL7Days: 42,
  copiesDoneDays: 135,
  amberDoneDays: 160,
  maxGapDays: 30,
} as const;

export interface EconomyModel {
  days: number;
  winRateBp: number;
  chargedWinsPerDay: number;
  seed: number;
  /** Days used for the per-day averages (steady state before the collection maxes out). */
  averageDays: [number, number];
}

export function economyDefaults(): EconomyModel {
  return { days: 365, winRateBp: 6000, chargedWinsPerDay: 4, seed: 1, averageDays: [11, 120] };
}

// ---------------------------------------------------------------------------------------------
// Recorder (pure).

export interface DayTotals {
  copies: number;
  amber: number;
  capsules: Partial<Record<PendingCapsule['kind'], number>>;
  matches: number;
  wins: number;
}

export interface EconomyMeasures {
  days: number;
  copiesPerBagCapsule: number;
  amberPerBagCapsule: number;
  perDay: { win: number; daily: number; clay: number; copies: number; amber: number };
  /** Median day a card of each rarity has received the copies for L10 (null = never). */
  maxDay: Record<Rarity, number | null>;
  allLegendariesDay: number | null;
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
  private readonly cards: { id: CardId; rarity: Rarity; need: number }[];
  private readonly amberNeed: number;

  constructor(content: CompiledContent) {
    const c = asContent(content);
    const need = (r: Rarity): number => c.rarities.cards[r].upgradeCopies.reduce((a, b) => a + b, 0);
    this.cards = [
      ...Object.values(c.units)
        .filter((u) => u.hidden !== true)
        .map((u) => ({ id: u.id, rarity: u.rarity, need: need(u.rarity) })),
      ...Object.values(c.turrets).map((t) => ({ id: t.id, rarity: t.rarity as Rarity, need: need(t.rarity) })),
    ];
    this.amberNeed = this.cards.length * c.rarities.upgradeAmber.reduce((a, b) => a + b, 0);
  }

  private today(day: number): DayTotals {
    while (this.totals.length <= day) this.totals.push({ copies: 0, amber: 0, capsules: {}, matches: 0, wins: 0 });
    return this.totals[day] as DayTotals;
  }

  match(day: number, won: boolean): void {
    const t = this.today(day);
    t.matches += 1;
    if (won) t.wins += 1;
  }

  amber(day: number, amount: number): void {
    this.today(day).amber += amount;
    this.amberSum += amount;
    if (this.amberDone === null && this.amberSum >= this.amberNeed) this.amberDone = day;
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
      },
      maxDay: { common: byRarity('common'), rare: byRarity('rare'), epic: byRarity('epic'), legendary: byRarity('legendary') },
      allLegendariesDay: allOwned,
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
    near('economy.winPerDay', 'Win Capsules per day', m.perDay.win, T.winCapsulesPerDay, '/day'),
    near('economy.dailyPerDay', 'Daily Capsules per day', m.perDay.daily, T.dailyCapsulesPerDay, '/day'),
    near('economy.clayPerDay', 'Clay meter capsules per day', m.perDay.clay, T.clayCapsulesPerDay, '/day'),
    near('economy.copiesPerDay', 'Daily income: copies', m.perDay.copies, T.copiesPerDay, 'copies/day'),
    near('economy.amberPerDay', 'Daily income: Amber', m.perDay.amber, T.amberPerDay, 'Amber/day'),
    near('economy.commonMax', 'Common to max (median card)', m.maxDay.common, T.commonMaxDays, 'days'),
    near('economy.rareMax', 'Rare to max (median card)', m.maxDay.rare, T.rareMaxDays, 'days'),
    near('economy.epicMax', 'Epic to max (median card)', m.maxDay.epic, T.epicMaxDays, 'days'),
    near('economy.legendaryMax', 'Legendary to max (median card)', m.maxDay.legendary, T.legendaryMaxDays, 'days'),
    near('economy.allLegendaries', 'All 5 Legendaries owned', m.allLegendariesDay, T.allLegendariesDays, 'days'),
    near('economy.planL7', 'Focused War Plan at L7', m.planL7Day, T.planL7Days, 'days'),
    near('economy.copiesDone', 'Copies for the whole collection', m.copiesDoneDay, T.copiesDoneDays, 'days'),
    near('economy.amberDone', 'Amber for the whole collection (273,350)', m.amberDoneDay, T.amberDoneDays, 'days'),
    rangeCheck('economy.finishGap', 'Gap between the copy and Amber finish dates', gap, 0, T.maxGapDays - 1e-9, { target: `< ${T.maxGapDays} days`, show: (x) => (Number.isFinite(x) ? `${fmtNum(x, 0)} days` : 'not reached') }),
  ];
}

// ---------------------------------------------------------------------------------------------
// The player model (drives Meta).

/** Plausible per-match stats for quest progress (A6.7); the economy does not depend on them otherwise. */
function syntheticStats(won: boolean, planCard: CardId | null): MatchStats {
  return {
    trained: 40,
    kills: won ? 38 : 30,
    turretKills: 7,
    evolves: 4,
    reachedFinalAgeAtMs: 290_000,
    powerMaxHits: 5,
    baseDamage: won ? 33_200 : 12_000,
    heavyKillsByAA: 2,
    usedTreasury: true,
    usedLastStand: !won,
    ownBaseHpBpAtEnd: won ? 5000 : 0,
    durationMs: 420_000,
    mvpCard: planCard,
  };
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

/** Amber income of one step: the currency change plus what the step itself spent. */
function income(rec: EconomyRecorder, day: number, before: SaveDoc, after: SaveDoc, spent = 0): void {
  const got = after.currencies.amber - before.currencies.amber + spent;
  if (got > 0) rec.amber(day, got);
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
  let now = Date.UTC(2026, 0, 1, 5);
  const clock: Clock = { now: () => now };
  let save = meta.newSave(content, clock, m.seed);
  const mySide: Side = 0;
  for (let day = 0; day < m.days; day += 1) {
    now = Date.UTC(2026, 0, 1, 5) + day * DAY_MS;
    const ticked = meta.tickTimers(save, clock);
    income(rec, day, save, ticked);
    save = ticked;
    for (let guard = 0; guard < 5 && save.capsules.dailyBank > 0; guard += 1) {
      const bank = save.capsules.dailyBank;
      save = meta.grantCapsule(save, 'daily', content, clock);
      if (save.capsules.dailyBank >= bank) break;
    }
    let chargedWins = 0;
    for (let n = 0; n < 30 && chargedWins < m.chargedWinsPerDay; n += 1) {
      now += 10 * 60_000;
      const opp = meta.pickOpponent(save, 'ladder', content, clock);
      const won = chanceBp(rng, m.winRateBp);
      const r = meta.applyMatchResult(
        save,
        {
          mode: 'ladder',
          outcome: { winner: won ? mySide : 1, reason: 'baseDestroyed', tick: 8400, baseHpBp: won ? [5000, 0] : [0, 5000] },
          mySide,
          opponent: opp,
          stats: syntheticStats(won, planCards(save)[0] ?? null),
        },
        content,
        clock,
      );
      income(rec, day, save, r.save);
      save = r.save;
      rec.match(day, won);
      if (won && r.rewards.some((x) => x.kind === 'capsule')) chargedWins += 1;
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
    rec.snapshot(day, levelsOf(save), planCards(save), content.economy.maxLevel);
  }
  return rec;
}

export interface EconomyData {
  meta: string;
  model: EconomyModel;
  measures: EconomyMeasures | null;
}

export async function runEconomy(m: EconomyModel, content: CompiledContent = gameContent): Promise<Report<EconomyData>> {
  const rep = startReport<EconomyData>('economy', 'Ageborn 365-day economy sim (DESIGN A6.9)', { ...m, contentHash: content.hash });
  const { meta, reason } = await loadMeta();
  if (!meta) {
    return rep.finish([skippedCheck('economy.all', 'A6.9 pacing check', 'within ±20%, finish gap < 30 days', `skipped: ${reason ?? 'no meta'}`)], { meta: 'unavailable', model: m, measures: null }, [
      `Skipped until the meta rules exist: ${reason ?? 'unknown reason'}.`,
    ]);
  }
  try {
    const measures = simulateEconomy(meta, content, m).measures(m.averageDays);
    return rep.finish(economyChecks(measures), { meta: 'src/meta', model: m, measures }, [
      `Per-day averages use days ${m.averageDays[0]}-${m.averageDays[1]}. Amber income is every increase of the Amber balance (matches, quests, capsules, road, Codex Levels) plus what upgrades spent.`,
    ]);
  } catch (e) {
    return rep.finish([{ id: 'economy.run', metric: 'Player model through Meta', target: 'runs', value: 'error', verdict: 'fail', note: String(e) }], { meta: 'src/meta', model: m, measures: null });
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
        ['War Plan at L7', d(m.planL7Day)],
        ['Copies done', d(m.copiesDoneDay)],
        ['Amber done', d(m.amberDoneDay)],
        ['Collection maxed', d(m.collectionMaxedDay)],
      ],
    ),
  ];
}
