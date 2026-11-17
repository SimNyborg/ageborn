// DV19 edit: "Devlog #19: one soldier, eight ages" (owner note 2026-11-12: development across the ages, art and
// animation; owner note 2026-11-10: no subtitles). Each age's basic infantry in its own scene (shots/dv19.mjs):
// the Stone walk-in under the setup, a fast idle flicker through all eight looks, then one hit per age on its name.
// Narration: ElevenLabs Steve, eleven_v4, one take (work/dv19).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv19/offsets.json', import.meta.url)));
const AGES = [
  ['stone', 'STONE AGE', 'Bonker'],
  ['bronze', 'BRONZE AGE', 'Hoplite'],
  ['medieval', 'MEDIEVAL', 'Footman'],
  ['gunpowder', 'GUNPOWDER', 'Corsair'],
  ['industrial', 'INDUSTRIAL', 'Riveter'],
  ['modern', 'MODERN', 'Trench Raider'],
  ['future', 'FUTURE', 'Photon Knight'],
  ['cosmic', 'COSMIC', 'Star Legionnaire'],
];

export async function edit() {
  const T = new Timeline('dv19', { bg: '#1f1c18' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, Math.max(0, from), Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - Math.max(0, from)) / dur, look });
  const clips = AGES.map(([age]) => loadClip('dv19', age));
  const stone = clips[0];
  const cosmic = clips[7];

  // the setup: the Bonker stands, walks in, and lands its first hit on "hit something"
  const s0 = fit(stone, 0, stone.m('contact'), at('hit'), { zoom: [1.0, 1.05], origin: [540, 1150] });
  const s1 = fit(stone, stone.m('contact'), stone.m('contact') + 30, at('l1') - T.t, { cutIn: 'flash', shakes: [{ at: 0, dur: 10, amp: 12 }] });
  // "each one had to belong to its age": the idle pose of all eight, one after another
  const flick = [];
  const fl = Math.floor((at('n0') - at('l1')) / 8);
  for (let k = 0; k < 8; k++) {
    const c = clips[k];
    flick.push(fit(c, 4, 4 + fl, k === 7 ? at('n0') - T.t : fl, { cutIn: 'punch' }));
  }
  // the roll call: each soldier lands a hit on its own name
  const names = [];
  for (let k = 0; k < 8; k++) {
    const c = clips[k];
    const end = k === 7 ? at('l2') : at(`n${k + 1}`);
    const lead = k === 7 ? 40 : 18;
    names.push(fit(c, c.m('contact') - lead, c.m('contact') + 22, end - T.t, { cutIn: 'flash' }));
  }
  // "Eight soldiers. One job.": the Star Legionnaire keeps fighting
  const s3 = fit(cosmic, cosmic.m('contact') + 22, cosmic.frames, at('l3') - T.t, { cutIn: 'punch', zoom: [1.0, 1.06], origin: [540, 1150] });
  // the question on a held frame, then the end card
  const qAt = T.t;
  const qDur = F(OFF.end + 1.0) - qAt;
  T.add(cosmic, cosmic.frames - 1, cosmic.frames, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(cosmic, cosmic.frames - 1, cosmic.frames, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  T.overlay('badge', 4, flick[0].at - 4, { text: 'DEVLOG #19', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 0, s1.at, { y: 470, stagger: 4, lines: [{ text: 'One soldier.', size: 120, fill: 'white' }, { text: 'Eight ages.', size: 130, fill: 'gold', gap: 6 }] });
  T.overlay('flash', s1.at, 6, { peak: 0.5 });
  T.overlay('badge', flick[0].at + 2, names[0].at - flick[0].at - 2, { text: 'SAME JOB  NEW LOOK', y: 300, color: '#9fe7ff', size: 58 });
  for (let k = 0; k < 8; k++) {
    const n = names[k];
    const next = k === 7 ? s3.at : names[k + 1].at;
    T.overlay('badge', n.at + 1, next - n.at - 1, { text: AGES[k][1], y: 300, color: '#ffd466', size: 58 });
    T.overlay('title', n.at + 1, next - n.at - 1, { y: 470, burst: true, lines: [{ text: AGES[k][2], size: AGES[k][2].length > 12 ? 104 : 124, fill: 'white' }] });
  }
  T.overlay('title', s3.at + 2, qAt - s3.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: '8 soldiers', size: 130, fill: 'white' }, { text: '1 job', size: 150, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Which one', size: 140, fill: 'gold' }, { text: 'is yours?', size: 140, fill: 'white', gap: 4 }] });
  T.overlay('title', qAt + F(0.8), endAt - qAt - F(0.8), { y: 800, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one age at a time.', cta: 'FOLLOW THE DEVLOG' });

  T.music('music.medieval', 0, total, { from: 10, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -17, sfxDb: -10, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv19/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv19-one-soldier-eight-ages', cover: 0.3 };
}
