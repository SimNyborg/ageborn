/**
 * Worker-thread entry for the match runner (DESIGN B12). Loaded by `worker-boot.mjs` after the tsx
 * loader is registered. Loads content, sim and bots once, then plays each job it receives.
 */
import { parentPort } from 'node:worker_threads';
import { createExecutor, type MatchJob } from './jobs';

const port = parentPort;
if (!port) throw new Error('tools/lib/worker.ts must run in a worker thread');

try {
  const exec = await createExecutor();
  port.on('message', (job: MatchJob) => {
    try {
      port.postMessage({ type: 'result', result: exec.run(job) });
    } catch (e) {
      port.postMessage({ type: 'error', error: e instanceof Error ? (e.stack ?? e.message) : String(e) });
    }
  });
  port.postMessage({ type: 'ready', botSource: exec.bots.source, botReason: exec.bots.reason });
} catch (e) {
  port.postMessage({ type: 'error', error: e instanceof Error ? (e.stack ?? e.message) : String(e) });
}
