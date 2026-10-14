// Probe: what the battlefield looks like past the world's right end (edge= option).
import { writeFileSync } from 'node:fs';
import { CaptureSession } from '../lib/capture.mjs';
const s = await CaptureSession.open({ query: 'left=medieval&right=medieval&seed=3&bg=2c2a26&edge=150', width: 540, height: 960, dpr: 2 });
for (const [name, x] of [['edge0', 1890], ['edge90', 1980], ['edge150', 2040]]) {
  await s.camera({ kind: 'look', x, w: 580, ground: 0.73, how: { move: 'cut' } });
  await s.eval(() => window.__capture.step(1));
  const d = await s.eval(() => window.__capture.snap('image/jpeg', 0.9));
  writeFileSync(`work/review/${name}.jpg`, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
}
await s.close();
