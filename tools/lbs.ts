/**
 * `sim-cli lbs`: Last Base Standing gates (DESIGN A2.10.1, L5). A war with no Final Bell must always end:
 * the tier VII Balanced mirror's length (median, p90, longest, the share past `endByMs`), where wars end
 * (Regulation and Overdrive, Siege I-III, Crumble I-II), draws and the first-mover share; the turtle
 * proxies, the `rope_runner` and `cheap_spam` against tier VII; and the `idle` proxy against tier 0.
 * Every match runs on the real sim with the real bots, capped 2 min after `endByMs` (the relay's cap), so
 * a war that outlives the guarantee shows up as unfinished. Also measures the headless cost of the
 * longest war (B3: 31,900 ticks within 1,300 ms with bots).
 */
import type { CompiledContent, FormatId } from '../src/contracts';
import { content as gameContent } from '../src/content';
import { BALANCED_GENERAL, matchTickCap, playedResults, type JobResult, type MatchJob } from './lib/jobs';
import { runJobs } from './lib/runner';
import { baselinePlan } from './lib/plans';
import { median, proportion, quantile } from './lib/stats';
import { STRATEGIES, type ProxyId } from './proxies';
import { crashCheck, fmtClock, fmtNum, fmtPct, infoCheck, markdownTable, maxCheck, rangeCheck, requireSamples, startReport, type Check, type Report } from './report';

export type LbsMode = 'smoke' | 'full';

export interface LbsOptions {
  mode: LbsMode;
  format: FormatId;
  /** Tier VII Balanced mirror matches (A2.10.1 gates: 400; smoke 80). */
  mirrorMatches: number;
  /** Matches per proxy row, half on each side. */
  proxyMatches: number;
  proxies: ProxyId[];
  tier: number;
  level: number;
  seed: number;
  workers: number;
  onProgress?: (done: number, total: number) => void;
}

/** The proxy rows of A2.10.1: the turtles, the rope runner and cheap spam vs tier VII; idle vs tier 0. */
export const LBS_PROXIES: readonly ProxyId[] = ['turret_turtle', 'home_turtle', 'fallback_turtle', 'tech_turtle', 'rope_runner', 'cheap_spam', 'few_then_evolve', 'idle'];

/** A2.10.1 gate targets. */
export const LBS_TARGETS = {
  medianMin: 17 * 60,
  medianMax: 23 * 60,
  p90Max: 26 * 60,
  crumbleMaxPct: 35,
  drawMaxPct: 2,
  firstMover: { lo: 47, hi: 53 },
  turtleMaxPct: 45,
  cheapSpamMaxPct: 20,
  /** `idle` loses every match against tier 0. */
  idleTier: 0,
  /** B3: the longest war, headless with bots. */
  worstCaseMs: 1300,
} as const;

/** Proxies held to the turtle band (≤ 45% vs tier VII, A2.10.1). */
const TURTLE_ROWS: readonly ProxyId[] = ['turret_turtle', 'home_turtle', 'fallback_turtle', 'tech_turtle', 'rope_runner'];

export function lbsDefaults(mode: LbsMode): Omit<LbsOptions, 'workers' | 'onProgress'> {
  return {
    mode,
    format: 'last',
    mirrorMatches: mode === 'full' ? 400 : 80,
    proxyMatches: mode === 'full' ? 80 : 40,
    proxies: [...LBS_PROXIES],
    tier: 7,
    level: 7,
    seed: 9001,
  };
}

/** The step names of the schedule, for the "ended in" table: Regulation/Overdrive, then each step. */
function stepNames(n: number): string[] {
  const base = ['Siege I', 'Siege II', 'Siege III', 'Crumble', 'Crumble II'];
  return ['Regulation/Overdrive', ...Array.from({ length: n }, (_, i) => base[i] ?? `Step ${i + 1}`)];
}

/** The schedule of a format in ticks (empty for a timed format). */
export function stepTicks(content: CompiledContent, format: FormatId): number[] {
  return (content.formats[format]?.escalation ?? []).map((x) => Math.trunc(x.atMs / 50));
}

/** The step a war ended in (0 = before Siege I). */
export function endStep(ticks: readonly number[], tick: number): number {
  let k = 0;
  while (k < ticks.length && tick >= (ticks[k] as number)) k += 1;
  return k;
}

