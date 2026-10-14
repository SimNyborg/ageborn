// R2 "The most satisfying base collapse": three bases fall (the game's runtime fracture, debris and
// sounds), each filmed from just before the last hit, the break in slow motion.

const TALL = { width: 540, height: 960, dpr: 2 };

/** The attackers per age: Heavies and the Legendary, already at the enemy gate. */
const PLANS = {
  medieval: { army: [['destrier_knight', 2], ['footman', 2]], bg: '2c2a26' },
  industrial: { army: [['steam_golem', 2], ['riveter', 2]], bg: '25221d' },
  cosmic: { army: [['hover_tank', 1], ['star_legionnaire', 3]], bg: '1d1828' },
  bronze: { army: [['war_chariot', 2], ['hoplite', 2]], bg: '2d2a24' },
};

export async function record({ open, out, only }) {
  for (const [age, plan] of Object.entries(PLANS)) {
    if (only && only !== age) continue;
    const s = await open({ ...TALL, query: `left=${age}&right=${age}&seed=7&bg=${plan.bg}&numbers=off&bars=0&edge=90` });
    // the attackers start a few steps from the enemy gate (own-side progress ~1,750-1,900)
    let p = 1860;
    for (const [card, n] of plan.army) {
      await s.army(0, card, n, p, -30);
      p -= n * 30 + 10;
    }
    await s.dev('baseBp', 1, 260);
    // the art runs about 100 lu past the world's end (edge=90), so the base can sit right of centre
    await s.camera({ kind: 'base', side: 1, w: 560, inset: 0.36, ground: 0.74, how: { move: 'cut' }, drift: -8 });
    await s.skip(400);
    await s.startClip(`${out}/${age}.mp4`, { part: `${age} base falls` });
    let ended = false;
    await s.until((st, ev) => (ended = ended || ev.some((e) => e.ev.e === 'matchEnded')), 360);
    s.mark('break');
    // the game slows the break itself (0.38x for ~1 s); the capture adds a slower beat on top
    await s.timeScale(0.55, 120);
    await s.frames(54);
    await s.timeScale(1, 700);
    s.mark('fall');
    await s.frames(66);
    await s.endClip();
    await s.close();
  }
}
