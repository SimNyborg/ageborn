// Try: 40 Bonkers vs 1 Hover Tank, a few seconds, to judge the look.
import { CaptureSession } from '../lib/capture.mjs';
const out = process.argv[2];
const s = await CaptureSession.open({ query: 'left=stone&right=cosmic&seed=1&bg=2a2118', width: 540, height: 960, dpr: 2 });
console.log('ready', JSON.stringify(s.state0.sides));
const ids0 = await s.army(0, 'bonker', 40, 300, -8);
const ids1 = await s.army(1, 'hover_tank', 1, 300, 0);
await s.camera({ kind: 'fight', wMin: 480, wMax: 900, margin: 120, ground: 0.64, how: { move: 'cut' } });
await s.startClip(`${out}/clash.mp4`);
await s.frames(60);
await s.skip(5000);
await s.frames(90);
await s.endClip();
await s.close();
