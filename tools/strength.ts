/**
 * AI strength matrix (owner feedback 2026-09-28: "too easy, you win by just spawning a few soldiers").
 *
 * Each AI tier (default II, IV, VI, VIII, X; the Balanced brain, Echo) plays human-like scripted
 * strategies (`proxies.ts`) in Short, Standard and Full War, half the matches on each side with the same
 * seeds, both sides on the A2.14 baseline plan (the proxy on its own plan) at one card level. Adjacent
 * tiers also play each other head to head (mirrored seeds). The bot sees only the delayed observation
 * and plays by the same rules (A7.1); nothing here changes that.
 *
 * Targets (docs/decisions.md, "Owner feedback 2026-09-28"):
 *
 * - tiers VIII and above beat every simple strategy (`SIMPLE`) at least 80% of the time, per format;
 * - tier II loses to a reasonable player: the skilled Save-and-counter proxy wins more than half;
 * - tiers are ordered: the mean win rate over the strategies rises with every tier step in every
 *   format, and the higher tier of each adjacent pair wins at least 60% head to head.
 *
 * Library entry: `runStrength`.
 */
import type { CompiledContent, FormatId } from '../src/contracts';
import { content as gameContent } from '../src/content';
import { BALANCED_GENERAL, playedResults, type JobResult, type MatchJob } from './lib/jobs';
import { baselinePlan } from './lib/plans';
import { runJobs } from './lib/runner';
import { median, proportion, type Estimate } from './lib/stats';
import { STRATEGIES, type ProxyId } from './proxies';
import { crashCheck, fmtClock, fmtEstimate, fmtPct, infoCheck, markdownTable, rangeCheck, requireSamples, startReport, type Check, type Report } from './report';

export type StrengthMode = 'smoke' | 'full';

/** The simple human-like strategies the top tiers must beat (owner feedback 2026-09-28). */
export const SIMPLE: readonly ProxyId[] = ['cheap_spam', 'few_then_evolve', 'balanced', 'turret_turtle', 'rush'];
/** The skilled scripted player (A16.5 Save-and-counter): the "reasonable player" tier II must lose to. */
export const SKILLED: ProxyId = 'save_counter';

export const STRENGTH_TARGETS = {
  /** Tiers from this one beat every simple strategy ... */
  topFrom: 8,
  /** ... at least this often (bot win rate, draws half). */
  topMinPct: 80,
  /** The weakest measured tier (II) must lose to the skilled player: bot win rate below this. */
  bottomTier: 2,
  bottomMaxPct: 50,
  /** Head to head, the higher tier of an adjacent pair wins at least this often. */
  pairMinPct: 60,
} as const;

export interface StrengthOptions {
  mode: StrengthMode;
  /** Matches per (tier, strategy, format) cell, rounded up to even (half on each side). */
  matchesPerCell: number;
  /** Matches per adjacent tier pair and format (0 = no head-to-head). */
  matchesPerPair: number;
  tiers: number[];
  proxies: ProxyId[];
  formats: FormatId[];
  /** The AI General (personality) that plays; `echo` is the plain Balanced brain. */
  generalId: string;
  level: number;
  seed: number;
  workers: number;
  onProgress?: (done: number, total: number) => void;
}

export function strengthDefaults(mode: StrengthMode): Omit<StrengthOptions, 'workers' | 'onProgress'> {
  return {
    mode,
    matchesPerCell: mode === 'full' ? 200 : 40,
    matchesPerPair: mode === 'full' ? 200 : 40,
    tiers: [2, 4, 6, 8, 10],
    proxies: [...SIMPLE, SKILLED],
    formats: ['short', 'standard', 'full'],
    generalId: BALANCED_GENERAL,
    level: 7,
    seed: 1,
  };
}

export function cellTag(tier: number, proxy: ProxyId, format: FormatId): string {
  return `cell.${tier}.${proxy}.${format}`;
}

export function pairTag(lo: number, hi: number, format: FormatId): string {
  return `pair.${lo}.${hi}.${format}`;
}

