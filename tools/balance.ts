/**
 * The balance matrix (DESIGN B12 `sim:balance`, A2.14).
 *
 * Runs, with both sides at tier V on the Balanced brain and every card at L7:
 *
 * - **Balanced mirror** (baseline vs baseline) in Short and Standard War on every run, Full War only at
 *   gates (`--full-war` or the full mode; A18.3.4): match length distribution against the A18.12 medians
 *   and 80% bands, Final Bell rate, the median stay per window position (A18.3.1), the winner's evolve
 *   lead at the 3rd evolve, the War Council's share of gold and items per side (A18.12), evolve timings,
 *   first-mover advantage, turret share of kills, power coverage.
 * - **Per card**: mirrored-seed matches of the card's test plan vs the baseline plan (each seed twice,
 *   the test plan once on each side) in the Standard window that holds the card's age (its second
 *   position where possible). Passes when the 95% CI of the win-rate delta lies within ±3 points (full:
 *   2,000 matches per card) or ±6 (smoke: 400 matches). Cards in the baseline plan are the control.
 * - **Power metrics** of the mirror (A2.9.12, gated): power share of gold and of enemy value killed, the
 *   army share one cast touches, the largest single cast, casts per age stay and value per gold.
 * - **Situational powers** (A2.9.12 setups): Flak is tested against an opponent plan with its age's air
 *   Epic in the Support Rare slot, Suppress against the 4-turret Hold proxy; the delta is the test plan's
 *   score minus the baseline plan's score against the same opponent on the same seeds.
 * - **Scenarios**: base time to kill per age and the static per-power checks by family (A2.9.6).
 * - **Damage per gold per card**, per age (reported, not gated).
 *
 * Exits non-zero when an A2.14 target fails (unless `--no-gate`). Library entry: `runBalance`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AgeId, CardId, CompiledContent, FormatId } from '../src/contracts';
import { content as gameContent } from '../src/content';
import { BALANCED_GENERAL, playedResults, type JobResult, type MatchJob } from './lib/jobs';
import { totalKills, type MatchSummary } from './lib/metrics';
import { agesOf, allCardTests, baselinePlan, cardTest, clonePlan, unitsOfAge, type CardTest, type Plan } from './lib/plans';
import { powerRows, powerSummary, type PowerRow, type PowerSummary } from './lib/powerMetrics';
import { runJobs, type RunOutcome } from './lib/runner';
import { baseTimeToKill, powerBudget, powerCoverage, type PowerBudget } from './lib/scenarios';
import { meanDiff, median, pairedDelta, proportion, quantile, shareWithin, type Estimate } from './lib/stats';
import {
  ciWithinCheck,
  crashCheck,
  fmtClock,
  fmtEstimate,
  fmtNum,
  fmtPct,
  infoCheck,
  markdownTable,
  maxCheck,
  rangeCheck,
  REPORTS_DIR,
  requireSamples,
  startReport,
  type Check,
  type Report,
} from './report';

export type BalanceMode = 'smoke' | 'full';

export interface BalanceOptions {
  mode: BalanceMode;
  /** Seeds per tested card; each seed is played twice (mirrored), so matches = 2 × pairs. */
  pairsPerCard: number;
  /** Balanced-mirror matches per format (Full War and Short War). */
  mirrorMatches: number;
  /** Cards to test (null = every card outside the baseline). */
  cards: CardId[] | null;
  tier: number;
  level: number;
  seed: number;
  workers: number;
  /** CI half-width bound in win-rate points (A2.14: 3 full, 6 smoke). */
  bound: number;
  mirror: boolean;
  /** Mirror formats; Full War only at gates (A18.3.4). */
  mirrorFormats: FormatId[];
  scenarios: boolean;
  onProgress?: (done: number, total: number) => void;
}

/** A2.14 run sizes: full 2,000 matches per card (±3), smoke 400 (±6). */
export function balanceDefaults(mode: BalanceMode): Omit<BalanceOptions, 'workers' | 'onProgress'> {
  return mode === 'full'
    ? { mode, pairsPerCard: 1000, mirrorMatches: 1000, cards: null, tier: 5, level: 7, seed: 1, bound: 3, mirror: true, mirrorFormats: ['short', 'standard', 'full'], scenarios: true }
    : { mode, pairsPerCard: 200, mirrorMatches: 200, cards: null, tier: 5, level: 7, seed: 1, bound: 6, mirror: true, mirrorFormats: ['short', 'standard'], scenarios: true };
}

