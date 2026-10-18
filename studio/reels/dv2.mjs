// DV2 edit: "Devlog #2: how to make a capsule opening feel good" (owner request 2026-10-18). One show,
// built up layer by layer with the capsule bench's own switches (shots/dv2.mjs): grey placeholder boxes
// with no sound, then real art, then sound (the hammer's rising climb tones), then motion, then light and
// the Aeon explosion (R9's fully-on clip). First-person narration (Kokoro bm_george, docs/voice.md round 1)
// assembled in work/dv2; each layer fills its narration line. Ends on an open question to the viewer.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv2/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv2/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv2', { bg: '#0d0b16', grade: { contrast: 1.04, saturate: 1.08, brightness: 1.0 } });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const WIDE = { layout: 'wide', wide: { y: 900, scale: 1.7, backdrop: 'radial-gradient(ellipse at 50% 48%, #2a2142 0%, #17122a 48%, #0b0914 100%)' } };
  const look = (extra = {}) => ({ ...WIDE, origin: [540, 900], ...extra });
  const hit = (clip, id) => clip.m(id) + 18; // a strike lands 600 ms into its step

  const plain = loadClip('dv2', 'grey'); // the plain layer, desaturated and stepped at 5 fps (lifeless)
  const art = loadClip('dv2', 'art');
  const motion = loadClip('dv2', 'motion');
  const full = loadClip('r9', 'aeon');

  // W0 grey boxes, silent: the charge and the four strikes
  // every layer starts just after the first hit: the bench's "Tap on the beat!" hint is cut off before it
  const p0 = hit(plain, 'strike-0') + 3;
  const s0 = T.add(plain, p0, p0 + at('l1'), { look: look({ zoom: [1.0, 1.03] }), sfx: false });
  // W1 real art, still silent
  const a1 = hit(art, 'strike-1') - 21;
  const s1 = T.add(art, a1, a1 + (at('l2') - T.t), { look: look({ cutIn: 'punch' }), sfx: false });
  // W2 + sound: the strikes climb in pitch
  const a2 = hit(art, 'strike-1') - 21;
  const s2 = T.add(art, a2, Math.min(art.frames, a2 + (at('l3') - T.t)), { look: look({ cutIn: 'punch' }) });
  // W3 + motion
  const m3 = hit(motion, 'strike-1') - 21;
  const s3 = T.add(motion, m3, Math.min(motion.frames, m3 + (at('l4') - T.t)), { look: look({ cutIn: 'punch' }) });
  // W4 + light: the finished show, timed so the Aeon explosion lands as the line ends
  const burstHit = full.m('burst') + 38;
  const boom = F(OFF.l4[0] + OFF.l4[1]) + 2;
  const f4 = burstHit - (boom - T.t);
  const shakes = ['summitStrike-0', 'summitStrike-1'].map((id) => ({ at: hit(full, id) - f4, dur: 12, amp: 16 }));
  shakes.push({ at: burstHit - f4, dur: 26, amp: 34 });
  const s4 = T.add(full, f4, full.m('span-1'), { look: look({ cutIn: 'flash', zoom: [1.0, 1.08], shakes }) });
  // W5 the payoff: a Legendary bursts out while the question is asked
  const l5 = full.m('span-1');
  const l5To = Math.min(full.m('span-2'), l5 + (F(OFF.end + 1.0) - T.t));
  const s5 = T.add(full, l5, l5To, { look: look({ cutIn: 'flash', zoom: [1.04, 1.0] }) });
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(full, l5To - 1, l5To, { at: endAt, dur: endDur, look: { ...WIDE, freeze: true }, sfx: false });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, F(4.4), { text: 'DEVLOG #2', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 2, s1.at - 2, { y: 1360, burst: true, stagger: 4, lines: [{ text: 'This felt', size: 100, fill: 'white' }, { text: 'BORING', size: 150, fill: 'blue', gap: 4 }] });
  const steps = [
    [s1, 'STEP 1  ART', '#9fe7ff'],
    [s2, 'STEP 2  SOUND', '#47d39a'],
    [s3, 'STEP 3  MOTION', '#ffcf4a'],
    [s4, 'STEP 4  LIGHT', '#e08cff'],
  ];
  for (const [s, text, color] of steps) {
    T.overlay('badge', s.at + 2, s.dur - 2, { text, y: 300, color, size: 64 });
    T.overlay('flash', s.at, 4, { color, peak: 0.25 });
  }
  // the climb tones, shown as notes rising with each hit
  ['strike-0', 'strike-1', 'strike-2', 'strike-3', 'summitStrike-0', 'summitStrike-1'].forEach((id, i) => {
    const f = s2.map(hit(art, id));
    if (f > s2.at && f < s2.end) T.overlay('badge', f, Math.min(F(0.7), s2.end - f), { text: '♪'.repeat(Math.min(i + 1, 4)), y: 470 - i * 30, color: '#47d39a', size: 56 + i * 6 });
  });
  // light: flashes on the summit strikes and the explosion
  ['summitStrike-0', 'summitStrike-1'].forEach((id) => T.overlay('flash', s4.map(hit(full, id)), 6, { color: '#9fe7ff', peak: 0.4 }));
  const boomAt = s4.map(burstHit);
  T.overlay('flash', boomAt, 8, { color: '#ffffff', peak: 0.6 });
  T.overlay('flash', boomAt + 10, 14, { color: '#e08cff', peak: 0.4 });
  T.overlay('title', boomAt + 6, s4.end - boomAt - 6, { y: 1360, burst: true, glow: 'rgba(224,140,255,0.8)', lines: [{ text: 'AEON', size: 190, fill: 'gold' }] });
  T.overlay('badge', s5.at + 3, s5.dur - 3, { text: 'LEGENDARY', rarity: 'legendary', y: 300, size: 64 });
  T.overlay('title', at('l5'), endAt - at('l5'), { y: 1330, burst: true, stagger: 4, lines: [{ text: 'Too much', size: 120, fill: 'white' }, { text: 'or just right?', size: 110, fill: 'gold', gap: 4 }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one layer at a time.', cta: 'FOLLOW THE DEVLOG' });
  // spoken lines as captions (not over the closing title)
  [0, 1, 2, 3, 4].forEach((i) => T.overlay('caption', at(`l${i}`), F(OFF[`l${i}`][1]) + 6, { text: LINES[i], y: 1600, size: 46 }));

  // --- sound: silent layers first, then the show's own cues, music under the light layer -----------
  T.music('music.capsule', s4.at, total - s4.at, { from: 0, gainDb: -2, fadeIn: 0.3, fadeOut: 0.8 });
  T.mix.config = { musicDb: -14, sfxDb: -2, accentDb: -4, sidechainDb: 5, exclude: ['xp_tick', 'copy_tick'] };
  T.accent('vs_slam', boomAt, { gainDb: -5 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv2/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv2-devlog-2-making-a-capsule-feel-good', cover: 0.72 };
}
