/**
 * Fort gates (DESIGN A16.14.9, `sim:forts`): the pre-registered fort rows on the real sim, content and
 * tier VII bot, with paired seeds (every "with forts" row plays the seeds of its "without" row and the
 * gates read the paired difference with its 95% interval).
 *
 * Row groups (`--rows`, comma separated; a group name runs every row in it):
 *
 * - `placebo`: the tier VII mirror with walls in both Fort slots and the AI's `rule:noFort` (never
 *   places), vs the no-fort mirror: Bell within ±2.
 * - `mirror`: the fort-AI mirror per kind (both sides the same kind) vs the no-fort mirror.
 * - `forced`: both sides re-place their kind on every recharge on the most forward safe pad
 *   (`rule:fortForce:safe`) vs the no-fort mirror. Mirror gates: Bell Δ ≤ +2 with the 95% upper bound
 *   ≤ +5, and the **mean** match length not more than 30 s longer (the median is pinned at the Bell cap in
 *   Standard War, so a median gate cannot fail there).
 * - `value`: tier VII with the kind (fort AI) vs tier VII without; score in 50-62%.
 * - `spam`: `fort_spam`, tier VII plus its kind forced on every recharge on the most forward legal pad
 *   (`rule:fortForce:any`) vs tier VII without; ≤ 55%.
 * - `turtle`: `turret_turtle` and `home_turtle` with the turtle fort hook (`FortTurtleDriver`: the kind
 *   re-placed on every recharge on the most forward safe Home pad) vs tier VII (carrying the wall, both
 *   sides play the same slots), paired against the same proxy without forts; plus `flag_ball` + towers.
 * - `hold`: `camp_hold_mirror`, both tier VII sides locked to Hold (`HoldDriver`) with camps, vs the same
 *   Hold mirror without forts; Bell Δ ≤ +2.
 * - `runner`: `runner_camp`, both tier VII sides forcing a camp on the most forward legal pad, Field pads
 *   included (`rule:fortForce:any`), vs the no-fort mirror; Bell Δ ≤ +2. (The "one runner opens a Field
 *   pad" half is the core static test of `fieldFrontRank`.)
 * - `card`: per fort card vs its age's wall in each one-age window (`w1.<age>`): forced kind vs forced
 *   wall, both seat orders (the wall row is exactly 50% by construction); |Δ score| ≤ 3, |Δ Bell| ≤ 5.
 *
 * `--raw <file>` keeps every match result for pooled re-analysis. Bots are labelled AI.
 */
import { writeFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import type { CompiledContent, FormatId, FortKind } from '../src/contracts';
import { content as gameContent } from '../src/content';
import { playFortJobSafe, type FortChoice, type FortJob, type FortResult, type FortSeat } from './lib/fortMatch';
import { mean, median, meanDiff, type Estimate } from './lib/stats';
import { crashCheck, fmtClock, fmtEstimate, fmtNum, infoCheck, markdownTable, maxCheck, rangeCheck, startReport, type Check, type Report } from './report';
import type { ProxyId } from './proxies';

export type FortsMode = 'smoke' | 'full';
export const FORT_KINDS: readonly FortKind[] = ['wall', 'tower', 'camp', 'trap'];
export const FORT_ROW_GROUPS = ['placebo', 'mirror', 'forced', 'value', 'spam', 'turtle', 'hold', 'runner', 'card'] as const;
export type FortRowGroup = (typeof FORT_ROW_GROUPS)[number];

export interface FortsOptions {
  groups: readonly FortRowGroup[];
  kinds: readonly FortKind[];
  formats: readonly FormatId[];
  /** Matches per row and format (mirrors: seeds; two-sided rows: seeds × 2 seat orders). */
  matches: number;
  /** Matches per row in Full War (A16.14.9: mirrors 400). */
  matchesFull: number;
  /** Matches per card row and one-age window. */
  cardMatches: number;
  tier: number;
  level: number;
  seed: number;
  workers: number;
  raw?: string;
  onProgress?: (done: number, total: number) => void;
}

export function fortsDefaults(mode: FortsMode): Omit<FortsOptions, 'workers'> {
  return {
    groups: [...FORT_ROW_GROUPS],
    kinds: [...FORT_KINDS],
    formats: ['short', 'standard'],
    matches: mode === 'full' ? 1000 : 100,
    matchesFull: mode === 'full' ? 400 : 100,
    cardMatches: mode === 'full' ? 1000 : 100,
    tier: 7,
    level: 7,
    seed: 5001,
  };
}

interface RowDef {
  tag: string;
  group: FortRowGroup;
  seats: [FortSeat, FortSeat];
  forts: [FortChoice, FortChoice];
  mirror: boolean;
  /** The paired base row's tag prefix (same format), or null for a base row. */
  base: string | null;
}

/** Every row of the selected groups (without the format). Base rows come along automatically. */
export function fortRows(o: Pick<FortsOptions, 'groups' | 'kinds' | 'tier'>): RowDef[] {
  const bot = (rules: string[] = [], hold = false): FortSeat => ({ kind: 'bot', tier: o.tier, generalId: 'echo', rules, ...(hold ? { hold } : {}) });
  const rows = new Map<string, RowDef>();
  const add = (r: RowDef): void => {
    if (!rows.has(r.tag)) rows.set(r.tag, r);
  };
  const g = new Set(o.groups);
  const mirrorBase = (): void => add({ tag: 'mirror.none', group: 'mirror', seats: [bot(), bot()], forts: ['none', 'none'], mirror: true, base: null });
  if (g.has('placebo')) {
    mirrorBase();
    add({ tag: 'placebo', group: 'placebo', seats: [bot(['rule:noFort']), bot(['rule:noFort'])], forts: ['wall', 'wall'], mirror: true, base: 'mirror.none' });
  }
  for (const k of o.kinds) {
    if (g.has('mirror')) {
      mirrorBase();
      add({ tag: `mirror.${k}`, group: 'mirror', seats: [bot(), bot()], forts: [k, k], mirror: true, base: 'mirror.none' });
    }
    if (g.has('forced')) {
      mirrorBase();
      add({ tag: `forced.${k}`, group: 'forced', seats: [bot(['rule:fortForce:safe']), bot(['rule:fortForce:safe'])], forts: [k, k], mirror: true, base: 'mirror.none' });
    }
    if (g.has('value')) add({ tag: `value.${k}`, group: 'value', seats: [bot(), bot()], forts: [k, 'none'], mirror: false, base: null });
    if (g.has('spam')) add({ tag: `spam.${k}`, group: 'spam', seats: [bot(['rule:fortForce:any']), bot()], forts: [k, 'none'], mirror: false, base: null });
  }
  if (g.has('turtle')) {
    const proxy = (p: ProxyId, turtle: boolean): FortSeat => ({ kind: 'proxy', proxy: p, turtle });
    for (const p of ['turret_turtle', 'home_turtle'] as const) {
      add({ tag: `turtle.${p}.none`, group: 'turtle', seats: [proxy(p, false), bot()], forts: ['none', 'none'], mirror: false, base: null });
      for (const k of o.kinds) add({ tag: `turtle.${p}.${k}`, group: 'turtle', seats: [proxy(p, true), bot()], forts: [k, 'wall'], mirror: false, base: `turtle.${p}.none` });
    }
    add({ tag: 'turtle.flag_ball.none', group: 'turtle', seats: [proxy('flag_ball', false), bot()], forts: ['none', 'none'], mirror: false, base: null });
    add({ tag: 'turtle.flag_ball.tower', group: 'turtle', seats: [proxy('flag_ball', true), bot()], forts: ['tower', 'wall'], mirror: false, base: 'turtle.flag_ball.none' });
  }
  if (g.has('hold')) {
    add({ tag: 'hold.none', group: 'hold', seats: [bot([], true), bot([], true)], forts: ['none', 'none'], mirror: true, base: null });
    add({ tag: 'hold.camp', group: 'hold', seats: [bot([], true), bot([], true)], forts: ['camp', 'camp'], mirror: true, base: 'hold.none' });
  }
  if (g.has('runner')) {
    mirrorBase();
    add({ tag: 'runner.camp', group: 'runner', seats: [bot(['rule:fortForce:any']), bot(['rule:fortForce:any'])], forts: ['camp', 'camp'], mirror: true, base: 'mirror.none' });
  }
  if (g.has('card')) {
    const forced = bot(['rule:fortForce:safe']);
    add({ tag: 'card.wall', group: 'card', seats: [forced, forced], forts: ['wall', 'wall'], mirror: false, base: null });
    for (const k of o.kinds) if (k !== 'wall') add({ tag: `card.${k}`, group: 'card', seats: [forced, forced], forts: [k, 'wall'], mirror: false, base: 'card.wall' });
  }
  return [...rows.values()];
}

/** The one-age windows the card rows play (`w1.<age>`), in age order. */
export function cardFormats(content: CompiledContent): FormatId[] {
  const ages = Object.values(content.ages).sort((a, b) => a.index - b.index);
  return ages.map((a) => `w1.${a.id}`).filter((f) => Object.hasOwn(content.formats, f)) as FormatId[];
}

/** The jobs of a run: mirrors play `n` seeds; two-sided rows play ⌈n/2⌉ seeds in both seat orders. */
export function fortJobs(o: FortsOptions, content: CompiledContent): FortJob[] {
  const jobs: FortJob[] = [];
  const rows = fortRows(o);
  const plain = rows.filter((r) => r.group !== 'card');
  const cards = rows.filter((r) => r.group === 'card');
  const push = (r: RowDef, format: FormatId, n: number): void => {
    const tag = `${r.tag}@${format}`;
    if (r.mirror) {
      for (let i = 0; i < n; i += 1) jobs.push({ id: jobs.length, tag, seed: o.seed + i, format, level: o.level, seats: r.seats, forts: r.forts, subject: null });
      return;
    }
    for (let i = 0; i < Math.ceil(n / 2); i += 1) {
      const seed = o.seed + i;
      jobs.push({ id: jobs.length, tag, seed, format, level: o.level, seats: r.seats, forts: r.forts, subject: 0 });
      jobs.push({ id: jobs.length, tag, seed, format, level: o.level, seats: [r.seats[1], r.seats[0]], forts: [r.forts[1], r.forts[0]], subject: 1 });
    }
  };
  for (const f of o.formats) for (const r of plain) push(r, f, f === 'full' ? o.matchesFull : o.matches);
  if (cards.length > 0) for (const f of cardFormats(content)) for (const r of cards) push(r, f, o.cardMatches);
  return jobs;
}

async function runFortJobs(jobs: readonly FortJob[], o: Pick<FortsOptions, 'workers' | 'onProgress'>, content: CompiledContent): Promise<FortResult[]> {
  const results: FortResult[] = new Array<FortResult>(jobs.length);
  if (o.workers <= 1 || jobs.length < 2) {
    jobs.forEach((j, i) => {
      results[i] = playFortJobSafe(j, content);
      o.onProgress?.(i + 1, jobs.length);
    });
    return results;
  }
  const entry = new URL('./lib/fortWorker.ts', import.meta.url).href;
  const boot = new URL('./lib/worker-boot.mjs', import.meta.url);
  const workers: Worker[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      let next = 0;
      let done = 0;
      let live = Math.min(o.workers, jobs.length);
      for (let i = 0, n = live; i < n; i += 1) {
        const w = new Worker(boot, { workerData: { entry } });
        workers.push(w);
        const feed = (): void => {
          if (next >= jobs.length) {
            live -= 1;
            void w.terminate();
            if (live === 0) resolve();
            return;
          }
          w.postMessage(jobs[next]);
          next += 1;
        };
        w.on('message', (m: { type: string; result?: FortResult }) => {
          if (m.type === 'ready') feed();
          else if (m.result) {
            results[m.result.id] = m.result;
            done += 1;
            o.onProgress?.(done, jobs.length);
            feed();
          }
        });
        w.on('error', reject);
      }
    });
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }
  return results;
}