/** DESIGN A2.14 target numbers as set by A18.12 for age windows (seconds, percent). */
export const TARGETS = {
  /** A18.3.4 / A18.12: medians 7:00 / 10:30 / 15:00, 80% of matches in 5:30-8:30 / 8:30-12:30 / 12:00-17:00. */
  shortMedian: { value: 420, tolerance: 30 },
  shortWindow: { lo: 330, hi: 510, minShare: 80 },
  standardMedian: { value: 630, tolerance: 30 },
  standardWindow: { lo: 510, hi: 750, minShare: 80 },
  fullMedian: { value: 900, tolerance: 45 },
  fullWindow: { lo: 720, hi: 1020, minShare: 80 },
  /** A18.12: Final Bell ≤ 10% of Short Wars, ≤ 8% of Standard Wars, ≤ 5% of Full Wars. */
  finalBellMaxPct: { short: 10, standard: 8, full: 5 },
  /** A17.14: first clash (the first unit-on-unit hit) median 0:11-0:16 on the 2,000 lu lane. */
  firstClash: { lo: 11, hi: 16 },
  /** A18.3.1: median stay in each position of the window (1st to 6th), Balanced mirror. */
  stays: [
    [60, 75],
    [90, 105],
    [95, 110],
    [100, 115],
    [105, 120],
    [110, 125],
  ] as readonly (readonly [number, number])[],
  /** A18.3.1: no age after the first under 75 s (median). */
  minLaterStay: 75,
  /** A18.12: the winner's evolve lead at the 3rd evolve, median ≤ 30 s. */
  evolveLeadMax: 30,
  /** A18.12: research takes 15-25% of the gold; 5-8 items per side in a Standard War (median). */
  researchShare: { lo: 15, hi: 25 },
  researchItems: { lo: 5, hi: 8 },
  firstMover: { lo: 47, hi: 53 },
  baseKill: { lo: 40, hi: 60 },
  /** A2.9.12 power gates on the tier V mirror. */
  power: {
    goldShare: { lo: 8, hi: 16 },
    killShare: { lo: 5, hi: 12 },
    armyShareMax: 40,
    largestCastMax: 350,
    castsPerStay: { lo: 1.5, hi: 3.5 },
    staysWithCastMin: 70,
    fieldStaysMin: 50,
    valuePerGold: { lo: 1.2, hi: 2.0 },
  },
} as const;

/**
 * A2.9.12 situational setups: Flak is gated against its age's air Epic, Suppress against a 4-turret Hold
 * opponent; every other power (controls included) on the baseline, head to head.
 */
export type Situation = { kind: 'airEpic'; plan: Plan } | { kind: 'turtle' };

export function situationOf(content: CompiledContent, card: CardId): Situation | null {
  const pw = content.powers[card];
  if (!pw) return null;
  if (pw.family === 'suppress') return { kind: 'turtle' };
  if (pw.family !== 'flak') return null;
  const air = unitsOfAge(content, pw.age).find((u) => u.rarity === 'epic' && u.tags.includes('air'));
  const plan = clonePlan(baselinePlan(content));
  const l = plan[pw.age];
  // The Support Rare slot (the baseline's fifth troop slot) holds the air Epic.
  if (air && l) l.units[4] = air.id;
  return { kind: 'airEpic', plan };
}

const TICKS_PER_SEC = 20;

/** The named format family of a mirror (`short`, `standard`, `full`). */
function family(f: FormatId): 'short' | 'standard' | 'full' {
  return f.startsWith('full') ? 'full' : f.startsWith('standard') ? 'standard' : 'short';
}

/**
 * The Standard window a card is tested in (A18.3.4): the 5-age window that holds the card's age, at its
 * second position where possible (so the card plays from the first evolve on).
 */
export function cardFormat(content: CompiledContent, age: AgeId): FormatId {
  const ages = agesOf(content);
  const i = Math.max(0, ages.indexOf(age));
  const start = Math.max(0, Math.min(i - 1, ages.length - 5));
  const key = start === 0 ? 'standard' : `standard.${ages[start]}`;
  return content.formats[key] ? key : 'standard';
}

function botSeat(tier: number): MatchJob['seats'][number] {
  return { kind: 'bot', generalId: BALANCED_GENERAL, tier };
}

/** The tested cards: `cards` (baseline members are reported as control) or every non-baseline card. */
export function selectTests(content: CompiledContent, cards: CardId[] | null): CardTest[] {
  return cards ? cards.map((c) => cardTest(content, c)) : allCardTests(content);
}

/** Builds every match job of a balance run, in a stable order. */
export function balanceJobs(content: CompiledContent, o: BalanceOptions, tests: readonly CardTest[]): MatchJob[] {
  const jobs: MatchJob[] = [];
  const base = baselinePlan(content);
  const seats: MatchJob['seats'] = [botSeat(o.tier), botSeat(o.tier)];
  if (o.mirror) {
    for (const format of o.mirrorFormats) {
      for (let k = 0; k < o.mirrorMatches; k += 1) {
        jobs.push({ id: jobs.length, tag: `mirror.${format}`, seed: o.seed + k, format, level: o.level, plans: [base, base], seats, subject: null });
      }
    }
  }
  for (const t of tests) {
    if (t.inBaseline) continue;
    const format = cardFormat(content, t.age);
    const sit = situationOf(content, t.card);
    if (sit) {
      // The test plan and the baseline plan each meet the same opponent on the same seeds, on both sides.
      const opp: Plan = sit.kind === 'airEpic' ? sit.plan : base;
      const oppSeat: MatchJob['seats'][number] = sit.kind === 'turtle' ? { kind: 'proxy', proxy: 'turret_turtle' } : botSeat(o.tier);
      for (let k = 0; k < o.pairsPerCard; k += 1) {
        const seed = o.seed + k;
        for (const [tag, plan] of [
          [`card.${t.card}`, t.plan],
          [`ctrl.${t.card}`, base],
        ] as const) {
          jobs.push({ id: jobs.length, tag, seed, format, level: o.level, plans: [plan, opp], seats: [botSeat(o.tier), oppSeat], subject: 0 });
          jobs.push({ id: jobs.length, tag, seed, format, level: o.level, plans: [opp, plan], seats: [oppSeat, botSeat(o.tier)], subject: 1 });
        }
      }
      continue;
    }
    for (let k = 0; k < o.pairsPerCard; k += 1) {
      const seed = o.seed + k;
      jobs.push({ id: jobs.length, tag: `card.${t.card}`, seed, format, level: o.level, plans: [t.plan, base], seats, subject: 0 });
      jobs.push({ id: jobs.length, tag: `card.${t.card}`, seed, format, level: o.level, plans: [base, t.plan], seats, subject: 1 });
    }
  }
  return jobs;
}

