// Worker threads do not inherit the tsx loader from `npx tsx`, so register it here and then load the
// TypeScript worker entry passed in `workerData.entry` (see tools/lib/runner.ts).
import { workerData } from 'node:worker_threads';
import { register } from 'tsx/esm/api';

register();
await import(workerData.entry);