// ---------------------------------------------------------------------------------------------
// Analysis

export interface RowSummary {
  tag: string;
  n: number;
  /** Subject's score % (win 1, draw 0.5); 50 for mirrors. */
  score: number;
  win: number;
  bell: number;
  medianSec: number;
  meanSec: number;
  placed: number;
  destroyed: number;
  decayed: number;
  levies: number;
  bountyGiven: number;
  fortKillShare: number;
}

export interface RowDelta {
  tag: string;
  base: string;
  n: number;
  dBell: Estimate;
  dScore: Estimate;
  dWin: Estimate;
  /** Mean paired length difference, seconds. */
  dMeanSec: number;
  dMedianSec: number;
}

const scoreOf = (r: FortResult): number => {
  const s = r.subject ?? 0;
  return r.winner === null ? 0.5 : r.winner === s ? 1 : 0;
};

export function summarize(tag: string, rs: readonly FortResult[]): RowSummary {
  const ok = rs.filter((r) => !r.error);
  const n = ok.length;
  const sides = (r: FortResult): (0 | 1)[] => (r.subject === null ? [0, 1] : [r.subject]);
  const per = (f: (r: FortResult, s: 0 | 1) => number): number => mean(ok.map((r) => mean(sides(r).map((s) => f(r, s)))));
  let fk = 0;
  let tk = 0;
  for (const r of ok) for (const s of sides(r)) {
    fk += r.sides[s].fortKills;
    tk += r.sides[s].kills;
  }
  return {
    tag,
    n,
    score: n ? (100 * ok.reduce((a, r) => a + scoreOf(r), 0)) / n : Number.NaN,
    win: n ? (100 * ok.filter((r) => r.subject !== null && r.winner === r.subject).length) / n : Number.NaN,
    bell: n ? (100 * ok.filter((r) => r.bell).length) / n : Number.NaN,
    medianSec: median(ok.map((r) => r.ticks / 20)),
    meanSec: mean(ok.map((r) => r.ticks / 20)),
    placed: per((r, s) => r.sides[s].placed),
    destroyed: per((r, s) => r.sides[s].destroyed),
    decayed: per((r, s) => r.sides[s].decayed),
    levies: per((r, s) => r.sides[s].levies),
    bountyGiven: per((r, s) => r.sides[s].bountyGiven / 1000),
    fortKillShare: tk ? (100 * fk) / tk : 0,
  };
}