export interface MirrorStats {
  format: FormatId;
  matches: number;
  medianSec: number;
  p10Sec: number;
  p90Sec: number;
  /** Share of matches inside the format's 80% band (A18.3.4). */
  withinWindowPct: number;
  /** Median stay per window position (1st, 2nd, ...), seconds, both sides pooled (A18.3.1). */
  stayMedianSec: number[];
  staySamples: number[];
  /** Median of the winner's lead at the 3rd evolve (A18.12), seconds; NaN below 3 evolves. */
  evolveLeadSec: number;
  evolveLeadSamples: number;
  /** Research gold as a share of all gold earned (A18.12), percent. */
  researchSharePct: number;
  /** Median research items started per side (A18.12). */
  researchItems: number;
  finalBellPct: number;
  /** Median seconds of evolve n (index 0 = first evolve), both sides pooled. */
  evolveMedianSec: number[];
  evolveSamples: number[];
  firstMover: Estimate;
  turretSharePct: number;
  kills: number;
  draws: number;
  /** Median seconds to the first unit-on-unit hit (A17.14), over matches that had one. */
  firstClashSec: number;
  firstClashSamples: number;
  /** Share of contact samples with the contact point between the turret covers (A17.14, reported). */
  contactMiddlePct: number;
  /** A2.9.12 power metrics, both sides pooled; null when the summaries carry none. */
  power: PowerSummary | null;
}

export function mirrorStats(format: FormatId, ms: readonly MatchSummary[], content: CompiledContent = gameContent): MirrorStats {
  const lengths = ms.map((m) => m.ticks / TICKS_PER_SEC);
  const evolves: number[][] = [];
  for (const m of ms) {
    for (const s of m.sides) {
      s.evolveTicks.forEach((t, i) => {
        (evolves[i] ??= []).push(t / TICKS_PER_SEC);
      });
    }
  }
  let side0 = 0;
  let turret = 0;
  let kills = 0;
  let draws = 0;
  for (const m of ms) {
    side0 += m.winner === null ? 0.5 : m.winner === 0 ? 1 : 0;
    if (m.winner === null) draws += 1;
    const k = totalKills(m);
    turret += k.turret;
    kills += Object.values(k).reduce((a, b) => a + b, 0);
  }
  // A18.3.1 stays: the time from arriving in a position (0:00 for the first) to pressing Evolve out of it.
  const stays: number[][] = [];
  const leads: number[] = [];
  let researchGold = 0;
  let goldEarned = 0;
  const items: number[] = [];
  for (const m of ms) {
    for (const s of m.sides) {
      let from = 0;
      s.evolveTicks.forEach((t, i) => {
        (stays[i] ??= []).push((t - from) / TICKS_PER_SEC);
        from = t;
      });
      researchGold += s.researchGold ?? 0;
      goldEarned += s.goldEarned ?? 0;
      items.push(s.research?.length ?? 0);
    }
    if (m.winner !== null) {
      const w = m.sides[m.winner].evolveTicks[2];
      if (w !== undefined) leads.push(((m.sides[m.winner === 0 ? 1 : 0].evolveTicks[2] ?? m.ticks) - w) / TICKS_PER_SEC);
    }
  }
  const band = TARGETS[`${family(format)}Window`];
  return {
    format,
    matches: ms.length,
    medianSec: median(lengths),
    p10Sec: quantile(lengths, 0.1),
    p90Sec: quantile(lengths, 0.9),
    withinWindowPct: shareWithin(lengths, band.lo, band.hi) * 100,
    stayMedianSec: stays.map((xs) => median(xs)),
    staySamples: stays.map((xs) => xs.length),
    evolveLeadSec: median(leads),
    evolveLeadSamples: leads.length,
    researchSharePct: goldEarned > 0 ? (researchGold * 100) / goldEarned : Number.NaN,
    researchItems: median(items),
    finalBellPct: ms.length ? (ms.filter((m) => m.finalBell).length * 100) / ms.length : Number.NaN,
    evolveMedianSec: evolves.map((xs) => median(xs)),
    evolveSamples: evolves.map((xs) => xs.length),
    firstMover: proportion(side0, ms.length),
    turretSharePct: kills > 0 ? (turret * 100) / kills : Number.NaN,
    kills,
    draws,
    ...clashAndContact(ms),
    power: ms.some((m) => m.sides.some((x) => x.power)) ? powerSummary(content, ms.flatMap((m) => m.sides)) : null,
  };
}

function clashAndContact(ms: readonly MatchSummary[]): Pick<MirrorStats, 'firstClashSec' | 'firstClashSamples' | 'contactMiddlePct'> {
  const clashes = ms.flatMap((m) => (m.firstClashTick === null || m.firstClashTick === undefined ? [] : [m.firstClashTick / TICKS_PER_SEC]));
  let samples = 0;
  let middle = 0;
  for (const m of ms) {
    samples += m.contact?.samples ?? 0;
    middle += m.contact?.middle ?? 0;
  }
  return { firstClashSec: median(clashes), firstClashSamples: clashes.length, contactMiddlePct: samples > 0 ? (middle * 100) / samples : Number.NaN };
}

