/**
 * Worker-thread entry for `tools/forts.ts` (booted by `worker-boot.mjs`). Plays fort jobs on the game
 * content (with the `--patch` override when set; workers inherit the environment).
 */
import { parentPort } from 'node:worker_threads';
import { playFortJobSafe, type FortJob } from './fortMatch';
import { patchedGameContent } from './patch';

const port = parentPort;
if (!port) throw new Error('tools/lib/fortWorker.ts must run in a worker thread');
const content = patchedGameContent();
port.on('message', (job: FortJob) => port.postMessage({ type: 'result', result: playFortJobSafe(job, content) }));
port.postMessage({ type: 'ready' });