/** Paired differences of a row against its base row (same seed and subject). */
export function pairedDelta(tag: string, base: string, rows: readonly FortResult[], bases: readonly FortResult[]): RowDelta {
  const key = (r: FortResult): string => `${r.seed}:${r.subject}`;
  const bm = new Map(bases.filter((r) => !r.error).map((r) => [key(r), r]));
  const dB: number[] = [];
  const dS: number[] = [];
  const dW: number[] = [];
  const dL: number[] = [];
  for (const r of rows) {
    if (r.error) continue;
    const b = bm.get(key(r));
    if (!b) continue;
    dB.push((r.bell ? 1 : 0) - (b.bell ? 1 : 0));
    dS.push(scoreOf(r) - scoreOf(b));
    const win = (x: FortResult): number => (x.subject !== null && x.winner === x.subject ? 1 : 0);
    dW.push(win(r) - win(b));
    dL.push((r.ticks - b.ticks) / 20);
  }
  return {
    tag,
    base,
    n: dB.length,
    dBell: meanDiff(dB),
    dScore: meanDiff(dS),
    dWin: meanDiff(dW),
    dMeanSec: mean(dL),
    dMedianSec: median(rows.filter((r) => !r.error).map((r) => r.ticks / 20)) - median(bases.filter((r) => !r.error).map((r) => r.ticks / 20)),
  };
}

export interface FortsData {
  rows: RowSummary[];
  deltas: RowDelta[];
}

const pts = (v: number): string => `${v >= 0 ? '+' : ''}${fmtNum(v)}`;
const est = (e: Estimate): string => fmtEstimate(e, 1, ' pts');