/**
 * The A2.14 mirror targets. Every one is a statistic over matches (or over the evolves that happened),
 * so each needs `MIN_SAMPLES` of them to pass (docs/decisions.md WP12, gating).
 */
export function mirrorChecks(s: MirrorStats): Check[] {
  const f = s.format;
  const fam = family(f);
  const checks: Check[] = [];
  const clock = (v: number): string => fmtClock(v);
  const matches = (c: Check): Check => requireSamples(c, s.matches);
  const name = fam === 'full' ? 'Full' : fam === 'standard' ? 'Standard' : 'Short';
  const t = TARGETS[`${fam}Median`];
  const w = TARGETS[`${fam}Window`];
  checks.push(matches(rangeCheck(`mirror.${f}.median`, `${name} War median length`, s.medianSec, t.value - t.tolerance, t.value + t.tolerance, { target: `${clock(t.value)} ± ${t.tolerance} s (A18.12)`, show: clock })));
  checks.push(
    matches(
      rangeCheck(`mirror.${f}.window`, `${name} War matches between ${fmtClock(w.lo)} and ${fmtClock(w.hi)}`, s.withinWindowPct, w.minShare, 100, {
        target: `≥ ${w.minShare}%`,
        show: (v) => fmtPct(v),
      }),
    ),
  );
  const bellMax = TARGETS.finalBellMaxPct[fam];
  checks.push(matches(maxCheck(`mirror.${f}.finalBell`, `${name} War Final Bell rate`, s.finalBellPct, bellMax, { target: `≤ ${bellMax}% (A18.12)`, show: (v) => fmtPct(v) })));
  const fc = TARGETS.firstClash;
  checks.push(
    requireSamples(
      rangeCheck(`mirror.${f}.firstClash`, `${name} War first clash (median)`, s.firstClashSec, fc.lo, fc.hi, { target: `${clock(fc.lo)}-${clock(fc.hi)} (A17.14)`, show: clock }),
      s.firstClashSamples,
    ),
  );
  checks.push(infoCheck(`info.${f}.contactMiddle`, `${name} War contact between the turret covers`, fmtPct(s.contactMiddlePct), 'share of seconds with a contact point (A17.14, reported)'));
  // A18.3.1: the stay in each position of the window; no age after the first under 75 s.
  s.stayMedianSec.forEach((got, i) => {
    const band = TARGETS.stays[i];
    if (!band) return;
    const n = s.staySamples[i] ?? 0;
    // The first stay is gated in every format, the later ones in Standard and Full War (Short reports them).
    if (i === 0 || fam !== 'short') {
      checks.push(
        requireSamples(
          rangeCheck(`mirror.${f}.stay${i + 1}`, `${name} War stay in position ${i + 1} (median)`, got, band[0], band[1], { target: `${clock(band[0])}-${clock(band[1])} (A18.3.1)`, show: clock }),
          n,
        ),
      );
    } else {
      checks.push(infoCheck(`info.${f}.stay${i + 1}`, `${name} War stay in position ${i + 1} (median)`, clock(got), `${clock(band[0])}-${clock(band[1])} (A18.3.1)`));
    }
    if (i > 0) {
      checks.push(
        requireSamples(
          rangeCheck(`mirror.${f}.stay${i + 1}.min`, `${name} War stay in position ${i + 1} is not under 75 s`, got, TARGETS.minLaterStay, Number.POSITIVE_INFINITY, { target: `≥ ${clock(TARGETS.minLaterStay)} (A18.3.1)`, show: clock }),
          n,
        ),
      );
    }
  });
  if (fam !== 'short') {
    checks.push(
      requireSamples(
        maxCheck(`mirror.${f}.evolveLead`, `${name} War: the winner's lead at the 3rd evolve (median)`, s.evolveLeadSec, TARGETS.evolveLeadMax, { target: `≤ ${TARGETS.evolveLeadMax} s (A18.12)`, show: (v) => `${fmtNum(v, 1)} s` }),
        s.evolveLeadSamples,
      ),
    );
  }
  const rs = TARGETS.researchShare;
  checks.push(matches(rangeCheck(`mirror.${f}.researchShare`, `${name} War: research share of gold`, s.researchSharePct, rs.lo, rs.hi, { target: `${rs.lo}-${rs.hi}% (A18.12)`, show: (v) => fmtPct(v) })));
  if (fam === 'standard') {
    const ri = TARGETS.researchItems;
    checks.push(matches(rangeCheck(`mirror.${f}.researchItems`, 'Standard War: research items per side (median)', s.researchItems, ri.lo, ri.hi, { target: `${ri.lo}-${ri.hi} (A18.12)`, show: (v) => fmtNum(v, 1) })));
  } else {
    checks.push(infoCheck(`info.${f}.researchItems`, `${name} War: research items per side (median)`, fmtNum(s.researchItems, 1), 'reported'));
  }
  if (fam === 'standard' || fam === 'full') {
    const fm = TARGETS.firstMover;
    checks.push(
      requireSamples(
        rangeCheck(`mirror.${f}.firstMover`, `${name} War first-mover advantage (side 0 score)`, s.firstMover.value, fm.lo, fm.hi, { target: `${fm.lo}-${fm.hi}%`, show: () => fmtEstimate(s.firstMover, 1, '%') }),
        s.matches,
      ),
    );
    // A16.5: turret share of kills is reported only.
    checks.push(infoCheck(`info.${f}.turretShare`, `${name} War turret share of kills`, fmtPct(s.turretSharePct), 'reported only (A16.5)'));
  }
  if (s.power) checks.push(...powerChecks(f, name, s.power, s.matches));
  return checks;
}

