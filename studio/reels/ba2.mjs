// BA2 edit: "Ageborn gets better #2: from flat paintings to living scenes" (owner direction 2026-10-22: the game
// improving). The same small battle per age filmed with the older painted backdrop and with the round-2 scene
// (shots/ba2.mjs): Medieval (Misty Moor) and Future (Skyway Metropolis). The two scenes held back for round 3 are
// mentioned, never shown (RUNBOOK). Narration from work/ba2 (scripts/narrate.py).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/ba2/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/ba2/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('ba2', { bg: '#1c1712', grade: { contrast: 1.04, saturate: 1.08, brightness: 1.0 } });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const WIDE = { layout: 'wide', wide: { y: 900, scale: 1.75, backdrop: 'radial-gradient(ellipse at 50% 45%, #3a3428 0%, #1c1914 60%, #0e0c0a 100%)' } };
  const look = (extra = {}) => ({ ...WIDE, origin: [540, 900], ...extra });
  const fit = (clip, from, to, dur, lk) => T.add(clip, from, to, { rate: (to - from) / dur, look: lk });

  const mOld = loadClip('ba2', 'medieval-old');
  const mNew = loadClip('ba2', 'medieval-new');
  const fOld = loadClip('ba2', 'future-old');
  const fNew = loadClip('ba2', 'future-new');

  // W0 the old medieval painting
  const s0 = fit(mOld, 0, 140, at('l1'), look({ zoom: [1.0, 1.06] }));
  // W1-W2 the same battle in Misty Moor, through the meeting of the two lines
  const s1 = fit(mNew, 0, mNew.frames, at('l3') - T.t, look({ cutIn: 'flash', zoom: [1.0, 1.08] }));
  // W3 future: the old skyline, then the city
  const half = Math.floor((at('l4') - T.t) / 2);
  const s3a = fit(fOld, 20, 110, half, look({ cutIn: 'punch' }));
  const s3b = fit(fNew, 20, fNew.frames, at('l4') - T.t, look({ cutIn: 'flash', zoom: [1.0, 1.06] }));
  // W4 back to the moor, wide
  const s4 = fit(mNew, 60, mNew.frames, at('l5') - T.t, look({ cutIn: 'punch', zoom: [1.1, 1.0] }));
  // W5 the question over the city, then the end card
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(fNew, fNew.frames - 1, fNew.frames, { look: { ...WIDE, freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(fNew, fNew.frames - 1, fNew.frames, { look: { ...WIDE, freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, at('l1') - 4, { text: 'AGEBORN GETS BETTER #2', y: 200, color: '#ffd466', size: 48 });
  for (const [s, text, color] of [[s0, 'BEFORE', '#ff8a7a'], [s1, 'AFTER', '#7dffb0'], [s3a, 'BEFORE', '#ff8a7a'], [s3b, 'AFTER', '#7dffb0']]) {
    T.overlay('badge', s.at + 2, s.dur - 2, { text, y: 300, color, size: 66 });
  }
  T.overlay('title', 0, at('l1'), { y: 1420, stagger: 4, lines: [{ text: 'My battlefields', size: 96, fill: 'white' }, { text: 'were flat paintings', size: 84, fill: 'orange', gap: 4 }] });
  T.overlay('flash', s1.at, 8, { color: '#ffffff', peak: 0.5 });
  T.overlay('title', s1.at + 4, at('l2') - s1.at - 4, { y: 1420, burst: true, stagger: 4, lines: [{ text: 'Now: 3D scenes', size: 110, fill: 'gold' }, { text: 'with depth and life', size: 84, fill: 'white', gap: 4 }] });
  T.overlay('title', at('l2'), at('l3') - at('l2'), { y: 1420, burst: true, lines: [{ text: 'Same battle', size: 120, fill: 'white' }] });
  T.overlay('badge', s3a.at + 2, at('l4') - s3a.at - 2, { text: 'FUTURE AGE', y: 200, color: '#c27bff', size: 52 });
  T.overlay('flash', s3b.at, 8, { color: '#ffffff', peak: 0.5 });
  T.overlay('title', s3b.at + 4, at('l4') - s3b.at - 4, { y: 1420, burst: true, lines: [{ text: 'A whole city', size: 130, fill: 'gold' }] });
  T.overlay('title', s4.at + 2, at('l5') - s4.at - 2, { y: 1420, burst: true, stagger: 4, lines: [{ text: '2 scenes', size: 120, fill: 'white' }, { text: 'back to the drawing board', size: 76, fill: 'orange', gap: 4 }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 1400, burst: true, stagger: 4, lines: [{ text: 'Old or new?', size: 140, fill: 'gold' }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 1640, burst: true, lines: [{ text: 'Comment below', size: 76, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Ageborn gets better every week.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1640, size: 44 }));

  // --- sound ----------------------------------------------------------------------------------
  T.music('music.medieval', 0, s3a.at, { from: 20, gainDb: -3, fadeIn: 0.5, fadeOut: 0.4 });
  T.music('music.future', s3a.at, total - s3a.at, { from: 20, gainDb: -3, fadeIn: 0.4, fadeOut: 1.2 });
  T.mix.config = { musicDb: -14, sfxDb: -10, accentDb: -6, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('ui_whoosh', s1.at, { gainDb: -6 });
  T.accent('ui_whoosh', s3b.at, { gainDb: -6 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/ba2/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'ba2-from-flat-paintings-to-living-scenes', cover: 0.3 };
}
