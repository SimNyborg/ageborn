// DV15 edit: "Devlog #15: the riders jump down" (indie-dev angle, a plot twist like DV3). 4 Spear Hunters kill the
// Mammoth Matriarch; its two riders drop off as Pebblers (riders ability, onDeathSpawn) and win (shots/dv15.mjs,
// scouted on the sim). Narration from work/dv15.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv15/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv15/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv15', { bg: '#2a2418' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - from) / dur, look });

  const a = loadClip('dv15', 'a');
  const c = loadClip('dv15', 'c');
  const death = c.m('hero-death');
  const last = c.m('last-death');

  const s0 = fit(a, 0, a.frames, at('l1'), { shakes: [{ at: a.m('impact'), dur: 12, amp: 16 }] });
  const s1 = fit(c, death - 70, death + 20, at('l2') - T.t, { cutIn: 'punch' });
  const deathAt = s1.map(death);
  const s2 = fit(c, death + 20, last - 20, at('l3') - T.t, { cutIn: 'punch', zoom: [1.1, 1.2], origin: [540, 1250] });
  const s3 = fit(c, last - 20, last + 25, at('l4') - T.t, { cutIn: 'punch', zoom: [1.2, 1.25], origin: [540, 1250] });
  const winAt = s3.map(last);
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
  T.overlay('badge', 4, s1.at - 4, { text: 'DEVLOG #15', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 0, s1.at, { y: 470, stagger: 4, lines: [{ text: '4 beast hunters', size: 110, fill: 'blue' }, { text: 'vs 1 mammoth', size: 110, fill: 'orange', gap: 4 }] });
  T.overlay('flash', deathAt, 8, { peak: 0.7 });
  T.overlay('title', deathAt + 2, s2.at - deathAt - 2, { y: 470, burst: true, lines: [{ text: 'It falls', size: 160, fill: 'white' }] });
  T.overlay('title', s2.at + 4, s3.at - s2.at - 4, { y: 470, burst: true, stagger: 4, lines: [{ text: 'The riders', size: 130, fill: 'gold' }, { text: 'jump down', size: 120, fill: 'white', gap: 4 }] });
  T.overlay('flash', winAt, 8, { color: '#ffffff', peak: 0.6 });
  T.overlay('title', s3.at + 2, qAt - s3.at - 2, { y: 470, burst: true, lines: [{ text: 'They win', size: 170, fill: 'gold' }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Fair?', size: 150, fill: 'gold' }, { text: 'Or go down with it?', size: 86, fill: 'white', gap: 6 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one twist at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound: low music with a soft fade-in, the battle's own sound -------------------------------
  T.music('music.stone', 0, total, { from: 20, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -16, sfxDb: -8, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv15/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv15-devlog-15-the-riders-jump-down', cover: 0.55 };
}
