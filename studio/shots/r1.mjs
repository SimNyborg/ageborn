// R1 "40 cavemen vs 1 Cosmic tank": a real battle on the game's sim (scouted with tools/scout.ts):
// 40 Bonkers lose to one Hover Tank, which survives on 4% HP; 6 Spear Hunters (anti-armour) beat it.
// Tall 1080x1920 captures; jump cuts are recorded as separate clips (the sim runs on between them).

const TALL = { width: 540, height: 960, dpr: 2 };
const BG = '2c241c';

/** Stance hold for both sides at their flag (own-side progress), so the armies stand face to face. */
async function holdBoth(s) {
  await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: 800 });
  await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 800 });
}
async function chargeBoth(s) {
  await s.issue({ t: 'stance', side: 0, mode: 'charge' });
  await s.issue({ t: 'stance', side: 1, mode: 'charge' });
}
const hasHit = (ev) => ev.some((e) => e.ev.e === 'hit');
const alive = (st, side) => st.sides[side].units;

/** Skips game time in 0.5 s steps until `pred(state)` holds (or `maxMs`). */
async function skipUntil(s, pred, maxMs = 120_000) {
  let st = await s.state();
  for (let t = 0; t < maxMs && !pred(st); t += 500) st = await s.skip(500);
  return st;
}

export async function record({ open, out, only }) {
  const want = (k) => !only || only === k;
  if (want('horde')) {
    const s = await open({ ...TALL, query: `left=stone&right=cosmic&seed=1&bg=${BG}&numbers=important` });
    await s.army(0, 'bonker', 40, 780, -8);
    await s.army(1, 'hover_tank', 1, 790, 0);
    await holdBoth(s);
    await s.skip(1500);
    s.watch({ cards: ['hover_tank'] });

    // a: the hook (the tank, the horde, both), the charge and the impact in slow motion
    await s.camera({ kind: 'look', x: 1212, w: 330, ground: 0.75, how: { move: 'cut' }, drift: -8 });
    await s.startClip(`${out}/a.mp4`, { part: 'hook and impact' });
    s.mark('tank');
    await s.frames(40);
    s.mark('horde');
    await s.camera({ kind: 'look', x: 615, w: 540, ground: 0.75, how: { move: 'ease', ms: 360 }, drift: 10 });
    await s.frames(40);
    s.mark('both');
    await s.camera({ kind: 'look', x: 985, w: 570, ground: 0.75, how: { move: 'ease', ms: 420 } });
    await s.frames(36);
    s.mark('charge');
    await chargeBoth(s);
    await s.camera({ kind: 'fight', wMin: 500, wMax: 570, margin: 130, ground: 0.75, how: { move: 'spring', halfLife: 320 } });
    await s.until((st, ev) => hasHit(ev), 200);
    s.mark('impact');
    await s.timeScale(0.3, 100);
    await s.camera({ kind: 'fight', wMin: 460, wMax: 540, margin: 110, ground: 0.75, how: { move: 'spring', halfLife: 260 } });
    await s.frames(40);
    await s.timeScale(1, 450);
    s.mark('impact-end');
    await s.frames(45);
    await s.endClip();

    // b1..b3: the grind, three snapshots as the horde melts away
    const shots = [
      { name: 'b1', count: 31, cam: { kind: 'track', id: null, w: 450, lead: 0.22, ground: 0.75 } },
      { name: 'b2', count: 21, cam: { kind: 'fight', wMin: 540, wMax: 570, margin: 160, ground: 0.75 } },
      { name: 'b3', count: 11, cam: { kind: 'army', side: 0, wMin: 470, wMax: 540, margin: 80, ground: 0.75 } },
    ];
    const tank = (await s.units({ cards: ['hover_tank'] }))[0];
    for (const shot of shots) {
      await skipUntil(s, (st) => alive(st, 0) <= shot.count);
      const cam = shot.cam.kind === 'track' ? { ...shot.cam, id: tank.id } : shot.cam;
      await s.camera({ ...cam, how: { move: 'cut' }, drift: -10 });
      await s.startClip(`${out}/${shot.name}.mp4`, { part: `grind ${shot.count}` });
      await s.frames(40);
      await s.endClip();
    }

    // c: the finale: the last cavemen fall in slow motion, the tank holds on 4%
    await skipUntil(s, (st) => alive(st, 0) <= 3);
    await s.camera({ kind: 'fight', wMin: 460, wMax: 540, margin: 120, ground: 0.75, how: { move: 'cut' } });
    await s.startClip(`${out}/c.mp4`, { part: 'finale' });
    await s.until((st) => alive(st, 0) <= 1, 400);
    s.mark('last-one');
    await s.timeScale(0.4, 200);
    await s.camera({ kind: 'track', id: tank.id, w: 420, lead: 0.15, ground: 0.75, how: { move: 'ease', ms: 900 } });
    await s.until((st) => alive(st, 0) === 0, 400);
    s.mark('last-death');
    await s.frames(18);
    await s.timeScale(1, 500);
    await s.camera({ kind: 'track', id: tank.id, w: 380, lead: 0.04, ground: 0.75, how: { move: 'ease', ms: 1600 } });
    await s.frames(60);
    await s.endClip();
    await s.close();
  }

  if (want('spears')) {
    // d: six Spear Hunters (anti-armour) against a fresh tank
    const s = await open({ ...TALL, query: `left=stone&right=cosmic&seed=2&bg=${BG}&numbers=important` });
    await s.army(0, 'spear_hunter', 6, 780, -16);
    await s.army(1, 'hover_tank', 1, 790, 0);
    await holdBoth(s);
    await s.skip(1500);
    s.watch({ cards: ['hover_tank'] });
    const tank = (await s.units({ cards: ['hover_tank'] }))[0];
    await s.camera({ kind: 'look', x: 700, w: 440, ground: 0.75, how: { move: 'cut' }, drift: -12 });
    await s.startClip(`${out}/d1.mp4`, { part: 'spear hunters charge' });
    s.mark('spears');
    await s.frames(45);
    s.mark('charge');
    await chargeBoth(s);
    await s.camera({ kind: 'fight', wMin: 470, wMax: 560, margin: 130, ground: 0.75, how: { move: 'spring', halfLife: 320 } });
    await s.until((st, ev) => hasHit(ev), 200);
    s.mark('impact');
    await s.timeScale(0.35, 100);
    await s.frames(36);
    await s.timeScale(1, 400);
    await s.frames(40);
    await s.endClip();

    // run on until the tank is low, then film its end
    for (let t = 0; t < 30_000; t += 250) {
      const u = (await s.units({ cards: ['hover_tank'] }))[0];
      if (!u || u.hpBp < 2600) break;
      await s.skip(250);
    }
    await s.camera({ kind: 'track', id: tank.id, w: 460, lead: 0.2, ground: 0.75, how: { move: 'cut' } });
    await s.startClip(`${out}/d2.mp4`, { part: 'the tank falls' });
    let dead = false;
    await s.until((x, ev) => (dead = dead || ev.some((e) => e.ev.e === 'died' && e.ev.card === 'hover_tank')), 300);
    s.mark('tank-dies');
    await s.timeScale(0.3, 80);
    await s.frames(40);
    await s.timeScale(1, 600);
    await s.camera({ kind: 'army', side: 0, wMin: 440, wMax: 500, margin: 90, ground: 0.75, how: { move: 'ease', ms: 1200 } });
    await s.frames(45);
    await s.endClip();
    await s.close();
  }
}
