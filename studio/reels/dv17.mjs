// DV17 edit: "Devlog #17: the Hydra test" (answers DV12's "which Legendary next?"). The Hydra beats 5 Hoplites with
// 14% left (R7 clips) and falls to 6 (shots/dv17.mjs, two Hoplites left). Narration: ElevenLabs Steve, eleven_v4,
// one take (work/dv17, offsets from the connector's word timings).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv17/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv17/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv17', { bg: '#2c2418' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, Math.max(0, from), Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - Math.max(0, from)) / dur, look });

  const wa = loadClip('r7', 'a');
  const wc = loadClip('r7', 'c');
  const la = loadClip('dv17', 'a');
  const lc = loadClip('dv17', 'c');
  const death = lc.m('hero-death');

  const s0 = fit(wa, 0, wa.m('impact'), at('l1'), { zoom: [1.0, 1.06], origin: [540, 1250] });
  const s1 = fit(wa, wa.m('impact'), wa.frames, at('l2') - T.t, { cutIn: 'flash', shakes: [{ at: 0, dur: 12, amp: 14 }] });
  const s2 = fit(wc, wc.m('last-death') - 80, wc.m('last-death') + 40, at('l3') - T.t, { cutIn: 'punch' });
  const winAt = s2.map(wc.m('last-death'));
  const s3 = fit(la, la.m('impact') - 20, la.m('impact') + 25, at('l4') - T.t, { cutIn: 'flash' });
  const s4 = fit(lc, death - 50, death + 40, at('l5') - T.t, { cutIn: 'punch', zoom: [1.05, 1.12], origin: [540, 1250] });
  const deathAt = s4.map(death);
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

  T.overlay('badge', 4, s3.at - 4, { text: 'DEVLOG #17', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 0, s1.at, { y: 470, stagger: 4, lines: [{ text: 'Next test:', size: 110, fill: 'white' }, { text: 'the Hydra', size: 140, fill: 'gold', gap: 4 }] });
  T.overlay('title', s1.at + 4, s2.at - s1.at - 4, { y: 470, burst: true, lines: [{ text: '3 heads', size: 150, fill: 'orange' }] });
  T.overlay('title', s2.at + 2, s3.at - s2.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'vs 5: wins', size: 130, fill: 'gold' }, { text: '14% left', size: 100, fill: 'white', gap: 4 }] });
  T.overlay('flash', winAt, 8, { color: '#ffffff', peak: 0.5 });
  T.overlay('flash', s3.at, 8, { color: '#ffffff', peak: 0.5 });
  T.overlay('title', s3.at + 2, deathAt - s3.at - 2, { y: 470, burst: true, lines: [{ text: '+1 Hoplite', size: 130, fill: 'orange' }] });
  T.overlay('flash', deathAt, 8, { peak: 0.7 });
  T.overlay('title', deathAt + 2, qAt - deathAt - 2, { y: 470, burst: true, lines: [{ text: 'vs 6: falls', size: 140, fill: 'white' }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Beat six?', size: 140, fill: 'gold' }, { text: 'Or is five right?', size: 90, fill: 'white', gap: 6 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one test at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  T.music('music.bronze', 0, total, { from: 20, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -17, sfxDb: -9, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv17/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv17-devlog-17-the-hydra-test', cover: 0.45 };
}
