// DV18 "hold the line or charge?" (developer dilemma). Scouted on the sim 2026-11-11: 6 Bonkers vs the Elk Chieftain;
// charging, the Bonkers win with 2 left (4 lost); holding at p 700, they win with 4 left (2 lost).
//   <mode>/a: run, contact     <mode>/c: last-stand, hero-death, end
import { mkdirSync } from 'node:fs';

const TALL = { width: 540, height: 960, dpr: 2 };
const Q = 'left=stone&right=stone&seed=1&bg=2a2418&numbers=important&scenes=game';

async function take({ open, out }, mode) {
  const dir = `${out}/${mode}`;
  mkdirSync(dir, { recursive: true });
  const s = await open({ ...TALL, query: Q });
  await s.army(0, 'bonker', 6, 780, -8);
  const [elk] = await s.army(1, 'elk_chieftain', 1, 790, 0);
  await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: mode === 'hold' ? 700 : 800 });
  await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 800 });
  await s.skip(1500);
  s.watch({ ids: [elk] });
  await s.camera({ kind: 'look', x: 990, w: 560, ground: 0.75, how: { move: 'cut' } });
  if (mode === 'charge') await s.issue({ t: 'stance', side: 0, mode: 'charge' });
  await s.issue({ t: 'stance', side: 1, mode: 'charge' });
  await s.camera({ kind: 'fight', wMin: 500, wMax: 580, margin: 130, ground: 0.75, how: { move: 'spring', halfLife: 300 } });
  await s.startClip(`${dir}/a.mp4`, { part: mode });
  s.mark('run');
  await s.until((st, ev) => ev.some((e) => e.ev.e === 'hit'), 400);
  s.mark('contact');
  await s.frames(60);
  await s.endClip();
  await s.startClip(`${dir}/c.mp4`, { part: `${mode}-end` });
  s.mark('last-stand');
  await s.until((st) => !st.watched?.[0] || st.watched[0].hpBp <= 0, 1800);
  s.mark('hero-death');
  await s.timeScale(0.35, 150);
  await s.frames(40);
  await s.timeScale(1, 400);
  await s.frames(50);
  s.mark('end');
  await s.endClip();
  await s.close();
}

export async function record(ctx) {
  await take(ctx, 'charge');
  await take(ctx, 'hold');
}