/** The A2.9.12 power gates of one mirror format. */
export function powerChecks(f: FormatId, name: string, p: PowerSummary, matches: number): Check[] {
  const T = TARGETS.power;
  const out: Check[] = [];
  const m = (c: Check): Check => requireSamples(c, matches);
  const pct = (v: number): string => fmtPct(v);
  out.push(m(rangeCheck(`mirror.${f}.power.goldShare`, `${name} War: power share of gold`, p.goldSharePct, T.goldShare.lo, T.goldShare.hi, { target: `${T.goldShare.lo}-${T.goldShare.hi}% (A2.9.12)`, show: pct })));
  out.push(
    m(rangeCheck(`mirror.${f}.power.killShare`, `${name} War: power share of enemy value killed`, p.killSharePct, T.killShare.lo, T.killShare.hi, { target: `${T.killShare.lo}-${T.killShare.hi}% (A2.9.12)`, show: pct })),
  );
  out.push(
    requireSamples(
      maxCheck(`mirror.${f}.power.armyShare`, `${name} War: enemy army value touched by one cast (army ≥ 750, p50)`, p.armyShareP50, T.armyShareMax, { target: `≤ ${T.armyShareMax}% (A2.9.12)`, show: pct }),
      p.armyShareSamples,
    ),
  );
  out.push(
    requireSamples(
      maxCheck(`mirror.${f}.power.largestCast`, `${name} War: largest single cast, card value killed (p99)`, p.largestCastP99, T.largestCastMax, {
        target: `≤ ${T.largestCastMax} (A2.9.12)`,
        show: (v) => `${fmtNum(v, 0)} (max ${fmtNum(p.largestCastMax, 0)})`,
      }),
      p.casts,
    ),
  );
  out.push(
    requireSamples(
      rangeCheck(`mirror.${f}.power.castsPerStay`, `${name} War: casts per side per age stay (median)`, p.castsPerStayMedian, T.castsPerStay.lo, T.castsPerStay.hi, {
        target: `${T.castsPerStay.lo}-${T.castsPerStay.hi} (A2.9.12)`,
        show: (v) => `${fmtNum(v, 1)} (mean ${fmtNum(p.castsPerStayMean, 2)})`,
      }),
      p.stays,
    ),
  );
  out.push(requireSamples(rangeCheck(`mirror.${f}.power.staysWithCast`, `${name} War: age stays with a cast`, p.staysWithCastPct, T.staysWithCastMin, 100, { target: `≥ ${T.staysWithCastMin}% (A2.9.12)`, show: pct }), p.stays));
  out.push(
    requireSamples(rangeCheck(`mirror.${f}.power.fieldStays`, `${name} War: age stays with a Field cast`, p.staysWithFieldCastPct, T.fieldStaysMin, 100, { target: `≥ ${T.fieldStaysMin}% (A2.9.12)`, show: pct }), p.stays),
  );
  out.push(
    requireSamples(
      rangeCheck(`mirror.${f}.power.valuePerGold`, `${name} War: value per gold of damaging casts (median)`, p.valuePerGoldMedian, T.valuePerGold.lo, T.valuePerGold.hi, {
        target: `${T.valuePerGold.lo}-${T.valuePerGold.hi} (A2.9.12)`,
        show: (v) => fmtNum(v, 2),
      }),
      p.valuePerGoldSamples,
    ),
  );
  out.push(infoCheck(`info.${f}.power.castsPerMatch`, `${name} War: casts per side per match (median)`, fmtNum(p.castsPerMatchMedian, 1), 'reported (A2.9.12: Short 5-11, Standard 9-18, Full 13-26)'));
  return out;
}

export interface CardResult {
  card: CardId;
  age: AgeId;
  kind: CardTest['kind'];
  rarity: string;
  inBaseline: boolean;
  replaces: CardId | null;
  matches: number;
  winRatePct: number;
  delta: Estimate;
  verdict: Check['verdict'];
}

/** A2.9.12 situational delta: per seed, the test plan's mean score minus the control plan's (points). */
export function situationalDelta(test: readonly JobResult[], ctrl: readonly JobResult[]): Estimate {
  const bySeed = (rs: readonly JobResult[]): Map<number, number> => {
    const m = new Map<number, number[]>();
    for (const r of rs) {
      if (r.subject === null) continue;
      const list = m.get(r.summary.seed) ?? [];
      list.push(r.summary.winner === null ? 0.5 : r.summary.winner === r.subject ? 1 : 0);
      m.set(r.summary.seed, list);
    }
    return new Map([...m].map(([k, xs]) => [k, xs.reduce((a, b) => a + b, 0) / xs.length]));
  };
  const a = bySeed(test);
  const b = bySeed(ctrl);
  const diffs: number[] = [];
  for (const [seed, v] of [...a].sort((x, y) => x[0] - y[0])) {
    const c = b.get(seed);
    if (c !== undefined) diffs.push(v - c);
  }
  return meanDiff(diffs);
}

/** Pair scores per seed for one card: mean of the subject's two scores. */
export function pairScores(results: readonly JobResult[]): number[] {
  const bySeed = new Map<number, number[]>();
  for (const r of results) {
    if (r.subject === null) continue;
    const m = r.summary;
    const score = m.winner === null ? 0.5 : m.winner === r.subject ? 1 : 0;
    const list = bySeed.get(m.seed) ?? [];
    list.push(score);
    bySeed.set(m.seed, list);
  }
  return [...bySeed.keys()].sort((a, b) => a - b).map((k) => {
    const xs = bySeed.get(k) as number[];
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  });
}

