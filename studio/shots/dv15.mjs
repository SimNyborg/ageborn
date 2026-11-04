// DV15 "the riders jump down" (devlog #15, a plot twist like DV3). Scouted on the sim 2026-11-04: 4 Spear Hunters
// kill the Mammoth Matriarch, its two riders drop off as Pebblers (riders ability, onDeathSpawn) and win.
//   a: impact (run, impact)   c: from the mammoth's last stand to the last Spear Hunter (last-stand, hero-death,
//   last-death, end)
import { recordDuel } from './duel.mjs';

const SPEC = { age: 'stone', bg: '2a2418', seed: 1, hero: 'mammoth_matriarch', horde: 'spear_hunter', n: 4, gap: -8, midAt: 4 };

async function ridersWin(s, out) {
  const fight = (how) => s.camera({ kind: 'fight', wMin: 470, wMax: 540, margin: 120, ground: 0.75, how });
  await fight({ move: 'cut' });
  await s.startClip(`${out}/c.mp4`, { part: 'riders' });
  s.mark('last-stand');
  await s.until((st) => !st.watched?.[0] || st.watched[0].hpBp <= 0, 1500);
  s.mark('hero-death');
  await s.timeScale(0.35, 150);
  await s.frames(45);
  await s.timeScale(1, 400);
  await fight({ move: 'spring', halfLife: 300 });
  await s.until((st) => st.sides[0].units === 0, 2400);
  s.mark('last-death');
  await s.timeScale(0.4, 150);
  await s.frames(30);
  await s.timeScale(1, 400);
  await s.frames(40);
  s.mark('end');
  await s.endClip();
}

export async function record(ctx) {
  await recordDuel(ctx, SPEC, { finale: ridersWin });
}