export function lbsJobs(content: CompiledContent, o: LbsOptions): MatchJob[] {
  const jobs: MatchJob[] = [];
  const plan = baselinePlan(content);
  const bot = (tier: number): MatchJob['seats'][number] => ({ kind: 'bot', generalId: BALANCED_GENERAL, tier });
  for (let k = 0; k < o.mirrorMatches; k += 1) {
    jobs.push({ id: jobs.length, tag: 'mirror', seed: o.seed + k, format: o.format, level: o.level, plans: [plan, plan], seats: [bot(o.tier), bot(o.tier)], subject: null });
  }
  const half = Math.ceil(o.proxyMatches / 2);
  for (const id of o.proxies) {
    const tier = id === 'idle' ? LBS_TARGETS.idleTier : o.tier;
    const pp = STRATEGIES[id].plan(content);
    const proxy: MatchJob['seats'][number] = { kind: 'proxy', proxy: id };
    for (let k = 0; k < half; k += 1) {
      const seed = o.seed + 5000 + k;
      jobs.push({ id: jobs.length, tag: `proxy.${id}`, seed, format: o.format, level: o.level, plans: [pp, plan], seats: [proxy, bot(tier)], subject: 0 });
      jobs.push({ id: jobs.length, tag: `proxy.${id}`, seed, format: o.format, level: o.level, plans: [plan, pp], seats: [bot(tier), proxy], subject: 1 });
    }
  }
  return jobs;
}

export interface LengthStats {
  matches: number;
  medianSec: number;
  p10Sec: number;
  p90Sec: number;
  maxSec: number;
  /** Matches still running at the cap (no outcome). */
  unfinished: number;
  /** Matches that ended after `endByMs` (the guarantee broken). */
  pastEndBy: number;
  draws: number;
  /** Matches by the step they ended in (0 = Regulation or Overdrive). */
  endedIn: number[];
  /** Ended in a Crumble step, percent. */
  crumblePct: number;
  /** Side 0 / side 1 wins. */
  sideWins: [number, number];
  /** Matches per started minute of length. */
  byMinute: Record<string, number>;
  /** Wall time per match, ms: median and worst. */
  msMedian: number;
  msMax: number;
  longest: { seed: number; sec: number; reason: string; ms: number } | null;
}

/** `crumbleStep`: the first step (1-based) whose rope runs; a war ending at or after it ended in Crumble. */
export function lengthStats(rs: readonly JobResult[], ticks: readonly number[], endByTick: number, crumbleStep: number): LengthStats {
  const secs = rs.map((r) => r.summary.ticks / 20);
  const endedIn = new Array<number>(ticks.length + 1).fill(0);
  const byMinute: Record<string, number> = {};
  let crumble = 0;
  for (const r of rs) {
    const s = endStep(ticks, r.summary.ticks);
    endedIn[s] = (endedIn[s] ?? 0) + 1;
    if (r.summary.reason !== 'timeout' && s >= crumbleStep) crumble += 1;
    const m = String(Math.floor(r.summary.ticks / 1200));
    byMinute[m] = (byMinute[m] ?? 0) + 1;
  }
  const longest = rs.reduce<JobResult | null>((a, r) => (!a || r.summary.ticks > a.summary.ticks ? r : a), null);
  const ms = rs.map((r) => r.ms);
  return {
    matches: rs.length,
    medianSec: median(secs),
    p10Sec: quantile(secs, 0.1),
    p90Sec: quantile(secs, 0.9),
    maxSec: secs.length ? Math.max(...secs) : Number.NaN,
    unfinished: rs.filter((r) => r.summary.reason === 'timeout').length,
    pastEndBy: rs.filter((r) => r.summary.ticks > endByTick).length,
    draws: rs.filter((r) => r.summary.reason !== 'timeout' && r.summary.winner === null).length,
    endedIn,
    crumblePct: rs.length ? (crumble * 100) / rs.length : Number.NaN,
    sideWins: [rs.filter((r) => r.summary.winner === 0).length, rs.filter((r) => r.summary.winner === 1).length],
    byMinute,
    msMedian: median(ms),
    msMax: ms.length ? Math.max(...ms) : Number.NaN,
    longest: longest ? { seed: longest.summary.seed, sec: longest.summary.ticks / 20, reason: longest.summary.reason, ms: Math.round(longest.ms) } : null,
  };
}

export interface LbsProxyRow {
  proxy: ProxyId;
  title: string;
  tier: number;
  matches: number;
  /** The proxy's wins (draws count half), percent. */
  winPct: number;
  draws: number;
  length: LengthStats;
}

export interface LbsData {
  format: FormatId;
  endByMs: number;
  steps: number[];
  mirror: LengthStats | null;
  proxies: LbsProxyRow[];
}