export interface DamagePerGold {
  card: CardId;
  age: AgeId;
  damage: number;
  gold: number;
  perGold: number;
}

/** Whole damage per gold per card over every side of every match (A2.14: reported per age). */
export function damagePerGold(content: CompiledContent, ms: readonly MatchSummary[]): DamagePerGold[] {
  const dmg = new Map<CardId, number>();
  const gold = new Map<CardId, number>();
  for (const m of ms) {
    for (const s of m.sides) {
      for (const [c, d] of Object.entries(s.damage)) dmg.set(c, (dmg.get(c) ?? 0) + d);
      for (const [c, g] of Object.entries(s.spent)) gold.set(c, (gold.get(c) ?? 0) + g);
    }
  }
  const out: DamagePerGold[] = [];
  for (const [card, g] of gold) {
    const def = content.units[card] ?? content.turrets[card];
    if (!def || g <= 0) continue;
    const d = (dmg.get(card) ?? 0) / 100;
    out.push({ card, age: def.age, damage: d, gold: g, perGold: d / g });
  }
  const order = agesOf(content);
  return out.sort((a, b) => order.indexOf(a.age) - order.indexOf(b.age) || b.perGold - a.perGold);
}

export interface PowerUse {
  power: CardId;
  casts: number;
  unitsHitPerCast: number;
  /** A2.9.12 per cast: mean card value killed, mean value per gold (kills × 1.3 ÷ cost), casts that killed nothing. */
  killMean?: number;
  valuePerGold?: number;
  zeroKillPct?: number;
}

export function powerUse(ms: readonly MatchSummary[]): PowerUse[] {
  const acc = new Map<CardId, { casts: number; hit: number }>();
  for (const m of ms) {
    for (const s of m.sides) {
      for (const [p, v] of Object.entries(s.powers)) {
        const a = acc.get(p) ?? { casts: 0, hit: 0 };
        a.casts += v.casts;
        a.hit += v.unitsHit;
        acc.set(p, a);
      }
    }
  }
  const rows = new Map<CardId, PowerRow>(powerRows(ms.flatMap((m) => m.sides)).map((r) => [r.power, r]));
  return [...acc.entries()]
    .map(([power, a]) => {
      const r = rows.get(power);
      return { power, casts: a.casts, unitsHitPerCast: a.casts ? a.hit / a.casts : 0, ...(r ? { killMean: r.killMean, valuePerGold: r.valuePerGoldMean, zeroKillPct: r.zeroKillPct } : {}) };
    })
    .sort((a, b) => a.power.localeCompare(b.power));
}

export interface BalanceData {
  bots: { source: string; reason: string | null };
  mirrors: MirrorStats[];
  cards: CardResult[];
  baseKill: ReturnType<typeof baseTimeToKill>[];
  powerCoverage: NonNullable<ReturnType<typeof powerCoverage>>[];
  /** The static per-power checks by family (A2.9.6). */
  powerBudgets?: PowerBudget[];
  damagePerGold: DamagePerGold[];
  powerUse: PowerUse[];
  matches: number;
  avgMatchMs: number;
}

/** Scenario checks: base time to kill and the static per-power checks by family (no bots needed). */
export function scenarioChecks(content: CompiledContent): { checks: Check[]; baseKill: BalanceData['baseKill']; coverage: BalanceData['powerCoverage']; budgets: PowerBudget[] } {
  const checks: Check[] = [];
  const baseKill = agesOf(content).map((age) => baseTimeToKill(content, age));
  for (const b of baseKill) {
    checks.push(
      rangeCheck(`scenario.baseKill.${b.age}`, `Base time to kill, ${b.age} (60 pop of L1 Commons)`, b.seconds, TARGETS.baseKill.lo, TARGETS.baseKill.hi, {
        target: `${TARGETS.baseKill.lo}-${TARGETS.baseKill.hi} s`,
        show: (v) => (Number.isFinite(v) ? `${v.toFixed(1)} s` : 'base not destroyed'),
      }),
    );
  }
  const coverage = Object.values(content.powers)
    .map((p) => powerCoverage(content, p))
    .filter((x): x is NonNullable<typeof x> => x !== null);
  // A2.9.6: each family has its own target (Flak against its age's air Epic, strikes against the Heavy
  // and Epic, controls in disabled unit-seconds, buffs in shields and heals), with the sim's pulse counts.
  const budgets = Object.values(content.powers).map((p) => powerBudget(content, p));
  for (const b of budgets) {
    checks.push({ id: `scenario.power.${b.power}`, metric: `Power budget, ${b.power} (${b.family})`, target: b.target, value: b.value, verdict: b.pass ? 'pass' : 'fail' });
  }
  return { checks, baseKill, coverage, budgets };
}

