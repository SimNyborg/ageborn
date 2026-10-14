// R3 "A knight on a war bear": the Ursa Paladin (Medieval Legendary) cleaves through a wave of enemies
// while its roar shields the allies around it. A real battle on the game's sim.

const TALL = { width: 540, height: 960, dpr: 2 };

export async function record({ open, out }) {
  const s = await open({ ...TALL, query: 'left=medieval&right=medieval&seed=5&bg=2a2824&numbers=important' });
  const [paladin] = await s.army(0, 'ursa_paladin', 1, 640, 0);
  await s.army(0, 'footman', 3, 590, -22);
  await s.army(0, 'longbowman', 2, 520, -20);
  await s.army(1, 'footman', 6, 760, -18);
  await s.army(1, 'pikeman', 2, 650, -20);
  await s.army(1, 'crossbowman', 3, 600, -18);
  await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: 700 });
  await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 760 });
  await s.skip(1200);
  s.watch({ ids: [paladin] });

  // the reveal: a close-up of the bear knight, then a pull back to the battle line
  await s.camera({ kind: 'track', id: paladin, w: 360, lead: 0.05, ground: 0.76, how: { move: 'cut' }, drift: -8 });
  await s.startClip(`${out}/paladin.mp4`, { part: 'reveal and battle' });
  s.mark('reveal');
  await s.frames(54);
  s.mark('pull');
  await s.camera({ kind: 'track', id: paladin, w: 520, lead: 0.08, ground: 0.75, how: { move: 'ease', ms: 700 } });
  await s.frames(24);
  s.mark('charge');
  await s.issue({ t: 'stance', side: 0, mode: 'charge' });
  await s.issue({ t: 'stance', side: 1, mode: 'charge' });
  // contact: the roar (it shields the allies around it as the fight starts) and the first cleaves, slowed
  let contact = false;
  await s.until((st, ev) => (contact = contact || ev.some((e) => (e.ev.e === 'abilityUsed' && e.ev.id === paladin) || (e.ev.e === 'hit' && e.ev.sourceId === paladin))), 240);
  s.mark('contact');
  await s.timeScale(0.32, 80);
  await s.camera({ kind: 'track', id: paladin, w: 470, lead: 0.06, ground: 0.75, how: { move: 'ease', ms: 600 } });
  await s.frames(48);
  await s.timeScale(1, 500);
  s.mark('rampage');
  await s.camera({ kind: 'track', id: paladin, w: 550, lead: 0.1, ground: 0.75, how: { move: 'ease', ms: 900 } });
  await s.frames(150);
  await s.endClip();
  await s.close();
}
