// DV8 edit: "Devlog #8: how a unit comes alive" (owner direction 2026-10-22; owner rule 2026-10-27: the before must
// be plainly bad). Built from the Ursa Paladin's real sprite frames (work/dv8/build.py): step 0 one frozen picture
// on a flat grey card with no sound; step 1 the attack's 12 frames, then the swing; step 2 idle, walk, hit and die;
// step 3 the finished unit in a real battle (R8 footage) with effects and sound. Narration from work/dv8.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv8/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv8/lines.json', import.meta.url)));
const LABELS = JSON.parse(readFileSync(new URL('../work/dv8/step2-labels.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv8', { bg: '#1c1712' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - from) / dur, look });

  const s0c = loadClip('dv8', 'step0');
  const s1c = loadClip('dv8', 'step1');
  const s2c = loadClip('dv8', 'step2');
  const ra = loadClip('r8', 'a');
  const rc = loadClip('r8', 'c');

  // step 0: frozen, silent (as long as the first line)
  const s0 = T.add(s0c, 0, 1, { look: { freeze: true }, sfx: false, at: 0, dur: at('l1') });
  T.t = at('l1');
  // step 1: the frames appear, then the swing plays
  const s1 = fit(s1c, 0, s1c.frames, at('l2') - T.t, { cutIn: 'punch' });
  // step 2: stand, walk, flinch, fall
  const s2 = fit(s2c, 0, s2c.frames, at('l3') - T.t, { cutIn: 'punch' });
  // step 3: the battle, the charge into the footmen, then the finale
  const s3a = fit(ra, ra.m('impact') - 20, ra.m('impact') + 40, F(2.4), { cutIn: 'flash', shakes: [{ at: 20, dur: 14, amp: 18 }], zoom: [1.06, 1.0], origin: [540, 1250] });
  const s3b = fit(rc, rc.m('last-death') - 60, rc.m('last-death') + 30, at('l4') - T.t, { cutIn: 'punch' });
  // the question on a held frame, then the end card
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  const holdSrc = Math.min(rc.frames - 1, rc.m('last-death') + 29);
  T.add(rc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(rc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, at('l1') - 4, { text: 'DEVLOG #8', y: 200, color: '#ffd466', size: 52 });
  T.overlay('badge', 4, at('l1') - 4, { text: 'STEP 0', y: 300, color: '#cfcfcf', size: 66 });
  T.overlay('title', 0, at('l1'), { y: 520, stagger: 4, lines: [{ text: 'One picture.', size: 120, fill: 'white' }, { text: 'No life.', size: 130, fill: 'orange', gap: 4 }] });
  T.overlay('flash', s1.at, 6, { peak: 0.4 });
  T.overlay('badge', s1.at + 2, s1.dur - 2, { text: 'STEP 1  FRAMES', y: 300, color: '#9fe7ff', size: 62 });
  T.overlay('title', s1.at + 2, Math.round(s1.dur * 0.45), { y: 1500, burst: true, lines: [{ text: '12 frames', size: 120, fill: 'gold' }, { text: 'for one swing', size: 84, fill: 'white', gap: 4 }] });
  T.overlay('flash', s2.at, 6, { peak: 0.4 });
  T.overlay('badge', s2.at + 2, s2.dur - 2, { text: 'STEP 2  MOVES', y: 300, color: '#7dffb0', size: 62 });
  const kf = s2.dur / s2c.frames;
  for (const [name, from, to] of LABELS) {
    T.overlay('title', s2.at + Math.round(from * kf), Math.round((to - from) * kf), { y: 1500, burst: true, lines: [{ text: name.toUpperCase(), size: 130, fill: 'gold' }] });
  }
  T.overlay('flash', s3a.at, 8, { color: '#ffffff', peak: 0.6 });
  T.overlay('badge', s3a.at + 2, qAt - s3a.at - 2, { text: 'STEP 3  BATTLE', y: 300, color: '#ff9a4a', size: 62 });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 520, burst: true, stagger: 4, lines: [{ text: 'Which unit', size: 120, fill: 'white' }, { text: 'should I take apart?', size: 92, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one unit at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1680, size: 44 }));

  // --- sound: silence on step 0, a soft bed from step 1, the battle's own sound in step 3 ---------------
  T.music('music.medieval', s1.at, total - s1.at, { from: 20, gainDb: -4, fadeIn: 1.2, fadeOut: 1.2 });
  T.mix.config = { musicDb: -16, sfxDb: -6, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('ui_whoosh', s1.at, { gainDb: -10 });
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv8/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv8-devlog-8-how-a-unit-comes-alive', cover: 0.55 };
}
