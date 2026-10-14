// R2 edit: "The most satisfying base collapse" (pillar P1): three bases fall, numbered, each from the
// last hit through the slowed break to the rubble; then "Which one? 1, 2 or 3" and the end card.
import { loadClip, MUSIC, Timeline } from '../lib/edit.mjs';

const PICKS = [
  { clip: 'medieval', label: 'Medieval Keep', fill: 'linear-gradient(180deg,#f2f6ff 0%,#c4d2e8 40%,#8ea3c4 68%,#3f5170 100%)' },
  { clip: 'industrial', label: 'Iron Factory', fill: 'linear-gradient(180deg,#ffe9d8 0%,#f0a878 38%,#b06a3b 68%,#5a2e14 100%)' },
  { clip: 'cosmic', label: 'Cosmic Spire', fill: 'linear-gradient(180deg,#f8eaff 0%,#d9a8ff 38%,#a55cf0 66%,#4a1a80 100%)' },
];

export async function edit() {
  const T = new Timeline('r2', { bg: '#161310' });
  const segs = [];
  for (const [i, p] of PICKS.entries()) {
    const c = loadClip('r2', p.clip);
    const brk = c.m('break');
    // from just before the last hit to the rubble settling
    const from = Math.max(0, brk - (i === 0 ? 16 : 22));
    const to = Math.min(c.frames, brk + 96);
    const seg = T.add(c, from, to, { look: { cutIn: i === 0 ? 'none' : 'flash', zoom: [1.0, 1.07], origin: [620, 1250], shakes: [{ at: brk - from, dur: 22, amp: 24 }] } });
    segs.push({ ...seg, brk: seg.map(brk), p });
  }
  // the vote: the last rubble, held
  const voteAt = T.t;
  const last = segs[segs.length - 1];
  const lastClip = loadClip('r2', PICKS[PICKS.length - 1].clip);
  T.add(lastClip, Math.min(lastClip.frames - 1, last.to), Math.min(lastClip.frames, last.to + 1), { at: voteAt, dur: 66, look: { freeze: true, zoom: [1.07, 1.12], origin: [620, 1250] }, sfx: false });
  T.t = voteAt + 66;
  const endAt = T.t;
  const endDur = 66;
  T.add(lastClip, Math.min(lastClip.frames - 1, last.to), Math.min(lastClip.frames, last.to + 1), { at: endAt, dur: endDur, look: { freeze: true, zoom: [1.12, 1.12], origin: [620, 1250] }, sfx: false });
  T.t = endAt + endDur;
  const total = T.t;

  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  // the hook: the first base cracks in the first second
  T.overlay('title', 0, segs[0].brk + 6, { skip: 5, y: 470, burst: true, lines: [{ text: 'Wait for it...', size: 140, fill: 'white' }] });
  segs.forEach((s, i) => {
    T.overlay('title', s.brk + (i === 0 ? 8 : 0), s.end - s.brk - (i === 0 ? 8 : 0), {
      y: 440,
      burst: true,
      stagger: 4,
      lines: [
        { text: `#${i + 1}`, size: 170, fill: 'gold' },
        { text: s.p.label, size: 96, fill: s.p.fill, gap: 2 },
      ],
    });
    T.overlay('flash', s.brk, 7, { peak: 0.75 });
  });
  T.overlay('title', voteAt, 66, { y: 520, burst: true, stagger: 5, lines: [{ text: 'Which one?', size: 150, fill: 'white' }, { text: '1, 2 or 3', size: 130, fill: 'gold', gap: 6 }] });
  T.overlay('caption', voteAt + 8, 58, { text: 'Comment your favourite', y: 860 });
  T.overlay('endcard', endAt, endDur, { tagline: 'Every base falls differently.', cta: 'FOLLOW FOR MORE BATTLES' });

  // music: section A under the hits, the peak phrase for the vote
  const music0 = MUSIC.peak - voteAt / 30;
  T.music('music.industrial', 0, total, { from: music0, gainDb: 0, fadeIn: 0.02, fadeOut: 1.2 });
  T.mix.config = { musicDb: -10, sfxDb: 0, accentDb: -2, sidechainDb: 5, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  segs.forEach((s) => T.duck(s.brk, 50, -7));
  T.accent('ui_stamp', voteAt, { gainDb: -3 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5 });
  return { ...out, file: 'r2-most-satisfying-base-collapse' };
}