/** Bot-vs-proxy jobs for every cell, and head-to-head jobs for each adjacent tier pair. */
export function strengthJobs(content: CompiledContent, o: StrengthOptions): MatchJob[] {
  const jobs: MatchJob[] = [];
  const botPlan = baselinePlan(content);
  const half = Math.ceil(o.matchesPerCell / 2);
  for (const format of o.formats) {
    for (const tier of o.tiers) {
      const bot: MatchJob['seats'][number] = { kind: 'bot', generalId: o.generalId, tier };
      for (const id of o.proxies) {
        const plan = STRATEGIES[id].plan(content);
        const proxy: MatchJob['seats'][number] = { kind: 'proxy', proxy: id };
        const tag = cellTag(tier, id, format);
        for (let k = 0; k < half; k += 1) {
          const seed = o.seed + k;
          // `subject` is the bot's side: results are the bot's.
          jobs.push({ id: jobs.length, tag, seed, format, level: o.level, plans: [botPlan, plan], seats: [bot, proxy], subject: 0 });
          jobs.push({ id: jobs.length, tag, seed, format, level: o.level, plans: [plan, botPlan], seats: [proxy, bot], subject: 1 });
        }
      }
    }
    const pairHalf = Math.ceil(o.matchesPerPair / 2);
    const sorted = [...o.tiers].sort((a, b) => a - b);
    for (let i = 0; i + 1 < sorted.length; i += 1) {
      const lo = sorted[i] as number;
      const hi = sorted[i + 1] as number;
      const tag = pairTag(lo, hi, format);
      const botLo: MatchJob['seats'][number] = { kind: 'bot', generalId: o.generalId, tier: lo };
      const botHi: MatchJob['seats'][number] = { kind: 'bot', generalId: o.generalId, tier: hi };
      for (let k = 0; k < pairHalf; k += 1) {
        const seed = o.seed + 5000 + k;
        jobs.push({ id: jobs.length, tag, seed, format, level: o.level, plans: [botPlan, botPlan], seats: [botHi, botLo], subject: 0 });
        jobs.push({ id: jobs.length, tag, seed, format, level: o.level, plans: [botPlan, botPlan], seats: [botLo, botHi], subject: 1 });
      }
    }
  }
  return jobs;
}

/** Win rate of the subject side (draws half), with the Final Bell share and the median length. */
export interface Rate {
  matches: number;
  winRate: Estimate;
  draws: number;
  bellPct: number;
  medianLengthSec: number;
}

export function rateOf(rs: readonly JobResult[]): Rate {
  let score = 0;
  let draws = 0;
  let bells = 0;
  const lengths: number[] = [];
  for (const r of rs) {
    const m = r.summary;
    const me = r.subject ?? 0;
    score += m.winner === null ? 0.5 : m.winner === me ? 1 : 0;
    if (m.winner === null) draws += 1;
    if (m.finalBell) bells += 1;
    lengths.push(m.ticks / 20);
  }
  return {
    matches: rs.length,
    winRate: proportion(score, rs.length),
    draws,
    bellPct: rs.length ? (bells * 100) / rs.length : Number.NaN,
    medianLengthSec: median(lengths),
  };
}

export interface Cell extends Rate {
  tier: number;
  proxy: ProxyId;
  format: FormatId;
}

export interface Pair extends Rate {
  lo: number;
  hi: number;
  format: FormatId;
}

export interface StrengthData {
  bots: { source: string; reason: string | null };
  cells: Cell[];
  pairs: Pair[];
  /** Mean bot win rate over the strategies, per format and tier. */
  means: { format: FormatId; tier: number; meanPct: number }[];
  matches: number;
}

export function strengthChecks(o: Pick<StrengthOptions, 'tiers' | 'formats' | 'proxies'>, d: Pick<StrengthData, 'cells' | 'pairs' | 'means'>): Check[] {
  const T = STRENGTH_TARGETS;
  const checks: Check[] = [];
  const show = (e: Estimate) => (): string => fmtEstimate(e, 1, '%');
  for (const c of d.cells) {
    const label = `Tier ${c.tier} vs ${STRATEGIES[c.proxy].title} (${c.format})`;
    const id = `strength.${c.format}.${c.tier}.${c.proxy}`;
    if (c.tier >= T.topFrom && SIMPLE.includes(c.proxy)) {
      checks.push(requireSamples(rangeCheck(id, label, c.winRate.value, T.topMinPct, 100, { target: `AI wins ≥ ${T.topMinPct}%`, show: show(c.winRate) }), c.matches));
    } else if (c.tier === T.bottomTier && c.proxy === SKILLED) {
      checks.push(
        requireSamples(
          rangeCheck(id, label, c.winRate.value, 0, T.bottomMaxPct - 1e-9, { target: `AI wins < ${T.bottomMaxPct}% (a reasonable player beats it)`, show: show(c.winRate) }),
          c.matches,
        ),
      );
    }
  }
  for (const format of o.formats) {
    const ms = d.means.filter((m) => m.format === format).sort((a, b) => a.tier - b.tier);
    const ordered = ms.every((m, i) => i === 0 || m.meanPct > (ms[i - 1] as { meanPct: number }).meanPct);
    checks.push({
      id: `strength.${format}.order`,
      metric: `Mean AI win rate rises with every tier (${format})`,
      target: 'strictly rising',
      value: ms.map((m) => `${m.tier}: ${m.meanPct.toFixed(0)}%`).join(', '),
      verdict: ms.length >= 2 && ordered ? 'pass' : 'fail',
    });
  }
  for (const p of d.pairs) {
    checks.push(
      requireSamples(
        rangeCheck(`strength.${p.format}.pair.${p.lo}.${p.hi}`, `Tier ${p.hi} vs tier ${p.lo} (${p.format})`, p.winRate.value, T.pairMinPct, 100, {
          target: `higher tier wins ≥ ${T.pairMinPct}%`,
          show: show(p.winRate),
        }),
        p.matches,
      ),
    );
  }
  return checks;
}

