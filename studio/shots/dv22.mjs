// DV22 "one heavy, eight ages" (devlog #22, owner note 2026-11-12: development across the ages; T3 after DV19's
// breakout). Each age's common heavy in its own scene against three of that age's basic infantry: a short idle,
// the walk forward, the first hits.
// Stone and Modern use `scenes=game` (never Glacier Valley or Desert Airbase).
//   <age>.mp4 marks: idle, walk, contact, end
export const AGES = [
  { age: 'stone', unit: 'tuskback', foe: 'bonker', bg: '2c241c' },
  { age: 'bronze', unit: 'war_chariot', foe: 'hoplite', bg: '2d2a24' },
  { age: 'medieval', unit: 'destrier_knight', foe: 'footman', bg: '2a2824' },
  { age: 'gunpowder', unit: 'cuirassier', foe: 'corsair', bg: '2a2620' },
  { age: 'industrial', unit: 'steam_golem', foe: 'riveter', bg: '26231f' },
  { age: 'modern', unit: 'tankette', foe: 'trench_raider', bg: '26241f' },
  { age: 'future', unit: 'walker_mech', foe: 'photon_knight', bg: '1f2126' },
  { age: 'cosmic', unit: 'hover_tank', foe: 'star_legionnaire', bg: '1d1828' },
];

const TALL = { width: 540, height: 960, dpr: 2 };

export async function record({ open, out, only }) {
  for (const a of AGES) {
    if (only && only !== a.age) continue;
    const scenes = ['stone', 'modern'].includes(a.age) ? '&scenes=game' : '';
    const s = await open({ ...TALL, query: `left=${a.age}&right=${a.age}&seed=5&bg=${a.bg}&numbers=off&bars=0${scenes}` });
    const [hero] = await s.army(0, a.unit, 1, 760, 0);
    await s.army(1, a.foe, 3, 820, -24);
    await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: 760 });
    await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 820 });
    await s.skip(900);
    s.watch({ ids: [hero] });
    await s.camera({ kind: 'track', id: hero, w: 360, lead: 0.2, ground: 0.68, how: { move: 'cut' } });
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
