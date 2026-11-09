// DV16 edit: "Devlog #16: air against air" (indie-dev angle, a balance question). The Mothership (Legendary, 2100 HP,
// cost 350) cannot be touched by swords (DV10 footage), yet 2 Star Fighters (Epic, cost 200 each) shoot it down in
// about 13 s and both survive (shots/dv16.mjs, scouted on the sim). Narration: ElevenLabs Steve, eleven_v4, one take
// (work/dv16, offsets from the connector's word timings).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv16/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv16/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv16', { bg: '#1d1828' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - from) / dur, look });

  const pass = loadClip('dv10', 'pass');
  const a = loadClip('dv16', 'a');
  const c = loadClip('dv16', 'c');
  const death = c.m('hero-death');

  // the Legendary, untouchable by swords
  const s0a = fit(a, 0, 60, F(3.2), { zoom: [1.0, 1.08], origin: [700, 1100] });
  const s0b = fit(pass, 80, 180, at('l1') - T.t, { cutIn: 'punch' });
  // two fighters go after it
  const s1 = fit(a, 40, a.frames, at('l2') - T.t, { cutIn: 'flash' });
  // it doesn't last long
  const s2 = fit(c, death - 60, death + 20, at('l3') - T.t, { cutIn: 'punch', zoom: [1.05, 1.12], origin: [700, 1100] });
  const deathAt = s2.map(death);
  // both fighters fly on
  const s3 = fit(c, death + 20, c.frames, at('l4') - T.t, {});
  // the question on a held frame, then the end card
  const holdSrc = c.frames - 1;
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(c, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(c, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, s1.at - 4, { text: 'DEVLOG #16', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 0, s0b.at, { y: 470, stagger: 4, lines: [{ text: 'Legendary', size: 130, fill: 'gold' }, { text: '2100 health', size: 110, fill: 'white', gap: 4 }] });
  T.overlay('title', s0b.at + 2, s1.at - s0b.at - 2, { y: 470, burst: true, lines: [{ text: 'Swords: 0 damage', size: 110, fill: 'white' }] });
  T.overlay('flash', s1.at, 8, { color: '#ffffff', peak: 0.5 });
  T.overlay('title', s1.at + 4, s2.at - s1.at - 4, { y: 470, burst: true, stagger: 4, lines: [{ text: '2 Star Fighters', size: 120, fill: 'blue' }] });
  T.overlay('flash', deathAt, 8, { peak: 0.7 });
  T.overlay('title', deathAt + 2, s3.at - deathAt - 2, { y: 470, burst: true, lines: [{ text: 'DOWN', size: 170, fill: 'gold' }] });
  T.overlay('title', s3.at + 2, qAt - s3.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Fighters lost', size: 120, fill: 'white' }, { text: 'nothing', size: 130, fill: 'orange', gap: 4 }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Legendary too weak?', size: 96, fill: 'gold' }, { text: 'Or fighters too strong?', size: 86, fill: 'white', gap: 6 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one fight at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound: low music with a soft fade-in, the battle's own sound -------------------------------
  T.music('music.cosmic', 0, total, { from: 20, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -17, sfxDb: -9, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv16/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv16-devlog-16-air-against-air', cover: 0.5 };
}
