// R4 edit: "From clubs to lasers" (pillar P1/P5): one base evolves through all eight ages, one bar of
// music per age. Every age arrives on a downbeat, and the music moves to that age's own track there
// (the game's eight battle tracks share tempo and form, so the change lands in time, a key change up).
import { loadClip, MUSIC, Timeline } from '../lib/edit.mjs';

const AGES = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];
const NAMES = { stone: 'Stone Age', bronze: 'Bronze Age', medieval: 'Medieval Age', gunpowder: 'Gunpowder Age', industrial: 'Industrial Age', modern: 'Modern Age', future: 'Future Age', cosmic: 'Cosmic Age' };
const RAMP = {
  stone: 'linear-gradient(180deg,#fff1d6 0%,#f0c27a 40%,#c98a3d 70%,#7a4a1c 100%)',
  bronze: 'linear-gradient(180deg,#fff4d0 0%,#f2cf7a 38%,#c99a3f 66%,#6e4a16 100%)',
  medieval: 'linear-gradient(180deg,#f2f6ff 0%,#c4d2e8 40%,#8ea3c4 68%,#3f5170 100%)',
  gunpowder: 'linear-gradient(180deg,#ffe4dc 0%,#ff9a7a 38%,#d9452f 68%,#7a1a10 100%)',
  industrial: 'linear-gradient(180deg,#ffe9d8 0%,#f0a878 38%,#b06a3b 68%,#5a2e14 100%)',
  modern: 'linear-gradient(180deg,#f1f7e0 0%,#c8d68e 38%,#8a9a4a 68%,#3e4a1c 100%)',
  future: 'linear-gradient(180deg,#eaffff 0%,#8ff4ff 38%,#29c9f5 66%,#0d5f8a 100%)',
  cosmic: 'linear-gradient(180deg,#f8eaff 0%,#d9a8ff 38%,#a55cf0 66%,#4a1a80 100%)',
};

export async function edit() {
  const e = loadClip('r4', 'evolve');
  const T = new Timeline('r4', { bg: '#1b1611' });
  const fps = 30;
  const bar = MUSIC.bar * fps; // 65.45 frames
  // each age's arrival: the ageUp marker; the bar before it shows the Ascension
  const ups = AGES.slice(1).map((a) => e.m(`age-${a}`));
  const BEFORE = 44;
  const intro = 46;
  // the intro: the Stone base, then cuts that put every arrival a bar apart
  const firstFrom = Math.max(0, ups[0] - BEFORE - intro);
  T.add(e, firstFrom, ups[0] - BEFORE, { look: { zoom: [1.0, 1.03], origin: [300, 1300] } });
  const arrivals = [];
  for (let k = 0; k < ups.length; k++) {
    const at = Math.round(intro + k * bar);
    // the first frames of a segment are its Ascension; the arrival sits BEFORE frames in
    const from = ups[k] - BEFORE;
    const nextAt = k + 1 < ups.length ? Math.round(intro + (k + 1) * bar) : null;
    const to = nextAt === null ? Math.min(e.frames, e.m('final') + 44) : from + (nextAt - at);
    const seg = T.add(e, from, to, { at, look: { cutIn: k === 0 ? 'none' : 'punch', shakes: [{ at: BEFORE, dur: 12, amp: 10 }] } });
    arrivals.push(seg.map(ups[k]));
    T.t = seg.end;
  }
  const endAt = T.t;
  const endDur = 72;
  T.add(e, e.frames - 1, e.frames, { at: endAt, dur: endDur, look: { freeze: true }, sfx: false });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('title', 0, arrivals[0] - 4, { skip: 5, y: 470, burst: true, stagger: 6, lines: [{ text: 'From clubs', size: 150, fill: RAMP.stone }, { text: 'to lasers', size: 150, fill: RAMP.future, gap: 4 }] });
  T.overlay('caption', 10, arrivals[0] - 14, { text: '8 ages. One battle.', y: 740 });
  const track = [];
  for (let f = 0; f < endAt; f++) track.push(arrivals.filter((a) => a <= f).length);
  T.overlay('agetrack', 0, endAt, { values: track, y: 270 });
  arrivals.forEach((a, k) => {
    const age = AGES[k + 1];
    const until = k + 1 < arrivals.length ? arrivals[k + 1] - BEFORE + 6 : endAt;
    T.overlay('flash', a, 6, { peak: 0.55 });
    T.overlay('title', a, Math.min(until - a, 70), { y: 520, burst: true, lines: [{ text: NAMES[age], size: age.length > 8 ? 118 : 134, fill: RAMP[age] }] });
  });
  T.overlay('endcard', endAt, endDur, { tagline: '8 ages. One battle.', cta: 'FOLLOW FOR MORE BATTLES' });

  // --- sound ----------------------------------------------------------------------------------
  // the cosmic arrival lands on the peak phrase; each age plays its own track from its arrival
  const music0 = MUSIC.peak - arrivals[arrivals.length - 1] / fps;
  const cues = ['stone', ...AGES.slice(1)];
  const bounds = [0, ...arrivals, total];
  for (let k = 0; k < cues.length; k++) {
    const a = bounds[k];
    const b = bounds[k + 1];
    T.music(`music.${cues[k]}`, a, b - a + 2, { from: music0 + a / fps, gainDb: 0, fadeIn: k === 0 ? 0.05 : 0.03, fadeOut: k === cues.length - 1 ? 1.2 : 0.06 });
  }
  T.mix.config = { musicDb: -7, sfxDb: -2, accentDb: -2, sidechainDb: 3, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base'] };
  T.accent('vs_slam', 1, { gainDb: -3 });
  arrivals.forEach((a) => T.accent('ui_stamp', a, { gainDb: -6 }));
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5 });
  return { ...out, file: 'r4-stone-age-to-cosmic-age' };
}