function proxyRow(id: ProxyId, tier: number, rs: readonly JobResult[], ticks: readonly number[], endByTick: number, crumbleStep: number): LbsProxyRow {
  let score = 0;
  let draws = 0;
  for (const r of rs) {
    if (r.summary.winner === null) {
      draws += 1;
      score += 0.5;
    } else if (r.summary.winner === r.subject) score += 1;
  }
  return { proxy: id, title: STRATEGIES[id].title, tier, matches: rs.length, winPct: rs.length ? (score * 100) / rs.length : Number.NaN, draws, length: lengthStats(rs, ticks, endByTick, crumbleStep) };
}

export async function runLbs(o: LbsOptions, content: CompiledContent = gameContent): Promise<Report<LbsData>> {
  const f = content.formats[o.format];
  if (!f?.escalation || f.endByMs === undefined) throw new Error(`lbs: format "${o.format}" has no Siege steps (A2.10.1)`);
  const rep = startReport<LbsData>('lbs', 'Last Base Standing gates (A2.10.1)', { ...o, onProgress: undefined, cap: matchTickCap(content, o.format) });
  const jobs = lbsJobs(content, o);
  const run = await runJobs(jobs, { workers: o.workers, ...(o.onProgress ? { onProgress: o.onProgress } : {}) });
  const ok = playedResults(run.results);
  const ticks = stepTicks(content, o.format);
  const endByTick = Math.trunc(f.endByMs / 50);
  const rope = f.escalation.findIndex((x) => x.crumbleBpPerSec > 0);
  const crumbleStep = rope >= 0 ? rope + 1 : ticks.length + 1;
  const checks: Check[] = [crashCheck('lbs.crashes', run.results)];
  const t = LBS_TARGETS;
  const mirrorRs = ok.filter((r) => r.tag === 'mirror');
  const mirror = mirrorRs.length > 0 ? lengthStats(mirrorRs, ticks, endByTick, crumbleStep) : null;
  if (mirror) {
    const n = mirror.matches;
    checks.push(requireSamples(rangeCheck('lbs.mirror.median', `Tier ${o.tier} mirror median length`, mirror.medianSec, t.medianMin, t.medianMax, { target: '17:00-23:00', show: fmtClock }), n));
    checks.push(requireSamples(maxCheck('lbs.mirror.p90', `Tier ${o.tier} mirror p90 length`, mirror.p90Sec, t.p90Max, { target: '≤ 26:00', show: fmtClock }), n));
    checks.push(maxCheck('lbs.mirror.pastEndBy', 'Mirror wars past endByMs (unfinished included)', mirror.pastEndBy + mirror.unfinished, 0, { target: `0 (endByMs ${fmtClock(f.endByMs / 1000)})`, show: (v) => `${v} of ${n}` }));
    checks.push(requireSamples(maxCheck('lbs.mirror.crumble', 'Mirror wars ended in a Crumble step', mirror.crumblePct, t.crumbleMaxPct, { target: '≤ 35%', show: fmtPct }), n));
    checks.push(requireSamples(maxCheck('lbs.mirror.draws', 'Mirror draws (both bases on one tick)', n ? (mirror.draws * 100) / n : Number.NaN, t.drawMaxPct, { target: '≤ 2%', show: fmtPct }), n));
    const decided = mirror.sideWins[0] + mirror.sideWins[1];
    const fm = decided ? (mirror.sideWins[0] * 100) / decided : Number.NaN;
    const fmCheck = rangeCheck('lbs.mirror.firstMover', 'Mirror first-mover (side 0) win share', fm, t.firstMover.lo, t.firstMover.hi, { target: '47-53%', show: fmtPct });
    const ci = proportion(mirror.sideWins[0], decided);
    checks.push(requireSamples(o.mode === 'smoke' && fmCheck.verdict === 'fail' && ci.lo <= t.firstMover.hi && ci.hi >= t.firstMover.lo ? { ...fmCheck, verdict: 'info', note: `95% CI ${fmtNum(ci.lo)}-${fmtNum(ci.hi)}% overlaps the band; judged at gate size` } : fmCheck, n));
    checks.push(infoCheck('lbs.mirror.longest', 'Longest mirror war', mirror.longest ? `${fmtClock(mirror.longest.sec)} (seed ${mirror.longest.seed}, ${mirror.longest.reason})` : '-'));
    checks.push(maxCheck('lbs.headless.worst', 'Headless wall time of the longest mirror war (with bots)', mirror.longest?.ms ?? Number.NaN, t.worstCaseMs, { target: '≤ 1,300 ms', show: (v) => `${Math.round(v)} ms` }));
  }
  const proxies: LbsProxyRow[] = [];
  for (const id of o.proxies) {
    const rs = ok.filter((r) => r.tag === `proxy.${id}`);
    if (rs.length === 0) continue;
    const tier = id === 'idle' ? t.idleTier : o.tier;
    const row = proxyRow(id, tier, rs, ticks, endByTick, crumbleStep);
    proxies.push(row);
    const show = (v: number): string => fmtPct(v);
    if (id === 'idle') checks.push(maxCheck(`lbs.proxy.idle`, `idle vs tier ${tier}: idle win share`, row.winPct, 0, { target: 'loses 100%', show }));
    else if (id === 'cheap_spam') checks.push(requireSamples(maxCheck('lbs.proxy.cheap_spam', `cheap_spam vs tier ${tier}`, row.winPct, t.cheapSpamMaxPct, { target: '≤ 20%', show }), row.matches));
    else if (TURTLE_ROWS.includes(id)) checks.push(requireSamples(maxCheck(`lbs.proxy.${id}`, `${id} vs tier ${tier}`, row.winPct, t.turtleMaxPct, { target: '≤ 45%', show }), row.matches));
    else checks.push(infoCheck(`lbs.proxy.${id}`, `${id} vs tier ${tier}`, fmtPct(row.winPct)));
    checks.push(maxCheck(`lbs.proxy.${id}.pastEndBy`, `${id}: wars past endByMs (unfinished included)`, row.length.pastEndBy + row.length.unfinished, 0, { target: '0', show: (v) => `${v} of ${row.matches}` }));
  }
  const notes = [
    `Bots from ${run.botSource}${run.botReason ? ` (${run.botReason})` : ''}.`,
    `Every match is capped at endByMs + 2:00 (${fmtClock(matchTickCap(content, o.format) / 20)}), the online relay's cap; a war still running there counts as unfinished.`,
  ];
  return rep.finish(checks, { format: o.format, endByMs: f.endByMs, steps: ticks, mirror, proxies }, notes);
}

