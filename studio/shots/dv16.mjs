// DV16 "air vs air" (devlog #16). Scouted on the sim 2026-11-09: 2 Star Fighters (Epic, cost 200 each) shoot down
// the Mothership (Legendary, cost 350, 2100 HP) in about 13 s and both survive.
//   c markers: last-stand, hero-death, end
import { recordDuel } from './duel.mjs';

async function heroFalls(s, out) {
  await s.camera({ kind: 'fight', wMin: 520, wMax: 600, margin: 140, ground: 0.72, how: { move: 'cut' } });
  await s.startClip(`${out}/c.mp4`, { part: 'falls' });
  s.mark('last-stand');
  await s.until((st) => !st.watched?.[0] || st.watched[0].hpBp <= 0, 1200);
  s.mark('hero-death');
  await s.timeScale(0.35, 150);
  await s.frames(45);
  await s.timeScale(1, 400);
  await s.frames(45);
  s.mark('end');
  await s.endClip();
}

export async function record(ctx) {
  await recordDuel(ctx, { age: 'cosmic', bg: '1d1828', seed: 1, hero: 'mothership', horde: 'star_fighter', n: 2, gap: -8, midAt: 2 }, { finale: heroFalls });
}
