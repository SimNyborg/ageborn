// BA1 edit: "Ageborn gets better #1: the home screen comes alive" (owner direction 2026-10-22: indie-dev angle,
// the game improving). Before/after of Home's floating island in the opponent-found state, filmed frame-exact
// with a fake clock (work/ba1/frames.mjs): before = 63d5865 (portrait busts on a CSS bob, stiff flags), after =
// 2dbc183 (game item 37: the real battle sheets idling, cloth flags on both poles). The story follows the game's
// own notes (docs/decisions.md, "troops and flags move naturally outside battle"): the owner found the troops
// unnatural, and the first fix's micro-walks read as twitches. Narration from work/ba1 (scripts/narrate.py).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/ba1/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/ba1/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('ba1', { bg: '#1c1712', grade: { contrast: 1.04, saturate: 1.08, brightness: 1.0 } });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const WIDE = { layout: 'wide', wide: { y: 960, scale: 1.35, backdrop: 'radial-gradient(ellipse at 50% 45%, #4a3a2c 0%, #2a2018 55%, #120e0a 100%)' } };
  const look = (extra = {}) => ({ ...WIDE, origin: [540, 960], ...extra });

  const before = loadClip('ba1', 'before');
  const after = loadClip('ba1', 'after');

  // W0-W1 before: the busts bob, the flags stand stiff (zoom in on the troops, then on the flag)
  const w2 = at('l2');
  const b0 = T.add(before, 30, 30 + at('l1'), { look: look({ zoom: [1.0, 1.25], origin: [430, 960] }) });
  const b1 = T.add(before, 30 + at('l1'), 30 + w2, { look: look({ cutIn: 'punch', zoom: [1.3, 1.45], origin: [330, 880] }) });
  // W2 after: the same island, alive (wide, then closer)
  const a0 = T.add(after, 30, 30 + (at('l3') - w2), { look: look({ cutIn: 'flash', zoom: [1.0, 1.2], origin: [540, 960] }) });
  // W3 "the first try twitched": stay on the troops, closer
  const a1From = 30 + (at('l3') - w2);
  const a1 = T.add(after, a1From, a1From + (at('l4') - at('l3')), { look: look({ cutIn: 'punch', zoom: [1.35, 1.45], origin: [420, 990] }) });
  // W4 now calm: both sides
  const a2From = a1From + (at('l4') - at('l3'));
  const a2 = T.add(after, a2From, a2From + (at('l5') - at('l4')), { look: look({ cutIn: 'punch', zoom: [1.15, 1.05], origin: [540, 980] }) });
  // W5 the question over the island, then the end card
  const qFrom = a2From + (at('l5') - at('l4'));
  const qDur = F(OFF.end + 0.9) - T.t;
  const q = T.add(after, qFrom, Math.min(after.frames, qFrom + qDur), { look: look({ zoom: [1.0, 0.95] }) });
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(after, q.end - q.at + qFrom - 1, q.end - q.at + qFrom, { look: { ...WIDE, freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, w2 - 4, { text: 'AGEBORN GETS BETTER #1', y: 200, color: '#ffd466', size: 48 });
  T.overlay('badge', b0.at + 2, w2 - b0.at - 2, { text: 'BEFORE', y: 300, color: '#ff8a7a', size: 66 });
  T.overlay('title', 0, at('l1'), { y: 1430, stagger: 4, lines: [{ text: 'My home screen', size: 88, fill: 'white' }, { text: 'looked like cardboard', size: 76, fill: 'orange', gap: 4 }] });
  T.overlay('title', b1.at + 2, w2 - b1.at - 2, { y: 1430, burst: true, lines: [{ text: 'Stiff flags', size: 130, fill: 'orange' }] });
  T.overlay('flash', a0.at, 8, { color: '#ffffff', peak: 0.5 });
  T.overlay('badge', a0.at + 2, total - a0.at - 2 - (total - endAt), { text: 'AFTER', y: 300, color: '#7dffb0', size: 66 });
  T.overlay('title', a0.at + 4, at('l3') - a0.at - 4, { y: 1430, burst: true, stagger: 4, lines: [{ text: 'Real battle troops', size: 100, fill: 'white' }, { text: 'and real cloth', size: 96, fill: 'gold', gap: 4 }] });
  T.overlay('title', a1.at + 2, a1.dur - 2, { y: 1430, burst: true, stagger: 4, lines: [{ text: 'First try:', size: 96, fill: 'white' }, { text: 'TWITCHY', size: 150, fill: 'orange', gap: 4 }] });
  T.overlay('title', a2.at + 2, a2.dur - 2, { y: 1430, burst: true, lines: [{ text: 'Now: calm', size: 140, fill: 'gold' }] });
  T.overlay('title', q.at + 2, endAt - q.at - 2, { y: 1400, burst: true, stagger: 4, lines: [{ text: 'What should I', size: 104, fill: 'white' }, { text: 'bring to life next?', size: 100, fill: 'gold', gap: 4 }] });
  T.overlay('title', q.at + F(1.4), endAt - q.at - F(1.4), { y: 1660, burst: true, lines: [{ text: 'Comment below', size: 76, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Ageborn gets better every week.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1640, size: 44 }));

  // --- sound: the island is silent in the game, so narration over a soft music bed ---------------------
  T.music('music.gunpowder', 0, total, { from: 10, gainDb: -3, fadeIn: 0.5, fadeOut: 1.2 });
  T.mix.config = { musicDb: -14, sfxDb: -9, accentDb: -6, sidechainDb: 6, exclude: [] };
  T.accent('ui_whoosh', a0.at, { gainDb: -6 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/ba1/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'ba1-my-home-screen-comes-alive', cover: 0.4 };
}