/** Plays a balance run and returns the report (no files written). */
export async function runBalance(o: BalanceOptions, content: CompiledContent = gameContent): Promise<Report<BalanceData>> {
  const tests = selectTests(content, o.cards);
  const params = {
    mode: o.mode,
    pairsPerCard: o.pairsPerCard,
    matchesPerCard: o.pairsPerCard * 2,
    mirrorMatchesPerFormat: o.mirror ? o.mirrorMatches : 0,
    cards: o.cards ?? 'all outside the baseline',
    tier: o.tier,
    level: o.level,
    seed: o.seed,
    workers: o.workers,
    ciBound: o.bound,
    contentHash: content.hash,
  };
  const rep = startReport<BalanceData>('balance', 'Ageborn balance matrix (DESIGN A2.14)', params);
  const jobs = balanceJobs(content, o, tests);
  const run: RunOutcome = await runJobs(jobs, { workers: o.workers, ...(o.onProgress ? { onProgress: o.onProgress } : {}) });
  const played = playedResults(run.results);
  const byTag = new Map<string, JobResult[]>();
  for (const r of played) {
    const list = byTag.get(r.tag) ?? [];
    list.push(r);
    byTag.set(r.tag, list);
  }

  const checks: Check[] = jobs.length > 0 ? [crashCheck('run.crashes', run.results)] : [];
  const notes: string[] = [];
  if (run.botSource !== 'src/ai' && jobs.length > 0) notes.push(`Bots: the scripted Balanced proxy stood in for the AI (${run.botReason ?? 'src/ai unavailable'}). Results do not judge balance.`);

  const mirrors: MirrorStats[] = [];
  if (o.mirror) {
    for (const f of o.mirrorFormats) {
      const s = mirrorStats(
        f,
        (byTag.get(`mirror.${f}`) ?? []).map((r) => r.summary),
        content,
      );
      mirrors.push(s);
      checks.push(...mirrorChecks(s));
    }
  }

  const cards: CardResult[] = [];
  for (const t of tests) {
    const rs = byTag.get(`card.${t.card}`) ?? [];
    const pairs = pairScores(rs);
    // A situational power: its plan's score minus the baseline plan's against the same opponent, per seed.
    const ctrl = byTag.get(`ctrl.${t.card}`);
    const delta = ctrl ? situationalDelta(rs, ctrl) : pairedDelta(pairs);
    let verdict: Check['verdict'] = 'info';
    if (!t.inBaseline) {
      const c = requireSamples(ciWithinCheck(`card.${t.card}`, `Win-rate delta, ${t.card} (${t.age} ${t.rarity} ${t.kind})`, delta, o.bound), delta.n);
      checks.push(c);
      verdict = c.verdict;
    }
    const wins = rs.reduce((a, r) => a + (r.summary.winner === null ? 0.5 : r.summary.winner === r.subject ? 1 : 0), 0);
    cards.push({
      card: t.card,
      age: t.age,
      kind: t.kind,
      rarity: t.rarity,
      inBaseline: t.inBaseline,
      replaces: t.replaces,
      matches: rs.length,
      winRatePct: rs.length ? (wins * 100) / rs.length : Number.NaN,
      delta,
      verdict,
    });
  }
  const control = cards.filter((c) => c.inBaseline).map((c) => c.card);
  if (control.length > 0) notes.push(`Baseline cards (the control, measured by the Balanced mirror): ${control.join(', ')}.`);

  let baseKill: BalanceData['baseKill'] = [];
  let coverage: BalanceData['powerCoverage'] = [];
  let budgets: PowerBudget[] = [];
  if (o.scenarios) {
    const sc = scenarioChecks(content);
    checks.push(...sc.checks);
    baseKill = sc.baseKill;
    coverage = sc.coverage;
    budgets = sc.budgets;
  }

  // Situational control rows are not the game's baseline: they stay out of the damage and power tables.
  const all = played.filter((r) => !r.tag.startsWith('ctrl.')).map((r) => r.summary);
  const dpg = damagePerGold(content, all);
  const pu = powerUse(all);
  if (dpg.length > 0) checks.push(infoCheck('info.damagePerGold', 'Damage per gold per card', `${dpg.length} cards, see table`));
  const avgMatchMs = played.length ? played.reduce((a, r) => a + r.ms, 0) / played.length : 0;
  return rep.finish(
    checks,
    { bots: { source: run.botSource, reason: run.botReason }, mirrors, cards, baseKill, powerCoverage: coverage, powerBudgets: budgets, damagePerGold: dpg, powerUse: pu, matches: run.results.length, avgMatchMs },
    notes,
  );
}

