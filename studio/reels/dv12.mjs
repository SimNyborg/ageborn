// DV12 edit: "Devlog #12: how many soldiers is a Legendary worth?" (indie-dev angle). A round-up of the narrated
// balance tests filmed on the game's sim: Elk Chieftain beats 5 Bonkers (R18), Lindworm 5 Crossbowmen (R16),
// Armoured Train 6 Riveters (R19), Mammoth Matriarch only 2 Tuskbacks (R20, heavy units). Narration from work/dv12.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv12/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv12/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv12', { bg: '#1c1712' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, Math.max(0, from), Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - Math.max(0, from)) / dur, look });

  const L = Object.fromEntries(['r18', 'r16', 'r19', 'r20'].map((id) => [id, { a: loadClip(id, 'a'), c: loadClip(id, 'c') }]));
  const impact = (id, dur, look) => fit(L[id].a, L[id].a.m('impact') - 15, L[id].a.m('impact') + 35, dur, look);
  const finale = (id, dur, look) => fit(L[id].c, L[id].c.m('last-death') - 30, L[id].c.m('last-death') + 40, dur, look);

  // the question, over four quick impacts
  const q = Math.floor(at('l1') / 4);
  const s0 = ['r18', 'r16', 'r19'].map((id, i) => impact(id, q, { cutIn: i ? 'punch' : undefined, shakes: [{ at: 15, dur: 10, amp: 12 }] }));
  impact('r20', at('l1') - T.t, { cutIn: 'punch', shakes: [{ at: 15, dur: 10, amp: 12 }] });
  // each Legendary's result
  const sElk = finale('r18', at('l2') - T.t, { cutIn: 'flash' });
  const sWyrm = finale('r16', at('l3') - T.t, { cutIn: 'flash' });
  const sTrain = finale('r19', at('l4') - T.t, { cutIn: 'flash' });
  const sMam = fit(L.r20.a, L.r20.a.m('impact') - 15, L.r20.a.m('impact') + 45, F(2.0), { cutIn: 'flash', shakes: [{ at: 15, dur: 12, amp: 16 }] });
  finale('r20', at('l5') - T.t, { cutIn: 'punch' });
  // the question on a held frame, then the end card
  const mc = L.r20.c;
  const holdSrc = Math.min(mc.frames - 1, mc.m('last-death') + 39);
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(mc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(mc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, sElk.at - 4, { text: 'DEVLOG #12', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 0, sElk.at, { y: 470, stagger: 4, lines: [{ text: '1 Legendary', size: 130, fill: 'white' }, { text: '= ? soldiers', size: 120, fill: 'orange', gap: 4 }] });
  for (const [s, end, name, n, who] of [[sElk, sWyrm.at, 'Elk', '5', 'cavemen'], [sWyrm, sTrain.at, 'Lindworm', '5', 'crossbowmen'], [sTrain, sMam.at, 'Train', '6', 'workers'], [sMam, qAt, 'Mammoth', '2', 'heavy beasts']]) {
    T.overlay('flash', s.at, 8, { color: '#ffffff', peak: 0.5 });
    T.overlay('title', s.at + 4, end - s.at - 4, { y: 470, burst: true, stagger: 4, lines: [{ text: `${name} = ${n}`, size: 140, fill: 'gold' }, { text: who, size: 96, fill: 'white', gap: 4 }] });
  }
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Test which', size: 120, fill: 'white' }, { text: 'Legendary next?', size: 110, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one test at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound: low music with a soft fade-in, the battles' own sound -------------------------------
  T.music('music.medieval', 0, total, { from: 20, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -16, sfxDb: -9, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv12/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv12-devlog-12-how-many-soldiers-is-a-legendary-worth', cover: 0.1 };
}
