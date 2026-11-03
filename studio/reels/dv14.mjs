// DV14 edit: "Devlog #14: I filmed the same fight twice" (indie-dev angle). R19's duel recorded again on 2026-11-03
// (shots/dv14.mjs): every recorded state and every pixel matches (clip json equal, PSNR inf), because the sim is
// deterministic (seeded RNG, integer math; DESIGN B2/B3). Side by side: public/clips/dv14/split-{a,c}.mp4 (ffmpeg,
// Friday's R19 left, today's right). Narration from work/dv14.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv14/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv14/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('dv14', { bg: '#262220' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - from) / dur, look });

  const sa = loadClip('dv14', 'split-a');
  const sc = loadClip('dv14', 'split-c');
  const ra = loadClip('r19', 'a');
  const rc = loadClip('r19', 'c');

  // the two recordings side by side
  const s0 = fit(sa, 0, sa.frames, at('l1'), {});
  const s1 = fit(sc, 0, 217, at('l2') - T.t, { cutIn: 'punch' });
  const s2 = fit(sc, 217, sc.frames, at('l3') - T.t, {});
  const winAt = s2.map(sc.m('last-death'));
  // a replay: the same fight, full screen, slowed down
  const s3 = fit(ra, 0, ra.frames, at('l4') - T.t, { cutIn: 'flash', zoom: [1.0, 1.08], origin: [540, 1250] });
  // the question on a held frame, then the end card
  const holdSrc = rc.frames - 1;
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(rc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(rc, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('title', 0, s1.at, { y: 560, stagger: 4, lines: [{ text: 'Same fight', size: 130, fill: 'white' }, { text: 'filmed twice', size: 110, fill: 'orange', gap: 4 }] });
  T.overlay('title', s1.at + 4, s2.at - s1.at - 4, { y: 560, burst: true, stagger: 4, lines: [{ text: 'Every frame', size: 130, fill: 'gold' }, { text: 'identical', size: 120, fill: 'white', gap: 4 }] });
  T.overlay('title', s2.at + 2, winAt - s2.at - 2, { y: 560, burst: true, lines: [{ text: 'No real dice', size: 130, fill: 'white' }] });
  T.overlay('title', winAt, s3.at - winAt, { y: 560, burst: true, stagger: 4, lines: [{ text: 'Same winner', size: 130, fill: 'gold' }, { text: 'same 3%', size: 110, fill: 'white', gap: 4 }] });
  T.overlay('badge', s3.at + 2, s3.dur - 2, { text: 'DEVLOG #14  REPLAY', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', s3.at + 4, s3.dur - 4, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Replay any battle', size: 110, fill: 'gold' }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Rewatch your', size: 120, fill: 'white' }, { text: 'own battles?', size: 120, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one system at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1560, size: 44 }));

  // --- sound: low music with a soft fade-in, the battle's own sound -------------------------------
  T.music('music.industrial', 0, total, { from: 20, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -16, sfxDb: -9, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv14/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv14-devlog-14-i-filmed-the-same-fight-twice', cover: 0.3 };
}
