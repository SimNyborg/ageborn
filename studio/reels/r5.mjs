// R5 edit: "Pick one" (pillar P2 Choose & rank): three Legendary beasts, a flash of each as the hook,
// then each in a real fight with its one-line pitch, then the vote and the end card.
import { loadClip, MUSIC, Timeline } from '../lib/edit.mjs';

const BEASTS = [
  { clip: 'mammoth', card: 'mammoth_matriarch', name: 'Mammoth Matriarch', age: 'Stone Age', pitch: 'Splash stomps and\ntwo rock-slinging riders', fill: 'linear-gradient(180deg,#fff1d6 0%,#f0c27a 40%,#c98a3d 70%,#7a4a1c 100%)' },
  { clip: 'lindworm', card: 'lindworm', name: 'Lindworm', age: 'Medieval Age', pitch: 'Fire breath that burns\nfive in a line', fill: 'linear-gradient(180deg,#f2f6ff 0%,#c4d2e8 40%,#8ea3c4 68%,#3f5170 100%)' },
  { clip: 'leviathan', card: 'star_leviathan', name: 'Star Leviathan', age: 'Cosmic Age', pitch: 'A space whale whose\nsong hits five', fill: 'linear-gradient(180deg,#f8eaff 0%,#d9a8ff 38%,#a55cf0 66%,#4a1a80 100%)' },
];

export async function edit() {
  const T = new Timeline('r5', { bg: '#14110e' });
  const clips = BEASTS.map((b) => loadClip('r5', b.clip));
  // hook: a flash of each beast mid-attack
  const flashes = clips.map((c, i) => T.add(c, c.m('hit') + 4, c.m('hit') + 20, { look: { cutIn: i === 0 ? 'none' : 'punch', zoom: [1.08, 1.12], origin: [420, 1200] } }));
  // each beast: up close, the charge, its first attack slowed, the fight
  const shows = clips.map((c) => {
    const intro = T.add(c, c.m('intro') + 6, c.m('intro') + 30, { look: { cutIn: 'flash', zoom: [1.0, 1.04], origin: [540, 1250] } });
    const run = T.add(c, Math.max(c.m('charge'), c.m('hit') - 18), c.m('hit'), { look: { cutIn: 'whip' } });
    const hit = T.add(c, c.m('hit'), c.m('fight') + 30, { look: { shakes: [{ at: 0, dur: 12, amp: 14 }] } });
    return { intro, run, hit, end: hit.end };
  });
  // the vote
  const voteAt = T.t;
  const voteDur = 96;
  const last = clips[clips.length - 1];
  T.add(last, last.frames - 1, last.frames, { at: voteAt, dur: voteDur, look: { layout: 'blur', freeze: true }, sfx: false });
  T.t = voteAt + voteDur;
  const endAt = T.t;
  const endDur = 66;
  T.add(last, last.frames - 1, last.frames, { at: endAt, dur: endDur, look: { layout: 'blur', freeze: true }, sfx: false });
  T.t = endAt + endDur;
  const total = T.t;

  T.overlay('vignette', 0, voteAt, { top: 0.5, bottom: 0.72 });
  T.overlay('title', 0, flashes[2].end, { skip: 5, y: 450, burst: true, out: 'fade', lines: [{ text: 'Pick one', size: 180, fill: 'gold' }] });
  T.overlay('caption', 4, flashes[2].end - 6, { text: 'Which Legendary\njoins your army?', y: 680 });
  shows.forEach((s, i) => {
    const b = BEASTS[i];
    T.overlay('title', s.intro.at + 2, s.end - s.intro.at - 2, {
      y: 440,
      burst: true,
      stagger: 4,
      lines: [
        { text: `#${i + 1}`, size: 150, fill: 'gold' },
        { text: b.name, size: b.name.length > 12 ? 110 : 130, fill: b.fill, gap: 2 },
      ],
    });
    T.overlay('badge', s.intro.at + 10, s.end - s.intro.at - 12, { text: b.age.toUpperCase(), y: 660, color: '#ffd466', size: 40 });
    T.overlay('caption', s.hit.at + 2, s.end - s.hit.at - 4, { text: b.pitch, y: 800 });
    T.overlay('flash', s.hit.at, 6, { peak: 0.55 });
  });
  // the vote screen: the three beasts as cut-outs, numbered
  T.overlay('stage', voteAt, voteDur);
  T.overlay('title', voteAt, voteDur, { y: 380, burst: true, lines: [{ text: 'Pick one', size: 170, fill: 'gold' }] });
  const spots = [
    { x: 285, y: 940, h: 400 },
    { x: 770, y: 940, h: 330 },
    { x: 520, y: 1330, h: 340 },
  ];
  BEASTS.forEach((b, i) => {
    T.overlay('image', voteAt + 4 + i * 4, voteDur - 4 - i * 4, { src: `art/cut/${b.card}-attack.png`, x: spots[i].x, y: spots[i].y, h: spots[i].h, anim: 'pop' });
    T.overlay('badge', voteAt + 8 + i * 4, voteDur - 8 - i * 4, { text: `${i + 1}  ${b.name.toUpperCase()}`, x: spots[i].x, y: spots[i].y + 40, color: '#ffd466', size: 36 });
  });
  T.overlay('caption', voteAt + 16, voteDur - 16, { text: 'Comment 1, 2 or 3', y: 1470 });
  T.overlay('endcard', endAt, endDur, { tagline: '16 Legendaries across 8 ages.', cta: 'FOLLOW FOR MORE BATTLES' });

  const music0 = MUSIC.peak - shows[0].intro.at / 30;
  T.music('music.bronze', 0, total, { from: music0, gainDb: 0, fadeIn: 0.02, fadeOut: 1.2 });
  T.mix.config = { musicDb: -8, sfxDb: -1, accentDb: -2, sidechainDb: 4, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('vs_slam', 1, { gainDb: -3 });
  flashes.slice(1).forEach((f) => T.accent('ui_whoosh', f.at, { gainDb: -6 }));
  shows.forEach((s) => T.accent('star_stamp', s.intro.at + 2, { gainDb: -5 }));
  T.accent('ui_stamp', voteAt, { gainDb: -3 });
  BEASTS.forEach((b, i) => T.accent('ui_pop', voteAt + 4 + i * 4, { gainDb: -4 }));
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5 });
  return { ...out, file: 'r5-pick-one-legendary' };
}
