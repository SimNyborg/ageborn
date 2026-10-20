// Shared recorder for short "1 Legendary vs N" duels (R7, R8): a real battle on the game's sim, filmed
// as three clips so the edit can open cold on the impact. Scout the matchup first (tools/scout.ts).
//   a: the last steps of the charge and the impact (slowed)      markers: run, impact
//   b: a snapshot mid-fight, when about half the horde is gone   markers: mid
//   c: the finale, the last enemy falls (slowed), the hero holds  markers: last-one, last-death

const TALL = { width: 540, height: 960, dpr: 2 };
const hasHit = (ev) => ev.some((e) => e.ev.e === 'hit');

async function skipUntil(s, pred, maxMs = 120_000) {
  let st = await s.state();
  for (let t = 0; t < maxMs && !pred(st); t += 250) st = await s.skip(250);
  return st;
}

/**
 * spec: { age, bg, seed, hero, horde, n, gap }
 * The horde is side 0 (left), the hero side 1 (right), placed as in the scouted clash.
 */
export async function recordDuel({ open, out }, spec) {
  const s = await open({ ...TALL, query: `left=${spec.age}&right=${spec.age}&seed=${spec.seed ?? 1}&bg=${spec.bg}&numbers=important${['stone', 'modern'].includes(spec.age) ? '&scenes=game' : ''}` });
  await s.army(0, spec.horde, spec.n, 780, spec.gap ?? -8);
  const [hero] = await s.army(1, spec.hero, 1, 790, 0);
  await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: 800 });
  await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 800 });
  await s.skip(1500);
  s.watch({ ids: [hero] });

  // a: the charge's last steps and the impact
  await s.camera({ kind: 'look', x: 990, w: 520, ground: 0.75, how: { move: 'cut' } });
  await s.issue({ t: 'stance', side: 0, mode: 'charge' });
  await s.issue({ t: 'stance', side: 1, mode: 'charge' });
  await s.camera({ kind: 'fight', wMin: 470, wMax: 540, margin: 120, ground: 0.75, how: { move: 'spring', halfLife: 280 } });
  await s.startClip(`${out}/a.mp4`, { part: 'impact' });
  s.mark('run');
  await s.until((st, ev) => hasHit(ev), 200);
  s.mark('impact');
  await s.timeScale(0.32, 80);
  await s.camera({ kind: 'track', id: hero, w: 450, lead: 0.05, ground: 0.75, how: { move: 'ease', ms: 500 } });
  await s.frames(48);
  await s.timeScale(1, 400);
  await s.frames(30);
  await s.endClip();

  // b: mid-fight
  const half = Math.ceil(spec.n / 2);
  await skipUntil(s, (st) => st.sides[0].units <= half);
  await s.camera({ kind: 'fight', wMin: 460, wMax: 520, margin: 110, ground: 0.75, how: { move: 'cut' }, drift: -10 });
  await s.startClip(`${out}/b.mp4`, { part: 'mid' });
  s.mark('mid');
  await s.frames(36);
  await s.endClip();

  // c: the finale
  await skipUntil(s, (st) => st.sides[0].units <= 2);
  await s.camera({ kind: 'track', id: hero, w: 460, lead: 0.12, ground: 0.75, how: { move: 'cut' } });
  await s.startClip(`${out}/c.mp4`, { part: 'finale' });
  await s.until((st) => st.sides[0].units <= 1, 400);
  s.mark('last-one');
  await s.timeScale(0.4, 200);
  await s.camera({ kind: 'track', id: hero, w: 410, lead: 0.1, ground: 0.75, how: { move: 'ease', ms: 900 } });
  await s.until((st) => st.sides[0].units === 0, 500);
  s.mark('last-death');
  await s.frames(18);
  await s.timeScale(1, 500);
  await s.camera({ kind: 'track', id: hero, w: 380, lead: 0.03, ground: 0.75, how: { move: 'ease', ms: 1400 } });
  await s.frames(50);
  await s.endClip();
  await s.close();
}
