// Battle stills for the carousel and Stories: each Legendary in its own age's scene, mid-fight, at
// the art's full resolution (1080x1350 for slides, 1080x1920 for Stories). Several candidates per unit
// are saved (public/stills/<name>-<k>.png); the slide picks one.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PUBLIC } from '../lib/config.mjs';

export const STILLS = [
  { name: 'mammoth', age: 'stone', card: 'mammoth_matriarch', foes: [['bonker', 4], ['tuskback', 1]], bg: '2c241c' },
  { name: 'hydra', age: 'bronze', card: 'hydra', foes: [['hoplite', 4], ['war_chariot', 1]], bg: '2d2a24' },
  { name: 'paladin', age: 'medieval', card: 'ursa_paladin', foes: [['footman', 4], ['pikeman', 1]], bg: '2a2824' },
  { name: 'behemoth', age: 'modern', card: 'behemoth_tank', foes: [['rifleman', 4], ['tankette', 1]], bg: '26241f' },
  { name: 'leviathan', age: 'cosmic', card: 'star_leviathan', foes: [['star_legionnaire', 4], ['hover_tank', 1]], bg: '1d1828' },
  { name: 'titan', age: 'future', card: 'chrono_titan', foes: [['photon_knight', 4], ['walker_mech', 1]], bg: '1f2126' },
];

export async function record({ open, only }) {
  const dir = path.join(PUBLIC, 'stills');
  mkdirSync(dir, { recursive: true });
  for (const st of STILLS) {
    if (only && only !== st.name) continue;
    for (const [fmt, size, ground] of [
      ['slide', { width: 540, height: 675 }, 0.76],
      ['story', { width: 540, height: 960 }, 0.7],
    ]) {
      const s = await open({ ...size, dpr: 2, query: `left=${st.age}&right=${st.age}&seed=11&bg=${st.bg}&numbers=off&bars=0` });
      const [hero] = await s.army(0, st.card, 1, 720, 0);
      let q = 740;
      for (const [card, n] of st.foes) {
        await s.army(1, card, n, q, -22);
        q -= n * 22 + 10;
      }
      await s.issue({ t: 'stance', side: 0, mode: 'hold', holdP: 760 });
      await s.issue({ t: 'stance', side: 1, mode: 'hold', holdP: 760 });
      await s.camera({ kind: 'track', id: hero, w: fmt === 'slide' ? 430 : 470, lead: 0.12, ground, how: { move: 'cut' } });
      await s.skip(800);
      // an idle hero shot, then the fight: snapshots spread over it
      const save = async (k) => {
        await s.eval(() => window.__capture.step(1));
        const d = await s.eval(() => window.__capture.snap('image/png'));
        writeFileSync(path.join(dir, `${st.name}-${fmt}-${k}.png`), Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
      };
      await save(0);
      await s.issue({ t: 'stance', side: 0, mode: 'charge' });
      await s.issue({ t: 'stance', side: 1, mode: 'charge' });
      for (let k = 1; k <= 6; k++) {
        await s.skip(k === 1 ? 1400 : 450);
        await save(k);
      }
      await s.close();
      console.log(`stills: ${st.name} ${fmt}`);
    }
  }
}
