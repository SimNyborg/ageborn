// DV3 "the plot twist" (devlog #3, the B option of devlog #1's vote): 1 Land Dreadnought vs 7 Riveters
// (Industrial Age). Scouted on the sim 2026-10-21: the Dreadnought falls after about 23 s with 2 Riveters
// left, its crew bails out as 2 Carbineers and wins (one at 16 % HP). Filmed like a duel (shots/duel.mjs)
// for a and b; c follows the fight through the wreck, the bail-out and the last Riveter.
//   c markers: last-stand, hero-death, crew, last-one, last-death
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'industrial', bg: '262220', seed: 1, hero: 'land_dreadnought', horde: 'riveter', n: 7, gap: -8 };

async function skipUntil(s, pred, maxMs = 120_000) {
  let st = await s.state();
  for (let t = 0; t < maxMs && !pred(st); t += 250) st = await s.skip(250);
  return st;
}

export async function record(ctx) {
  await recordDuel(ctx, SPEC, { finale: twistFinale });
}

/** The finale for the twist: the hero falls, the crew bails out and finishes the horde. */
async function twistFinale(s, out, hero) {
  await skipUntil(s, (st) => st.sides[0].units <= 3);
  const fight = (w, how) => s.camera({ kind: 'fight', wMin: w, wMax: w + 60, margin: 120, ground: 0.75, how });
  await fight(460, { move: 'cut' });
  await s.startClip(`${out}/c.mp4`, { part: 'twist' });
  s.mark('last-stand');
  await s.until((st) => st.sides[1].units !== 1, 900);
  s.mark('hero-death');
  await s.timeScale(0.35, 150);
  await fight(420, { move: 'ease', ms: 700 });
  await s.until((st) => st.sides[1].units >= 2, 200);
  s.mark('crew');
  await s.frames(40);
  await s.timeScale(1, 400);
  await s.until((st) => st.sides[0].units <= 1, 600);
  s.mark('last-one');
  await s.timeScale(0.4, 200);
  await s.until((st) => st.sides[0].units === 0, 600);
  s.mark('last-death');
  await s.frames(18);
  await s.timeScale(1, 500);
  await fight(400, { move: 'ease', ms: 1200 });
  await s.frames(50);
  await s.endClip();
}
