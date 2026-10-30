// DV10 "the soldiers that can't look up" (devlog #10, indie-dev angle). Scouted on the sim 2026-10-30: the
// Mothership (Cosmic Legendary, air) is never hurt by 8 Star Legionnaires (melee never hits air, DESIGN A2) and flies
// past them; 5 Ion Rangers (they shoot air) bring it down and lose one. Cosmic has no banned backdrop.
//   pass markers: run, contact      counter markers: run, contact, death, end
import { mkdirSync } from 'node:fs';

const TALL = { width: 540, height: 960, dpr: 2 };
const Q = 'left=cosmic&right=cosmic&seed=1&bg=1d1828&numbers=important';

async function stage(open, horde, n) {
  const s = await open({ ...TALL, query: Q });
  await s.army(0, horde, n, 780, -8);
  const [ship] = await s.army(1, 'mothership', 1, 790, 0);
  await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: 800 });
  await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 800 });
  await s.skip(1500);
  s.watch({ ids: [ship] });
  await s.camera({ kind: 'look', x: 990, w: 560, ground: 0.72, how: { move: 'cut' } });
  await s.issue({ t: 'stance', side: 0, mode: 'charge' });
  await s.issue({ t: 'stance', side: 1, mode: 'charge' });
  return [s, ship];
}

export async function record({ open, out }) {
  mkdirSync(out, { recursive: true });
  // pass: the swords swing at nothing; the ship keeps flying
  {
    const [s, ship] = await stage(open, 'star_legionnaire', 8);
    await s.camera({ kind: 'fight', wMin: 540, wMax: 620, margin: 140, ground: 0.72, how: { move: 'spring', halfLife: 300 } });
    await s.startClip(`${out}/pass.mp4`, { part: 'pass' });
    s.mark('run');
    await s.until((st, ev) => ev.some((e) => e.ev.e === 'hit'), 200);
    s.mark('contact');
    await s.frames(120);
    await s.camera({ kind: 'track', id: ship, w: 600, lead: 0.15, ground: 0.72, how: { move: 'ease', ms: 900 } });
    await s.frames(90);
    await s.endClip();
    await s.close();
  }
  // counter: rangers shoot it down
  {
    const [s, ship] = await stage(open, 'ion_ranger', 5);
    await s.camera({ kind: 'fight', wMin: 520, wMax: 600, margin: 140, ground: 0.72, how: { move: 'spring', halfLife: 300 } });
    await s.startClip(`${out}/counter.mp4`, { part: 'counter' });
    s.mark('run');
    await s.until((st, ev) => ev.some((e) => e.ev.e === 'hit'), 200);
    s.mark('contact');
    await s.until((st) => !st.watched?.[0] || st.watched[0].hpBp <= 0, 1200);
    s.mark('death');
    await s.timeScale(0.35, 150);
    await s.frames(45);
    await s.timeScale(1, 400);
    await s.frames(45);
    s.mark('end');
    await s.endClip();
    await s.close();
  }
}
