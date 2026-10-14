// R4 "Stone Age to Cosmic Age": one base evolving through all eight ages (the game's own Ascension:
// the base morphs, the backdrop half wipes to the new age, the age's vanguard marches out).

const TALL = { width: 540, height: 960, dpr: 2 };
const AGES = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

export async function record({ open, out }) {
  const s = await open({ ...TALL, query: 'left=stone&right=stone&seed=4&bg=241d18&numbers=off&bars=0&edge=90' });
  // every age's vanguard (its infantry common) is held ahead, so no troop appears without its art
  // the art runs about 100 lu past the world's end (edge=90), so the whole base stays in frame
  await s.camera({ kind: 'base', side: 0, w: 520, inset: 0.36, ground: 0.74, how: { move: 'cut' } });
  await s.startClip(`${out}/evolve.mp4`, { part: 'eight ages' });
  s.mark('age-stone');
  await s.frames(30);
  for (let i = 1; i < AGES.length; i++) {
    const age = AGES[i];
    await s.dev('evolve', 0);
    let up = false;
    s.mark(`evolve-${age}`);
    // the Ascension (2.5 s) a little faster, then a beat on the new age
    await s.timeScale(1.25, 0);
    await s.until((st, ev) => (up = up || ev.some((e) => e.ev.e === 'ageUp' && e.ev.side === 0)), 200);
    s.mark(`age-${age}`);
    await s.timeScale(1, 0);
    await s.frames(i === AGES.length - 1 ? 20 : 14);
  }
  // the Cosmic base, a slow pull back while its troops march out
  s.mark('final');
  await s.camera({ kind: 'base', side: 0, w: 600, inset: 0.34, ground: 0.7, how: { move: 'ease', ms: 2200 } });
  await s.frames(75);
  await s.endClip();
  await s.close();
}