function lengthRows(name: string, l: LengthStats): (string | number)[] {
  return [name, l.matches, fmtClock(l.p10Sec), fmtClock(l.medianSec), fmtClock(l.p90Sec), fmtClock(l.maxSec), l.unfinished, l.pastEndBy, l.draws, fmtPct(l.crumblePct, 0), `${l.sideWins[0]}/${l.sideWins[1]}`, `${Math.round(l.msMedian)} / ${Math.round(l.msMax)}`];
}

export function lbsSections(r: Report<LbsData>): string[] {
  const d = r.data;
  const out: string[] = [];
  const names = stepNames(d.steps.length);
  out.push(
    '## Schedule',
    '',
    markdownTable(['Step', 'Starts'], d.steps.map((tk, i) => [names[i + 1] ?? `Step ${i + 1}`, fmtClock(tk / 20)])),
    '',
    `A base falls by ${fmtClock(d.endByMs / 1000)} (endByMs).`,
  );
  const rows: (string | number)[][] = [];
  if (d.mirror) rows.push(lengthRows('Tier VII mirror', d.mirror));
  for (const p of d.proxies) rows.push(lengthRows(`${p.proxy} vs T${p.tier}`, p.length));
  out.push('', '## Length', '', markdownTable(['Row', 'n', 'p10', 'Median', 'p90', 'Longest', 'Unfinished', 'Past endBy', 'Draws', 'In Crumble', 'Wins s0/s1', 'ms median / worst'], rows));
  const ended: (string | number)[][] = [];
  if (d.mirror) ended.push(['Tier VII mirror', ...d.mirror.endedIn]);
  for (const p of d.proxies) ended.push([`${p.proxy} vs T${p.tier}`, ...p.length.endedIn]);
  out.push('', '## Where wars end', '', markdownTable(['Row', ...names], ended));
  if (d.mirror) {
    const mins = Object.keys(d.mirror.byMinute).map(Number).sort((a, b) => a - b);
    out.push('', '## Mirror length distribution (matches per minute)', '', markdownTable(['Minute', 'Matches'], mins.map((m) => [`${m}:00-${m}:59`, d.mirror?.byMinute[String(m)] ?? 0])));
  }
  if (d.proxies.length > 0) {
    out.push('', '## Proxies', '', markdownTable(['Proxy', 'What it does', 'vs tier', 'n', 'Win %', 'Draws'], d.proxies.map((p) => [p.proxy, p.title, p.tier, p.matches, fmtPct(p.winPct), p.draws])));
  }
  return out;
}
