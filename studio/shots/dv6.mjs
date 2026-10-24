// DV6 "I found a broken Legendary" (devlog #6, indie-dev angle). Scouted on the sim 2026-10-24: the Star
// Leviathan (cost 350, a ranged heavy that stays behind its front line) beats 3 Star Legionnaires (cost 150) with
// about 10% HP but falls to 4 (cost 200) after killing only 2; every other Legendary scouted so far beats 6-13
// commons of its age. Clip sets: dv6/w3* (3 Legionnaires, the Leviathan wins, standard duel clips) and dv6/l4*
// (4 Legionnaires, the Leviathan falls; c follows the fight to its death and the Moonlings it leaves).
//   l4c markers: last-stand, hero-death, end
import { mkdirSync } from 'node:fs';
import { recordDuel } from './duel.mjs';

const BASE = { age: 'cosmic', bg: '1d1828', seed: 1, hero: 'star_leviathan', horde: 'star_legionnaire', gap: -8 };

async function skipUntil(s, pred, maxMs = 120_000) {
  let st = await s.state();
  for (let t = 0; t < maxMs && !pred(st); t += 250) st = await s.skip(250);
  return st;
}

async function heroFalls(s, out) {
  await skipUntil(s, (st) => st.sides[0].units <= 3);
  const fight = (w, how) => s.camera({ kind: 'fight', wMin: w, wMax: w + 60, margin: 120, ground: 0.75, how });
  await fight(460, { move: 'cut' });
  await s.startClip(`${out}/c.mp4`, { part: 'falls' });
  s.mark('last-stand');
  await s.until((st) => st.sides[1].units !== 1, 900);
  s.mark('hero-death');
  await s.timeScale(0.35, 150);
  await s.frames(50);
  await s.timeScale(1, 400);
  await s.frames(60);
  s.mark('end');
  await s.endClip();
}

export async function record(ctx) {
  for (const d of ['w3', 'l4']) mkdirSync(`${ctx.out}/${d}`, { recursive: true });
  if (ctx.only !== 'l4') await recordDuel({ ...ctx, out: `${ctx.out}/w3` }, { ...BASE, n: 3 });
  if (ctx.only !== 'w3') await recordDuel({ ...ctx, out: `${ctx.out}/l4` }, { ...BASE, n: 4 }, { finale: heroFalls });
}
