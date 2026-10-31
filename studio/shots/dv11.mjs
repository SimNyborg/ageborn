// DV11 "one soldier is the whole difference" (devlog #11). Same setup as R18 (Stone Age, scenes=game): the Elk
// Chieftain beats 5 Bonkers (R18 clips) but falls to 6 (scouted 2026-10-29: two Bonkers left). This records the 6.
//   l6 c markers: last-stand, hero-death, end
import { recordDuel } from './duel.mjs';

async function heroFalls(s, out) {
  await s.camera({ kind: 'fight', wMin: 460, wMax: 520, margin: 120, ground: 0.75, how: { move: 'cut' } });
  await s.startClip(`${out}/c.mp4`, { part: 'falls' });
  s.mark('last-stand');
  await s.until((st) => !st.watched?.[0] || st.watched[0].hpBp <= 0, 900);
  s.mark('hero-death');
  await s.timeScale(0.35, 150);
  await s.frames(50);
  await s.timeScale(1, 400);
  await s.frames(50);
  s.mark('end');
  await s.endClip();
}

export async function record(ctx) {
  await recordDuel(ctx, { age: 'stone', bg: '2a2418', seed: 1, hero: 'elk_chieftain', horde: 'bonker', n: 6, gap: -8, midAt: 4 }, { finale: heroFalls });
}
