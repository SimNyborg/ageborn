// DV10 edit: "Devlog #10: the soldiers that can't look up" (owner direction 2026-10-22: indie-dev angle; a visible
// problem first). 8 Star Legionnaires never hurt the Mothership (melee never hits air, DESIGN A2); 5 Ion Rangers,
// which shoot air, bring it down (shots/dv10.mjs, scouted on the sim). Narration from work/dv10.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv10/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv10/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv10', { bg: '#1d1828' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - from) / dur, look });

  const pass = loadClip('dv10', 'pass');
  const ctr = loadClip('dv10', 'counter');

  // the swords run in under the ship and swing at nothing
  const s0 = fit(pass, 0, 80, at('l1'), { zoom: [1.0, 1.06], origin: [540, 1150] });
  const s1 = fit(pass, 80, 180, at('l2') - T.t, {});
  // the rule, while the ship drifts on and leaves the swords behind (slow motion)
  const s2 = fit(pass, 150, pass.frames, at('l3') - T.t, { cutIn: 'punch', zoom: [1.12, 1.2], origin: [540, 1150] });
  // the counter: the rangers shoot it down
  const s3 = fit(ctr, 0, 300, at('l5') - T.t, { cutIn: 'flash' });
  const deathAt = s3.map(ctr.m('death'));
  // the question on a held frame, then the end card
  const holdSrc = ctr.frames - 1;
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(ctr, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(ctr, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, at('l2') - 4, { text: 'DEVLOG #10', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 0, at('l1'), { y: 470, stagger: 4, lines: [{ text: '8 swords', size: 130, fill: 'white' }, { text: 'vs 1 mothership', size: 86, fill: 'orange', gap: 4 }] });
  T.overlay('title', at('l1'), at('l2') - at('l1'), { y: 470, burst: true, lines: [{ text: '0 damage', size: 160, fill: 'gold' }] });
  const third = Math.floor(s2.dur / 3);
  [['GROUND', 'white'], ['AIR', 'blue'], ['OR BOTH', 'gold']].forEach(([text, fill], i) => T.overlay('title', s2.at + i * third + 2, third - 2, { y: 470, burst: true, lines: [{ text, size: 150, fill }] }));
  T.overlay('badge', s2.at + 2, s2.dur - 2, { text: 'EVERY ATTACK SAYS', y: 300, color: '#9fe7ff', size: 56 });
  T.overlay('flash', s3.at, 8, { color: '#ffffff', peak: 0.5 });
  T.overlay('title', s3.at + 4, deathAt - s3.at - 4, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Ion Rangers', size: 130, fill: 'blue' }, { text: 'shoot up', size: 110, fill: 'white', gap: 4 }] });
  T.overlay('flash', deathAt, 8, { peak: 0.7 });
  T.overlay('title', deathAt + 2, qAt - deathAt - 2, { y: 470, burst: true, lines: [{ text: 'DOWN', size: 170, fill: 'gold' }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Fair?', size: 150, fill: 'gold' }, { text: 'Or should swords hit air?', size: 80, fill: 'white', gap: 6 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one rule at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound: low music with a soft fade-in, the battle's own sound -------------------------------
  T.music('music.cosmic', 0, total, { from: 20, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -16, sfxDb: -8, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv10/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv10-devlog-10-the-soldiers-that-cant-look-up', cover: 0.12 };
}
