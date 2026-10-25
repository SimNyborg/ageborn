// BA2 "Ageborn gets better #2: from flat paintings to living scenes" (owner direction 2026-10-22). The same
// small battle filmed twice per age, landscape: `scenes=game` is the age's older painted backdrop, `scenes=best`
// the round-2 Blender scene (Misty Moor, Skyway Metropolis; docs/PROGRESS.md of 63d5865). Only ages whose new
// scene is released and allowed: never Stone or Modern (their scenes are held back, RUNBOOK).
// Clips: <age>-old and <age>-new, each a slow pan across the lane while two small armies meet. Marker: meet.
const WIDE = { width: 960, height: 540, dpr: 2 };
const AGES = [
  { age: 'medieval', unit: 'footman', bg: '2a2824' },
  { age: 'future', unit: 'pulse_trooper', bg: '20242e' },
];

async function film({ open, out }, { age, unit, bg }, look) {
  const s = await open({ ...WIDE, query: `left=${age}&right=${age}&seed=3&bg=${bg}&numbers=off&bars=0${look === 'old' ? '&scenes=game' : ''}` });
  await s.army(0, unit, 4, 700, -16);
  await s.army(1, unit, 4, 700, -16);
  await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: 760 });
  await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 760 });
  await s.skip(1200);
  await s.camera({ kind: 'look', x: 760, w: 1300, ground: 0.8, how: { move: 'cut' } });
  await s.issue({ t: 'stance', side: 0, mode: 'charge' });
  await s.issue({ t: 'stance', side: 1, mode: 'charge' });
  await s.startClip(`${out}/${age}-${look}.mp4`, { part: look });
  await s.camera({ kind: 'look', x: 1240, w: 1100, ground: 0.8, how: { move: 'ease', ms: 6000 } });
  await s.frames(100);
  s.mark('meet');
  await s.frames(110);
  await s.endClip();
  await s.close();
}

export async function record(ctx) {
  for (const a of AGES) {
    if (ctx.only && !ctx.only.startsWith(a.age)) continue;
    for (const look of ['old', 'new']) if (!ctx.only || ctx.only === a.age || ctx.only === `${a.age}-${look}`) await film(ctx, a, look);
  }
}