/** Markdown sections for the balance report. */
export function balanceSections(r: Report<BalanceData>): string[] {
  const d = r.data;
  const out: string[] = [];
  if (d.mirrors.length > 0) {
    out.push(
      '## Balanced mirror',
      '',
      markdownTable(
        ['Format', 'Matches', 'Median', 'P10', 'P90', 'In 80% band (A18.3.4)', 'Final Bell', 'Evolves (median)', 'Stays per position (median)', 'Lead at 3rd evolve', 'Research share', 'Research items', 'Side 0 score', 'Turret kill share'],
        d.mirrors.map((m) => [
          m.format,
          m.matches,
          fmtClock(m.medianSec),
          fmtClock(m.p10Sec),
          fmtClock(m.p90Sec),
          fmtPct(m.withinWindowPct),
          fmtPct(m.finalBellPct),
          m.evolveMedianSec.map((s) => fmtClock(s)).join(' / '),
          (m.stayMedianSec ?? []).map((s) => fmtClock(s)).join(' / '),
          Number.isFinite(m.evolveLeadSec) ? `${fmtNum(m.evolveLeadSec, 1)} s` : '-',
          fmtPct(m.researchSharePct),
          fmtNum(m.researchItems, 1),
          fmtEstimate(m.firstMover, 1, '%'),
          fmtPct(m.turretSharePct),
        ]),
      ),
    );
  }
  const pm = d.mirrors.filter((m) => m.power);
  if (pm.length > 0) {
    out.push(
      '## Powers in the mirror (A2.9.12)',
      '',
      markdownTable(
        ['Format', 'Casts per side per match', 'Casts per stay (median / mean)', 'Stays with a cast', 'Stays with a Field cast', 'Gold share', 'Kill share', 'Army share per cast (p50)', 'Largest cast p99 (max)', 'Value per gold (median)'],
        pm.map((m) => {
          const p = m.power as PowerSummary;
          return [
            m.format,
            fmtNum(p.castsPerMatchMedian, 1),
            `${fmtNum(p.castsPerStayMedian, 1)} / ${fmtNum(p.castsPerStayMean, 2)}`,
            fmtPct(p.staysWithCastPct),
            fmtPct(p.staysWithFieldCastPct),
            fmtPct(p.goldSharePct),
            fmtPct(p.killSharePct),
            `${fmtPct(p.armyShareP50, 0)} (n ${p.armyShareSamples})`,
            `${fmtNum(p.largestCastP99, 0)} (${fmtNum(p.largestCastMax, 0)})`,
            fmtNum(p.valuePerGoldMedian, 2),
          ];
        }),
      ),
    );
  }
  if (d.cards.length > 0) {
    out.push(
      '## Cards',
      '',
      markdownTable(
        ['Card', 'Age', 'Kind', 'Rarity', 'Replaces', 'Matches', 'Win rate', 'Delta [95% CI]', 'Verdict'],
        d.cards.map((c) => [
          c.card,
          c.age,
          c.kind,
          c.rarity,
          c.inBaseline ? '(baseline)' : (c.replaces ?? '-'),
          c.matches,
          fmtPct(c.winRatePct),
          c.inBaseline ? '-' : fmtEstimate(c.delta, 1),
          c.inBaseline ? 'control' : c.verdict,
        ]),
      ),
    );
  }
  if (d.baseKill.length > 0) {
    out.push(
      '## Base time to kill',
      '',
      markdownTable(
        ['Age', 'Army', 'Pop', 'First hit to destroyed', 'Spawn to destroyed'],
        d.baseKill.map((b) => [b.age, Object.entries(b.army).map(([c, n]) => `${n} ${c}`).join(', '), b.pop, `${fmtNum(b.seconds)} s`, `${fmtNum(b.fromSpawnSeconds)} s`]),
      ),
    );
  }
  if (d.powerCoverage.length > 0 || d.powerUse.length > 0) {
    out.push(
      '## Powers',
      '',
      markdownTable(
        ['Power', 'Budget (A2.9.6)', 'A2.9 damage per unit', 'vs Infantry', 'vs Heavy', 'Casts in matches', 'Enemies hit per cast', 'Value killed per cast', 'Value per gold', 'Casts that killed nothing'],
        [...new Set([...d.powerCoverage.map((x) => x.power), ...d.powerUse.map((x) => x.power), ...(d.powerBudgets ?? []).map((x) => x.power)])].sort().map((id) => {
          const c = d.powerCoverage.find((x) => x.power === id);
          const u = d.powerUse.find((x) => x.power === id);
          const b = d.powerBudgets?.find((x) => x.power === id);
          return [
            id,
            b ? `${b.value} (${b.pass ? 'pass' : 'FAIL'})` : '-',
            c ? fmtNum(c.perUnit, 0) : '-',
            c ? fmtPct(c.lightPct, 0) : '-',
            c ? fmtPct(c.heavyPct, 0) : '-',
            u?.casts ?? 0,
            u ? fmtNum(u.unitsHitPerCast, 2) : '-',
            u?.killMean !== undefined ? fmtNum(u.killMean, 0) : '-',
            u?.valuePerGold !== undefined ? fmtNum(u.valuePerGold, 2) : '-',
            u?.zeroKillPct !== undefined ? fmtPct(u.zeroKillPct, 0) : '-',
          ];
        }),
      ),
    );
  }
  if (d.damagePerGold.length > 0) {
    out.push('## Damage per gold (reported per age, not gated)', '', markdownTable(['Card', 'Age', 'Damage', 'Gold', 'Damage per gold'], d.damagePerGold.map((x) => [x.card, x.age, fmtNum(x.damage, 0), x.gold, fmtNum(x.perGold, 2)])));
  }
  out.push('', `Bots: ${d.bots.source}${d.bots.reason ? ` (${d.bots.reason})` : ''}. ${d.matches} matches, ${fmtNum(d.avgMatchMs, 0)} ms per match on average.`);
  return out;
}

/** Per-card rows as CSV (for spreadsheets). */
export function writeCardsCsv(r: Report<BalanceData>, dir: string = REPORTS_DIR): string {
  const file = path.join(dir, 'balance-cards.csv');
  const rows = [
    'card,age,kind,rarity,in_baseline,replaces,matches,win_rate_pct,delta_pts,ci_lo,ci_hi,verdict',
    ...r.data.cards.map((c) =>
      [c.card, c.age, c.kind, c.rarity, c.inBaseline, c.replaces ?? '', c.matches, fmtNum(c.winRatePct, 2), fmtNum(c.delta.value, 2), fmtNum(c.delta.lo, 2), fmtNum(c.delta.hi, 2), c.inBaseline ? 'control' : c.verdict].join(','),
    ),
  ];
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, `${rows.join('\n')}\n`);
  return file;
}