/** Gate checks for every measured row (A16.14.9). */
export function fortChecks(data: FortsData): Check[] {
  const checks: Check[] = [];
  const row = (tag: string): RowSummary | undefined => data.rows.find((r) => r.tag === tag);
  for (const d of data.deltas) {
    const [name, fmt] = d.tag.split('@') as [string, string];
    const [group, a, b] = name.split('.') as [string, string | undefined, string | undefined];
    const id = `forts.${name}.${fmt}`;
    if (group === 'placebo') {
      checks.push(rangeCheck(`${id}.bell`, `Placebo Bell Δ (${fmt})`, d.dBell.value, -2, 2, { target: 'within ±2 points', show: () => est(d.dBell) }));
    } else if (group === 'mirror' || group === 'forced' || group === 'runner' || group === 'hold') {
      const label = group === 'mirror' ? 'Fort-AI mirror' : group === 'forced' ? 'Forced mirror' : group === 'runner' ? 'runner_camp' : 'camp_hold_mirror';
      checks.push(maxCheck(`${id}.bell`, `${label} ${a ?? ''} Bell Δ (${fmt})`, d.dBell.value, 2, { target: '≤ +2 points', show: () => est(d.dBell) }));
      checks.push(maxCheck(`${id}.bellHi`, `${label} ${a ?? ''} Bell Δ upper bound (${fmt})`, d.dBell.hi, 5, { target: '95% upper bound ≤ +5', show: (v) => pts(v) }));
      if (group !== 'hold') checks.push(maxCheck(`${id}.length`, `${label} ${a ?? ''} mean length Δ (${fmt})`, d.dMeanSec, 30, { target: '≤ +30 s (mean; shorter is fine)', show: (v) => `${pts(v)} s (median ${pts(d.dMedianSec)} s)` }));
    } else if (group === 'turtle') {
      const r = row(d.tag);
      if (!r) continue;
      if (a === 'turret_turtle') {
        checks.push(maxCheck(`${id}.bell`, `turret_turtle + ${b} at the Bell (${fmt})`, r.bell, 15, { target: '≤ 15% of matches', show: (v) => `${fmtNum(v)}% (paired Δ ${est(d.dBell)})` }));
        checks.push(maxCheck(`${id}.win`, `turret_turtle + ${b} wins vs turret_turtle (${fmt})`, d.dWin.value, 5, { target: '≤ +5 points (paired)', show: () => est(d.dWin) }));
      } else if (a === 'home_turtle') {
        checks.push(maxCheck(`${id}.score`, `home_turtle + ${b} score (${fmt})`, r.score, 45, { target: '≤ 45% (turtle band ceiling)', show: (v) => `${fmtNum(v)}%` }));
        checks.push(maxCheck(`${id}.bell`, `home_turtle + ${b} at the Bell (${fmt})`, r.bell, 50, { target: '≤ 50%', show: (v) => `${fmtNum(v)}%` }));
        checks.push(maxCheck(`${id}.delta`, `home_turtle + ${b} score vs home_turtle (${fmt})`, d.dScore.value, 5, { target: '≤ +5 points (paired)', show: () => est(d.dScore) }));
      } else {
        checks.push(maxCheck(`${id}.delta`, `flag_ball + towers score vs flag_ball (${fmt})`, d.dScore.value, 5, { target: '≤ +5 points (paired)', show: () => est(d.dScore) }));
      }
    } else if (group === 'card') {
      checks.push(rangeCheck(`${id}.score`, `${a} vs the wall (${fmt})`, d.dScore.value, -3, 3, { target: 'within ±3 points', show: () => est(d.dScore) }));
      checks.push(rangeCheck(`${id}.bell`, `${a} vs the wall Bell Δ (${fmt})`, d.dBell.value, -5, 5, { target: 'within ±5 points', show: () => est(d.dBell) }));
    }
  }
  for (const r of data.rows) {
    const [name, fmt] = r.tag.split('@') as [string, string];
    const [group, k] = name.split('.') as [string, string];
    if (group === 'value') checks.push(rangeCheck(`forts.${name}.${fmt}`, `Fort AI value, ${k} (${fmt})`, r.score, 50, 62, { target: '50-62% (tier VII with vs without)', show: (v) => `${fmtNum(v)}% (${fmtNum(r.placed, 2)} placed per match)` }));
    if (group === 'spam') checks.push(maxCheck(`forts.${name}.${fmt}`, `fort_spam ${k} (${fmt})`, r.score, 55, { target: '≤ 55%', show: (v) => `${fmtNum(v)}%` }));
  }
  return checks;
}

