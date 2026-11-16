// DV19 "one soldier, eight ages" (devlog #19, owner note 2026-11-12: development across the ages). Each age's basic
// infantry (the common melee unit) in its own scene: a short idle, the walk forward, the first hits on a same-age foe.
// Stone and Modern use `scenes=game` (never Glacier Valley or Desert Airbase).
//   <age>.mp4 marks: idle, walk, contact, end
export const AGES = [
  { age: 'stone', unit: 'bonker', bg: '2c241c' },
  { age: 'bronze', unit: 'hoplite', bg: '2d2a24' },
  { age: 'medieval', unit: 'footman', bg: '2a2824' },
  { age: 'gunpowder', unit: 'corsair', bg: '2a2620' },
  { age: 'industrial', unit: 'riveter', bg: '26231f' },
  { age: 'modern', unit: 'trench_raider', bg: '26241f' },
  { age: 'future', unit: 'photon_knight', bg: '1f2126' },
  { age: 'cosmic', unit: 'star_legionnaire', bg: '1d1828' },
];

const TALL = { width: 540, height: 960, dpr: 2 };

export async function record({ open, out, only }) {
  for (const a of AGES) {
    if (only && only !== a.age) continue;
    const scenes = ['stone', 'modern'].includes(a.age) ? '&scenes=game' : '';
    const s = await open({ ...TALL, query: `left=${a.age}&right=${a.age}&seed=5&bg=${a.bg}&numbers=off&bars=0${scenes}` });
    const [hero] = await s.army(0, a.unit, 1, 760, 0);
    await s.army(1, a.unit, 2, 820, -24);
    await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: 760 });
    await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 820 });
    await s.skip(900);
    s.watch({ ids: [hero] });
    await s.camera({ kind: 'track', id: hero, w: 420, lead: 0.18, ground: 0.72, how: { move: 'cut' } });
    await s.startClip(`${out}/${a.age}.mp4`, { part: a.age });
    s.mark('idle');
    await s.frames(36);
    await s.issue({ t: 'stance', side: 0, mode: 'charge' });
    await s.issue({ t: 'stance', side: 1, mode: 'charge' });
    s.mark('walk');
    await s.until((st, ev) => ev.some((e) => e.ev.e === 'hit'), 600);
    s.mark('contact');
    await s.frames(70);
    s.mark('end');
    await s.endClip();
    await s.close();
    console.log(`dv19: ${a.age}`);
  }
}
