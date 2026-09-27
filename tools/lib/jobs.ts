/**
 * Match jobs: a serialisable description of one headless match (plans, seats, seed) and the executor
 * that plays it with the real sim and returns a compact `MatchSummary`. Jobs cross worker-thread
 * boundaries, so they hold only plain data.
 */
import type { BotController, CompiledContent, FormatId, MatchConfig, Side } from '../../src/contracts';
import { content as gameContent } from '../../src/content';
import { createSim } from '../../src/sim';
import { createProxy, type ProxyId } from '../proxies';
import { HeadlessMatch } from './driver';
import { MatchTally, type MatchSummary } from './metrics';
import { loadBots, type BotFactory } from './modules';
import { sideConfig, type Plan } from './plans';

export type SeatSpec = { kind: 'bot'; generalId: string; tier: number } | { kind: 'proxy'; proxy: ProxyId };

export interface MatchJob {
  /** Position in the batch; results come back in this order. */
  id: number;
  /** Grouping key for aggregation, for example a card id or `mirror.full`. */
  tag: string;
  seed: number;
  format: FormatId;
  /** Card level for both sides (A2.14: L7). */
  level: number;
  plans: [Plan, Plan];
  seats: [SeatSpec, SeatSpec];
  /** Which side plays the tested plan or proxy (null for mirrors). */
  subject: Side | null;
  maxTicks?: number;
  training?: MatchConfig['training'];
}

export interface JobResult {
  id: number;
  tag: string;
  subject: Side | null;
  summary: MatchSummary;
  ms: number;
  /** Set when the match threw; `summary` is then empty and analyses skip the result. */
  error?: string;
}

/** The Balanced brain id: Echo of You (DESIGN A7.4; the AI package's BALANCED_BRAIN_ID). */
export const BALANCED_GENERAL = 'echo';

/** Seat labels: bots are always labeled AI, even in headless tools (A7.1). */
export function seatLabel(s: SeatSpec): string {
  return s.kind === 'bot' ? `AI ${s.generalId} T${s.tier}` : `Proxy ${s.proxy}`;
}

function controller(bots: BotFactory, content: CompiledContent, job: MatchJob, side: Side): BotController {
  const s = job.seats[side];
  if (s.kind === 'proxy') return createProxy(s.proxy, content, side, job.seed, job.format);
  return bots.create(content, { generalId: s.generalId, tier: s.tier, side, seed: job.seed, format: job.format });
}

/** Plays one job to the end (or `maxTicks`). */
export function playJob(job: MatchJob, bots: BotFactory, content: CompiledContent = gameContent): JobResult {
  const started = performance.now();
  const cfg: MatchConfig = {
    seed: job.seed,
    format: job.format,
    content,
    sides: [
      sideConfig(content, job.plans[0], { level: job.level, label: seatLabel(job.seats[0]), isBot: job.seats[0].kind === 'bot' }),
      sideConfig(content, job.plans[1], { level: job.level, label: seatLabel(job.seats[1]), isBot: job.seats[1].kind === 'bot' }),
    ],
    ...(job.training ? { training: job.training } : {}),
  };
  const sim = createSim(cfg);
  const match = new HeadlessMatch(sim, [
    { side: 0, controller: controller(bots, content, job, 0) },
    { side: 1, controller: controller(bots, content, job, 1) },
  ]);
  const tally = new MatchTally(content);
  const outcome = match.run({ maxTicks: job.maxTicks ?? 20_000, onEvents: (ev) => tally.push(ev) });
  const summary = tally.summary({ seed: job.seed, format: job.format, outcome, ticks: sim.state.tick, hash: sim.hash() });
  return { id: job.id, tag: job.tag, subject: job.subject, summary, ms: performance.now() - started };
}

/**
 * Plays a job and turns a thrown error into a result, so one broken match cannot sink a long run; the
 * reports count and show crashed matches.
 */
export function playJobSafely(job: MatchJob, bots: BotFactory, content: CompiledContent = gameContent): JobResult {
  const started = performance.now();
  try {
    return playJob(job, bots, content);
  } catch (e) {
    const tally = new MatchTally(content);
    return {
      id: job.id,
      tag: job.tag,
      subject: job.subject,
      summary: tally.summary({ seed: job.seed, format: job.format, outcome: null, ticks: 0, hash: 0 }),
      ms: performance.now() - started,
      error: e instanceof Error ? (e.stack ?? e.message) : String(e),
    };
  }
}

/** An executor bound to the loaded bots (one per process or worker). */
export async function createExecutor(): Promise<{ bots: BotFactory; run(job: MatchJob): JobResult }> {
  const bots = await loadBots();
  return { bots, run: (job) => playJobSafely(job, bots) };
}

/** Results that played to the end or the tick limit (crashed matches left out). */
export function playedResults(results: readonly JobResult[]): JobResult[] {
  return results.filter((r) => r.error === undefined);
}
