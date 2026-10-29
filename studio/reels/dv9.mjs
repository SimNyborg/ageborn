// DV9 edit: "Devlog #9: what my game really sees" (owner direction 2026-10-22; owner rule 2026-10-27: a plainly bad
// "before"). Step 0 is the game's own Bot viewer, which draws the simulation as plain squares (work/dv9/rec.mjs, a
// panning crop by work/dv9/pan.py); then the same kind of battle with its art (R16 footage). True to the design:
// the simulation owns all timing and the art is swappable (DESIGN B2/B5). Narration from work/dv9.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv9/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv9/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv9', { bg: '#1b1a2e' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - from) / dur, look });

  const sq = loadClip('dv9', 'squares');
  const ra = loadClip('r16', 'a');
  const rb = loadClip('r16', 'b');
  const rc = loadClip('r16', 'c');

  // step 0: the squares, silent, through the first two lines
  const s0 = fit(sq, 0, sq.frames, at('l2'), {});
  // the costume: the same kind of battle with its art, the Lindworm's charge
  const s1 = fit(ra, ra.m('impact') - 30, ra.frames, at('l3') - T.t, { cutIn: 'flash', shakes: [{ at: 30, dur: 14, amp: 18 }], zoom: [1.06, 1.0], origin: [540, 1250] });
  // redraw a unit, the battle stays: the approach, the middle, the finale (r16 c starts at the last death)
  const s2a = fit(ra, 0, 45, F(1.5), { cutIn: 'punch' });
  fit(rb, 0, rb.frames, F(1.2), { cutIn: 'punch' });
  fit(rc, 0, rc.frames, at('l4') - T.t, { cutIn: 'punch' });
  const s2 = { at: s2a.at, dur: T.t - s2a.at };
  // the question on a held frame, then the end card
  const holdSrc = rc.frames - 1;
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(rc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(rc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, at('l2') - 4, { text: 'DEVLOG #9', y: 200, color: '#ffd466', size: 52 });
  T.overlay('badge', 4, at('l2') - 4, { text: 'WHAT THE GAME SEES', y: 300, color: '#9fe7ff', size: 56 });
  T.overlay('title', 0, at('l1'), { y: 560, stagger: 4, lines: [{ text: 'This is', size: 120, fill: 'white' }, { text: 'my game', size: 150, fill: 'orange', gap: 4 }] });
  T.overlay('title', at('l1'), at('l2') - at('l1'), { y: 560, burst: true, stagger: 4, lines: [{ text: 'position', size: 96, fill: 'white' }, { text: 'health', size: 96, fill: 'white', gap: 4 }, { text: 'timing', size: 96, fill: 'white', gap: 4 }] });
  T.overlay('flash', s1.at, 8, { color: '#ffffff', peak: 0.6 });
  T.overlay('badge', s1.at + 2, qAt - s1.at - 2, { text: 'WHAT YOU SEE', y: 300, color: '#ff9a4a', size: 56 });
  T.overlay('title', s1.at + 4, s1.dur - 4, { y: 520, burst: true, lines: [{ text: 'The costume', size: 130, fill: 'gold' }] });
  T.overlay('title', s2.at + 2, s2.dur - 2, { y: 520, burst: true, stagger: 4, lines: [{ text: 'New art,', size: 110, fill: 'white' }, { text: 'same battle', size: 120, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 520, burst: true, stagger: 4, lines: [{ text: 'More from', size: 110, fill: 'white' }, { text: 'under the hood?', size: 110, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one system at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound: the squares are silent; music and the battle come in with the costume -------------------
  T.music('music.medieval', s1.at, total - s1.at, { from: 20, gainDb: -4, fadeIn: 0.8, fadeOut: 1.2 });
  T.mix.config = { musicDb: -16, sfxDb: -7, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv9/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv9-devlog-9-what-my-game-really-sees', cover: 0.03 };
}
