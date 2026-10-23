// DV5 edit: "Devlog #5: why my battles look flat" (owner direction 2026-10-22: indie-dev angle, the game
// improving). The "before" half of game item 38 (docs/owner-queue.md, 2026-10-18: the battles look undramatic;
// the plan is a frame-by-frame diagnosis, then stronger poses, impact and deaths with weight). Footage is the real
// current battle animation from filmed duels, slowed down; the questions on screen are the diagnosis's own checks,
// asked, not answered. Ends on a promise of the after and an open question. Narration from work/dv5.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv5/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv5/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv5', { bg: '#1c1712' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, to, { rate: (to - from) / dur, look });
  const slow = (clip, mid, span, dur, look = {}) => fit(clip, Math.max(0, mid - span), Math.min(clip.frames, mid + span), dur, look);

  const colossus = loadClip('r15', 'a');
  const marshal = loadClip('r14', 'a');
  const bear = loadClip('r8', 'a');
  const titan = loadClip('r12', 'a');
  const tank = loadClip('r13', 'c');
  const hydra = loadClip('r7', 'c');
  const colEnd = loadClip('r15', 'c');

  // W0 cold open: a clash at near real speed
  const s0 = slow(colossus, colossus.m('impact'), 40, at('l1'), { zoom: [1.06, 1.0], origin: [540, 1300], shakes: [{ at: Math.round(at('l1') / 2), dur: 12, amp: 14 }] });
  // W1 frame by frame: the marshal's impact at about 1/4 speed
  const s1 = slow(marshal, marshal.m('impact'), 22, at('l2') - T.t, { cutIn: 'punch', zoom: [1.1, 1.3], origin: [540, 1250] });
  // W2 does the hit land, does anyone flinch: the bear knight's impact, slower still
  const s2 = slow(bear, bear.m('impact'), 18, at('l3') - T.t, { cutIn: 'punch', zoom: [1.2, 1.35], origin: [540, 1250] });
  // W3 the wind-up (the titan) and the fall (the tank's last enemy)
  const half = Math.floor((at('l4') - T.t) / 2);
  const s3a = slow(titan, titan.m('impact'), 16, half, { cutIn: 'punch', zoom: [1.2, 1.3], origin: [540, 1250] });
  const s3b = slow(tank, tank.m('last-death'), 16, at('l4') - T.t, { cutIn: 'punch', zoom: [1.2, 1.3], origin: [540, 1250] });
  // W4 the fix to come: two finales at real speed
  const half4 = Math.floor((at('l5') - T.t) / 2);
  const s4a = slow(hydra, hydra.m('last-death'), 30, half4, { cutIn: 'whip' });
  const s4b = slow(colEnd, colEnd.m('last-death'), 30, at('l5') - T.t, { cutIn: 'punch' });
  // W5 the question on a held frame, then the end card
  const holdSrc = Math.min(colEnd.frames - 1, colEnd.m('last-death') + 29);
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(colEnd, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(colEnd, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('badge', 4, at('l1') - 4, { text: 'DEVLOG #5', y: 210, color: '#ffd466', size: 52 });
  T.overlay('title', 0, at('l1'), { y: 520, stagger: 4, lines: [{ text: 'My battles look', size: 104, fill: 'white' }, { text: 'kind of flat', size: 120, fill: 'orange', gap: 4 }] });
  T.overlay('badge', s1.at + 2, s1.dur - 2, { text: 'FRAME BY FRAME', y: 300, color: '#9fe7ff', size: 60 });
  const checks = [
    [s2.at + 2, s2.at + Math.floor(s2.dur / 2), 'Does the hit land?'],
    [s2.at + Math.floor(s2.dur / 2), s2.end, 'Does anyone flinch?'],
    [s3a.at + 2, s3a.end, 'A wind-up first?'],
    [s3b.at + 2, s3b.end, 'Does the fall feel heavy?'],
  ];
  for (const [from, to, text] of checks) {
    T.overlay('title', from, to - from, { y: 520, burst: true, lines: [{ text, size: text.length > 20 ? 78 : 96, fill: 'gold' }] });
    T.overlay('flash', from, 4, { peak: 0.25 });
  }
  T.overlay('badge', s2.at + 2, s3b.end - s2.at - 2, { text: 'DIAGNOSIS', y: 300, color: '#ff8a7a', size: 60 });
  T.overlay('title', s4a.at + 2, at('l5') - s4a.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Next: the fix', size: 120, fill: 'white' }, { text: 'before & after soon', size: 92, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'What makes a hit', size: 104, fill: 'white' }, { text: 'feel good?', size: 140, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + F(1.6), endAt - qAt - F(1.6), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Ageborn gets better every week.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound: the battle's own hits under the narration, a low bed ---------------------------------
  T.music('music.bronze', 0, total, { from: 20, gainDb: -3, fadeIn: 0.3, fadeOut: 1.2 });
  T.mix.config = { musicDb: -15, sfxDb: -8, accentDb: -6, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv5/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv5-devlog-5-why-my-battles-look-flat', cover: 0.35 };
}
