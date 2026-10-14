// R5 "Pick one": three Legendary beasts from three ages, each filmed in a short real fight: the
// Mammoth Matriarch (Stone), the Lindworm (Medieval dragon) and the Star Leviathan (Cosmic).

const TALL = { width: 540, height: 960, dpr: 2 };

const BEASTS = [
  { name: 'mammoth', age: 'stone', card: 'mammoth_matriarch', allies: [['bonker', 2]], foes: [['bonker', 5], ['pebbler', 2], ['tuskback', 1]], bg: '2c241c' },
  { name: 'lindworm', age: 'medieval', card: 'lindworm', allies: [['footman', 2]], foes: [['footman', 5], ['crossbowman', 2], ['destrier_knight', 1]], bg: '2a2824' },
  { name: 'leviathan', age: 'cosmic', card: 'star_leviathan', allies: [['star_legionnaire', 2]], foes: [['star_legionnaire', 4], ['ion_ranger', 2], ['hover_tank', 1]], bg: '1d1828' },
];

export async function record({ open, out, only }) {
  for (const b of BEASTS) {
    if (only && only !== b.name) continue;
    const s = await open({ ...TALL, query: `left=${b.age}&right=${b.age}&seed=9&bg=${b.bg}&numbers=important` });
    const [hero] = await s.army(0, b.card, 1, 700, 0);
    let p = 660;
    for (const [card, n] of b.allies) {
      await s.army(0, card, n, p, -22);
      p -= n * 22;
    }
    let q = 760;
    for (const [card, n] of b.foes) {
      await s.army(1, card, n, q, -20);
      q -= n * 20 + 10;
    }
    await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: 720 });
    await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 780 });
    await s.skip(1000);
    s.watch({ ids: [hero] });
    // the beast up close, then the charge and its first attacks
    await s.camera({ kind: 'track', id: hero, w: 420, lead: 0.1, ground: 0.76, how: { move: 'cut' }, drift: -10 });
    await s.startClip(`${out}/${b.name}.mp4`, { part: `${b.card} in action` });
    s.mark('intro');
    await s.frames(36);
    s.mark('charge');
    await s.issue({ t: 'stance', side: 0, mode: 'charge' });
    await s.issue({ t: 'stance', side: 1, mode: 'charge' });
    await s.camera({ kind: 'track', id: hero, w: 520, lead: 0.1, ground: 0.75, how: { move: 'ease', ms: 800 } });
    let hit = false;
    await s.until((st, ev) => (hit = hit || ev.some((e) => e.ev.e === 'hit' && e.ev.sourceId === hero)), 200);
    s.mark('hit');
    await s.timeScale(0.35, 80);
    await s.frames(36);
    await s.timeScale(1, 400);
    s.mark('fight');
    await s.frames(96);
    await s.endClip();
    await s.close();
  }
}
