/**
 * Runs match jobs in process or on a `worker_threads` pool (DESIGN B12: "Runs on worker_threads").
 *
 * Workers start through `worker-boot.mjs`, which registers the tsx loader (worker threads do not
 * inherit it) and then loads `worker.ts`. Each worker loads content, sim and bots once and plays jobs
 * one at a time; results come back in job order, so a run is deterministic whatever the worker count.
 */
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { createExecutor, type JobResult, type MatchJob } from './jobs';

export interface RunOptions {
  /** 0 or 1 = in process. */
  workers: number;
  onProgress?: (done: number, total: number) => void;
}

export interface RunOutcome {
  results: JobResult[];
  /** Where the bots came from (`src/ai` or the scripted fallback) and why. */
  botSource: string;
  botReason: string | null;
}

/** A sensible default: all cores but one, at least 1. */
export function defaultWorkers(): number {
  return Math.max(1, availableParallelism() - 1);
}

type WorkerMessage =
  | { type: 'ready'; botSource: string; botReason: string | null }
  | { type: 'result'; result: JobResult }
  | { type: 'error'; error: string };

async function runInProcess(jobs: readonly MatchJob[], o: RunOptions): Promise<RunOutcome> {
  const exec = await createExecutor();
  const results: JobResult[] = [];
  for (const job of jobs) {
    results.push(exec.run(job));
    o.onProgress?.(results.length, jobs.length);
  }
  return { results, botSource: exec.bots.source, botReason: exec.bots.reason };
}

async function runOnWorkers(jobs: readonly MatchJob[], o: RunOptions): Promise<RunOutcome> {
  const count = Math.min(o.workers, jobs.length);
  const results: (JobResult | undefined)[] = new Array<JobResult | undefined>(jobs.length);
  const entry = new URL('./worker.ts', import.meta.url).href;
  const boot = new URL('./worker-boot.mjs', import.meta.url);
  const indexOf = new Map<number, number>(jobs.map((j, i) => [j.id, i]));
  let next = 0;
  let done = 0;
  let botSource = 'unknown';
  let botReason: string | null = null;
  const workers: Worker[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      let live = count;
      const feed = (w: Worker): void => {
        if (next >= jobs.length) {
          live -= 1;
          void w.terminate();
          if (live === 0) resolve();
          return;
        }
        w.postMessage(jobs[next]);
        next += 1;
      };
      for (let i = 0; i < count; i += 1) {
        const w = new Worker(boot, { workerData: { entry } });
        workers.push(w);
        w.on('message', (m: WorkerMessage) => {
          if (m.type === 'ready') {
            botSource = m.botSource;
            botReason = m.botReason;
            feed(w);
          } else if (m.type === 'result') {
            const idx = indexOf.get(m.result.id);
            if (idx === undefined) {
              reject(new Error(`worker returned unknown job ${m.result.id}`));
              return;
            }
            results[idx] = m.result;
            done += 1;
            o.onProgress?.(done, jobs.length);
            feed(w);
          } else {
            reject(new Error(`worker failed: ${m.error}`));
          }
        });
        w.on('error', reject);
      }
    });
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }
  const missing = results.findIndex((r) => r === undefined);
  if (missing >= 0) throw new Error(`runner: job ${missing} returned no result`);
  return { results: results as JobResult[], botSource, botReason };
}

/** Plays every job; results are in job order. */
export function runJobs(jobs: readonly MatchJob[], o: RunOptions): Promise<RunOutcome> {
  if (jobs.length === 0) return Promise.resolve({ results: [], botSource: 'none', botReason: null });
  return o.workers <= 1 ? runInProcess(jobs, o) : runOnWorkers(jobs, o);
}

/** A progress printer that writes at most every 5% to stderr. */
export function progressPrinter(label: string): (done: number, total: number) => void {
  let last = -1;
  const started = Date.now();
  return (done, total) => {
    const pct = Math.floor((done * 100) / total);
    if (pct === last || (pct % 5 !== 0 && done !== total)) return;
    last = pct;
    const sec = (Date.now() - started) / 1000;
    const eta = done > 0 ? (sec * (total - done)) / done : 0;
    process.stderr.write(`\r${label}: ${done}/${total} (${pct}%) ${sec.toFixed(0)} s, eta ${eta.toFixed(0)} s   `);
    if (done === total) process.stderr.write('\n');
  };
}
