// DV11 edit: "Devlog #11: one caveman is the whole difference" (indie-dev angle, a twist). The same Stone Age fight
// twice: the Elk Chieftain beats 5 Bonkers with 7% left (R18 clips), then falls to 6 (shots/dv11.mjs, scouted on
// the sim). Narration from work/dv11.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv11/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv11/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv11', { bg: '#2a2418' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, Math.max(0, from), Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - Math.max(0, from)) / dur, look });

  const wa = loadClip('r18', 'a');
  const wc = loadClip('r18', 'c');
  const la = loadClip('dv11', 'a');
  const lb = loadClip('dv11', 'b');
  const lc = loadClip('dv11', 'c');

  // five: the charge, then the elk's win
  const s0a = fit(wa, wa.m('impact') - 30, wa.m('impact') + 50, F(3.0), { shakes: [{ at: 30, dur: 12, amp: 14 }] });
  const s0b = fit(wc, wc.m('last-death') - 60, wc.m('last-death') + 40, at('l1') - T.t, { cutIn: 'punch' });
  // six: the same charge, the middle of the fight
  const s1a = fit(la, la.m('impact') - 30, la.m('impact') + 50, F(2.7), { cutIn: 'flash', shakes: [{ at: 30, dur: 12, amp: 14 }] });
  const s1b = fit(lb, 0, lb.frames, at('l2') - T.t, { cutIn: 'punch' });
  // it falls, then the Bonkers stand
  const s2 = fit(lc, lc.m('hero-death') - 20, lc.m('hero-death') + 40, at('l3') - T.t, { cutIn: 'punch', zoom: [1.05, 1.12], origin: [540, 1250] });
  const deathAt = s2.map(lc.m('hero-death'));
  const s3 = fit(lc, lc.m('hero-death') + 40, lc.frames, at('l4') - T.t, {});
  // the question on a held frame, then the end card
  const holdSrc = lc.frames - 1;
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(lc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(lc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, s1a.at - 4, { text: 'DEVLOG #11', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 0, s0b.at, { y: 470, stagger: 4, lines: [{ text: '5 cavemen', size: 130, fill: 'white' }, { text: 'vs 1 elk', size: 110, fill: 'orange', gap: 4 }] });
  T.overlay('title', s0b.at + 2, s1a.at - s0b.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Elk wins', size: 140, fill: 'gold' }, { text: '7% left', size: 100, fill: 'white', gap: 4 }] });
  T.overlay('flash', s1a.at, 8, { color: '#ffffff', peak: 0.5 });
  T.overlay('title', s1a.at + 4, deathAt - s1a.at - 4, { y: 470, burst: true, stagger: 4, lines: [{ text: '+1 caveman', size: 120, fill: 'orange' }, { text: 'same elk', size: 100, fill: 'white', gap: 4 }] });
  T.overlay('badge', s1a.at + 2, qAt - s1a.at - 2, { text: '6 CAVEMEN', y: 300, color: '#ff8a7a', size: 62 });
  T.overlay('flash', deathAt, 8, { peak: 0.7 });
  T.overlay('title', deathAt + 2, qAt - deathAt - 2, { y: 470, burst: true, lines: [{ text: 'Elk falls', size: 150, fill: 'gold' }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Worth more', size: 120, fill: 'gold' }, { text: 'than five?', size: 110, fill: 'white', gap: 4 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one fight at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound: low music with a soft fade-in, the battle's own sound -------------------------------
  T.music('music.stone', 0, total, { from: 20, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -16, sfxDb: -8, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv11/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv11-devlog-11-one-caveman-is-the-whole-difference', cover: 0.4 };
}
