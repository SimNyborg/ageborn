// DV7 edit: "Devlog #7: how I made a base collapse feel good" (owner direction 2026-10-22: indie-dev angle).
// The true story of game item 22 (docs/owner-queue.md, 2026-10-07: "base destruction is weak: it just sinks a
// little, goes semi-transparent and squashes"), fixed with a runtime fracture, fire, per-age debris and layered
// sounds. The old death is described, not shown (no capture of it exists); every shot is the real current game
// (shots/r2.mjs: Medieval, Industrial, Cosmic). Narration from work/dv7 (scripts/narrate.py).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv7/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv7/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv7', { bg: '#1c1712' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, Math.max(0, from), Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - Math.max(0, from)) / dur, look });

  const med = loadClip('r2', 'medieval');
  const ind = loadClip('r2', 'industrial');
  const cos = loadClip('r2', 'cosmic');
  const brk = (c) => c.m('break');

  // W0-W1 the siege before the break: soldiers hammer at the keep (the old death is only told)
  const s0 = fit(med, 20, brk(med) - 20, at('l2'), { zoom: [1.0, 1.12], origin: [540, 1100] });
  // W2 the question: the moment before, slowed right down
  const s2 = fit(ind, brk(ind) - 50, brk(ind) - 6, at('l3') - T.t, { cutIn: 'punch', zoom: [1.05, 1.2], origin: [540, 1100] });
  // W3 it cracks, burns, breaks: the medieval keep falls in slow motion
  const s3 = fit(med, brk(med) - 6, med.frames, at('l4') - T.t, { cutIn: 'flash', zoom: [1.12, 1.0], origin: [540, 1100], shakes: [{ at: 6, dur: 18, amp: 24 }] });
  const break3 = s3.map(brk(med));
  // W4 every age its own way: the factory, then the space spire
  const half = Math.floor((F(OFF.end + 0.2) - T.t) / 2);
  const s4a = fit(ind, brk(ind) - 4, ind.frames, half, { cutIn: 'punch', shakes: [{ at: 4, dur: 14, amp: 18 }] });
  const s4b = fit(cos, brk(cos) - 4, cos.frames, F(OFF.end + 0.9) - T.t, { cutIn: 'punch', shakes: [{ at: 4, dur: 14, amp: 18 }] });
  // the question on a held frame, then the end card
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(cos, cos.frames - 1, cos.frames, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('badge', 4, at('l1') - 4, { text: 'DEVLOG #7', y: 210, color: '#ffd466', size: 52 });
  T.overlay('title', 0, at('l1'), { y: 520, stagger: 4, lines: [{ text: 'My bases used to', size: 96, fill: 'white' }, { text: 'just sink', size: 140, fill: 'orange', gap: 4 }] });
  T.overlay('title', at('l1'), at('l2') - at('l1'), { y: 520, burst: true, lines: [{ text: 'Boring.', size: 150, fill: 'white' }] });
  T.overlay('title', s2.at + 2, s2.dur - 2, { y: 520, burst: true, stagger: 4, lines: [{ text: 'How does a', size: 104, fill: 'white' }, { text: 'castle fall?', size: 130, fill: 'gold', gap: 4 }] });
  T.overlay('flash', break3, 8, { peak: 0.8 });
  const beat = Math.floor(s3.dur / 3);
  [['CRACK', 'white'], ['BURN', 'orange'], ['BREAK', 'gold']].forEach(([text, fill], i) => T.overlay('title', s3.at + i * beat + 2, beat - 2, { y: 520, burst: true, lines: [{ text, size: 170, fill }] }));
  T.overlay('badge', s4a.at + 1, s4a.dur - 1, { text: 'INDUSTRIAL AGE', y: 300, color: '#ff9a4a', size: 56 });
  T.overlay('badge', s4b.at + 1, endAt - s4b.at - 1, { text: 'COSMIC AGE', y: 300, color: '#c27bff', size: 56 });
  T.overlay('flash', s4a.at + 4, 6, { peak: 0.6 });
  T.overlay('flash', s4b.at + 4, 6, { peak: 0.6 });
  T.overlay('title', at('l5'), endAt - at('l5'), { y: 520, burst: true, stagger: 4, lines: [{ text: 'Your favourite?', size: 130, fill: 'gold' }, { text: 'Comment below', size: 76, fill: 'blue', gap: 8 }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one fix at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound: the game's own collapse sounds carry this one ------------------------------------------
  T.music('music.industrial', 0, total, { from: 20, gainDb: -4, fadeIn: 0.3, fadeOut: 1.2 });
  T.mix.config = { musicDb: -16, sfxDb: -4, accentDb: -6, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv7/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv7-devlog-7-making-a-base-collapse-feel-good', cover: 0.55 };
}