export async function runStrength(o: StrengthOptions, content: CompiledContent = gameContent): Promise<Report<StrengthData>> {
  const rep = startReport<StrengthData>('strength', 'Ageborn AI strength: tiers vs human-like strategies', {
    mode: o.mode,
    matchesPerCell: Math.ceil(o.matchesPerCell / 2) * 2,
    matchesPerPair: Math.ceil(o.matchesPerPair / 2) * 2,
    tiers: o.tiers,
    proxies: o.proxies,
    formats: o.formats,
    generalId: o.generalId,
    level: o.level,
    seed: o.seed,
    workers: o.workers,
    contentHash: content.hash,
  });
  const jobs = strengthJobs(content, o);
  const run = await runJobs(jobs, { workers: o.workers, ...(o.onProgress ? { onProgress: o.onProgress } : {}) });
  const played = playedResults(run.results);
  const byTag = new Map<string, JobResult[]>();
  for (const r of played) {
    const list = byTag.get(r.tag) ?? [];
    list.push(r);
    byTag.set(r.tag, list);
  }
  const cells: Cell[] = [];
  const means: StrengthData['means'] = [];
  for (const format of o.formats) {
    for (const tier of o.tiers) {
      let sum = 0;
      for (const proxy of o.proxies) {
        const c: Cell = { tier, proxy, format, ...rateOf(byTag.get(cellTag(tier, proxy, format)) ?? []) };
        cells.push(c);
        sum += c.winRate.value;
      }
      means.push({ format, tier, meanPct: o.proxies.length > 0 ? sum / o.proxies.length : Number.NaN });
    }
  }
  const pairs: Pair[] = [];
  const sorted = [...o.tiers].sort((a, b) => a - b);
  if (o.matchesPerPair > 0) {
    for (const format of o.formats) {
      for (let i = 0; i + 1 < sorted.length; i += 1) {
        const lo = sorted[i] as number;
        const hi = sorted[i + 1] as number;
        pairs.push({ lo, hi, format, ...rateOf(byTag.get(pairTag(lo, hi, format)) ?? []) });
      }
    }
  }
  const checks: Check[] = jobs.length > 0 ? [crashCheck('run.crashes', run.results)] : [];
  checks.push(...strengthChecks(o, { cells, pairs, means }));
  const bells = cells.reduce((a, c) => a + (c.bellPct * c.matches) / 100, 0);
  const total = cells.reduce((a, c) => a + c.matches, 0);
  checks.push(infoCheck('strength.bell', 'Matches that reached the Final Bell (all cells)', fmtPct(total ? (bells * 100) / total : Number.NaN, 1)));
  const notes: string[] = [];
  if (run.botSource !== 'src/ai' && jobs.length > 0) notes.push(`Bots: the scripted Balanced proxy stood in for the AI (${run.botReason ?? 'src/ai unavailable'}). Results do not judge the AI.`);
  return rep.finish(checks, { bots: { source: run.botSource, reason: run.botReason }, cells, pairs, means, matches: run.results.length }, notes);
}

export function strengthSections(r: Report<StrengthData>): string[] {
  const out: string[] = [];
  const formats = [...new Set(r.data.cells.map((c) => c.format))];
  const tiers = [...new Set(r.data.cells.map((c) => c.tier))].sort((a, b) => a - b);
  const proxies = [...new Set(r.data.cells.map((c) => c.proxy))];
  for (const format of formats) {
    out.push(`## ${format}: AI win rate by tier (draws half)`, '');
    const rows = proxies.map((p) => [
      STRATEGIES[p].title,
      ...tiers.map((t) => {
        const c = r.data.cells.find((x) => x.format === format && x.tier === t && x.proxy === p);
        return c ? `${fmtPct(c.winRate.value, 0)} (Bell ${fmtPct(c.bellPct, 0)}, ${fmtClock(c.medianLengthSec)})` : '-';
      }),
    ]);
    rows.push(['**Mean**', ...tiers.map((t) => fmtPct(r.data.means.find((m) => m.format === format && m.tier === t)?.meanPct ?? Number.NaN, 0))]);
    out.push(markdownTable(['Strategy', ...tiers.map((t) => `Tier ${t}`)], rows), '');
  }
  if (r.data.pairs.length > 0) {
    out.push('## Head to head (higher tier win rate)', '');
    out.push(
      markdownTable(
        ['Pair', 'Format', 'Matches', 'Win rate [95% CI]', 'Final Bell', 'Median length'],
        r.data.pairs.map((p) => [`${p.hi} vs ${p.lo}`, p.format, p.matches, fmtEstimate(p.winRate, 1, '%'), fmtPct(p.bellPct, 0), fmtClock(p.medianLengthSec)]),
      ),
      '',
    );
  }
  out.push(`Bots: ${r.data.bots.source}${r.data.bots.reason ? ` (${r.data.bots.reason})` : ''}. ${r.data.matches} matches.`);
  return out;
}