export async function runForts(o: FortsOptions, content: CompiledContent = gameContent): Promise<Report<FortsData>> {
  const rep = startReport<FortsData>('forts', 'Fort gates (A16.14.9)', { ...o, onProgress: undefined });
  const jobs = fortJobs(o, content);
  const results = await runFortJobs(jobs, o, content);
  if (o.raw) writeFileSync(o.raw, JSON.stringify({ options: { ...o, onProgress: undefined }, results }));
  const data = analyzeForts(results);
  const checks = [crashCheck('forts.crashes', results), ...fortChecks(data)];
  checks.push(infoCheck('forts.matches', 'Matches played', String(results.length)));
  return rep.finish(checks, data, [
    'Paired seeds: each row is compared with its base row on the same seeds and seat orders (A16.14.9).',
    'The turret_turtle Bell row is the absolute gate as written (≤ 15%); the paired Δ is shown beside it.',
  ]);
}

/** Summaries and paired deltas from raw results (also used to pool several runs). */
export function analyzeForts(results: readonly FortResult[]): FortsData {
  const by = new Map<string, FortResult[]>();
  for (const r of results) {
    if (!r) continue;
    const a = by.get(r.tag) ?? [];
    a.push(r);
    by.set(r.tag, a);
  }
  const rows = [...by].map(([tag, rs]) => summarize(tag, rs));
  const baseOf = (tag: string): string | null => {
    const [name, fmt] = tag.split('@') as [string, string];
    const g = name.split('.');
    if (name === 'mirror.none' || name.endsWith('.none') || name === 'card.wall') return null;
    if (g[0] === 'placebo' || g[0] === 'mirror' || g[0] === 'forced' || g[0] === 'runner') return `mirror.none@${fmt}`;
    if (g[0] === 'hold') return `hold.none@${fmt}`;
    if (g[0] === 'turtle') return `turtle.${g[1]}.none@${fmt}`;
    if (g[0] === 'card') return `card.wall@${fmt}`;
    return null;
  };
  const deltas: RowDelta[] = [];
  for (const [tag, rs] of by) {
    const base = baseOf(tag);
    const bs = base ? by.get(base) : undefined;
    if (base && bs) deltas.push(pairedDelta(tag, base, rs, bs));
  }
  return { rows, deltas };
}

export function fortsSections(report: Report<FortsData>): string[] {
  const d = report.data;
  return [
    '## Rows\n\n' +
      markdownTable(
        ['Row', 'n', 'Score %', 'Bell %', 'Median', 'Mean', 'Placed', 'Destroyed', 'Decayed', 'Levies', 'Bounty given', 'Fort kill %'],
        d.rows.map((r) => [r.tag, r.n, fmtNum(r.score), fmtNum(r.bell), fmtClock(r.medianSec), fmtClock(r.meanSec), fmtNum(r.placed, 2), fmtNum(r.destroyed, 2), fmtNum(r.decayed, 2), fmtNum(r.levies, 1), fmtNum(r.bountyGiven, 0), fmtNum(r.fortKillShare)]),
      ),
    '## Paired deltas\n\n' +
      markdownTable(
        ['Row', 'Base', 'n', 'Bell Δ', 'Score Δ', 'Win Δ', 'Mean length Δ (s)', 'Median Δ (s)'],
        d.deltas.map((x) => [x.tag, x.base, x.n, est(x.dBell), est(x.dScore), est(x.dWin), pts(x.dMeanSec), pts(x.dMedianSec)]),
      ),
  ];
}
