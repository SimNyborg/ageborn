// DV18 edit: "Devlog #18: hold the line or charge?" (developer dilemma, owner note 2026-11-10: no subtitles, A or B).
// 6 Bonkers vs the Elk Chieftain on the sim: A, they charge and win with 2 left; B, they hold at p 700 and win with
// 4 left (shots/dv18.mjs). Narration: ElevenLabs Steve, eleven_v4, one take (work/dv18).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv18/offsets.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv18', { bg: '#2a2418' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, Math.max(0, from), Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - Math.max(0, from)) / dur, look });

  const ca = loadClip('dv18', 'charge/a');
  const cc = loadClip('dv18', 'charge/c');
  const ha = loadClip('dv18', 'hold/a');
  const hc = loadClip('dv18', 'hold/c');

  // the setup
  const s0 = fit(ca, 0, ca.m('contact'), at('l1'), { zoom: [1.0, 1.06], origin: [540, 1250] });
  // A: charge
  const a1 = fit(ca, ca.m('contact'), ca.frames, F(1.6), { cutIn: 'flash', shakes: [{ at: 0, dur: 12, amp: 14 }] });
  const a2 = fit(cc, cc.m('hero-death') - 60, cc.frames, at('l2') - T.t, { cutIn: 'punch' });
  const aWin = a2.map(cc.m('hero-death'));
  // B: hold the line
  const b1 = fit(ha, ha.m('contact') - 70, ha.frames, F(3.0), { cutIn: 'flash' });
  const b2 = fit(hc, hc.m('hero-death') - 60, hc.frames, at('l3') - T.t, { cutIn: 'punch' });
  const bWin = b2.map(hc.m('hero-death'));
  // the comparison: what is left after A, then after B
  const half = Math.floor((at('l4') - T.t) / 2);
  const c1 = T.add(cc, cc.frames - 1, cc.frames, { look: { freeze: true, cutIn: 'punch' }, sfx: false, at: T.t, dur: half });
  T.t = c1.at + half;
  const c2 = T.add(hc, hc.frames - 1, hc.frames, { look: { freeze: true, cutIn: 'punch' }, sfx: false, at: T.t, dur: at('l4') - T.t });
  T.t = at('l4');
  // the vote, then the end card
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(hc, hc.frames - 1, hc.frames, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(hc, hc.frames - 1, hc.frames, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  T.overlay('badge', 4, a1.at - 4, { text: 'DEVLOG #18  DILEMMA', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 0, a1.at, { y: 470, stagger: 4, lines: [{ text: 'Hold or charge?', size: 120, fill: 'gold' }, { text: '6 cavemen vs 1 elk', size: 84, fill: 'white', gap: 6 }] });
  T.overlay('badge', a1.at + 2, b1.at - a1.at - 2, { text: 'OPTION A  CHARGE', y: 300, color: '#ff9a4a', size: 62 });
  T.overlay('flash', aWin, 8, { peak: 0.6 });
  T.overlay('title', aWin + 2, b1.at - aWin - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'They win', size: 120, fill: 'white' }, { text: '2 left', size: 150, fill: 'orange', gap: 4 }] });
  T.overlay('badge', b1.at + 2, c1.at - b1.at - 2, { text: 'OPTION B  HOLD THE LINE', y: 300, color: '#9fe7ff', size: 58 });
  T.overlay('flash', bWin, 8, { peak: 0.6 });
  T.overlay('title', bWin + 2, c1.at - bWin - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'They win', size: 120, fill: 'white' }, { text: '4 left', size: 150, fill: 'gold', gap: 4 }] });
  T.overlay('badge', c1.at + 2, half - 2, { text: 'A  CHARGE', y: 300, color: '#ff9a4a', size: 62 });
  T.overlay('title', c1.at + 2, half - 2, { y: 470, burst: true, lines: [{ text: '2 left', size: 160, fill: 'orange' }] });
  T.overlay('badge', c2.at + 2, qAt - c2.at - 2, { text: 'B  HOLD', y: 300, color: '#9fe7ff', size: 62 });
  T.overlay('title', c2.at + 2, qAt - c2.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: '4 left', size: 160, fill: 'gold' }, { text: 'too strong?', size: 100, fill: 'white', gap: 4 }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'A or B?', size: 170, fill: 'gold' }] });
  T.overlay('title', qAt + F(0.8), endAt - qAt - F(0.8), { y: 760, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one dilemma at a time.', cta: 'FOLLOW THE DEVLOG' });

  T.music('music.stone', 0, total, { from: 20, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -17, sfxDb: -9, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv18/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv18-hold-or-charge', cover: 0.5 };
}
