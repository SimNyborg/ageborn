// R10 edit: "10 capsules at once" (P2 rarity reveal, exploit B1 in docs/PLAN.md). Cold open on the
// open-all volley, then five quick Epic bursts, three Legendary bursts and the fourth Legendary (the new
// Behemoth Tank) through its walkout, ending on its card. Filmed by shots/r10.mjs
// (only the spans used); the show runs across the middle of the vertical frame like R6 and R9.
import { loadClip, Timeline } from '../lib/edit.mjs';

const EPICS = ['emp_saboteur', 'tesla_tower', 'gravity_well', 'bulldozer', 'crossbow_keep'];
const LEGENDS = [
  ['sky_fortress', 'Sky Fortress'],
  ['armoured_train', 'Armoured Train'],
  ['lindworm', 'Lindworm'],
  ['behemoth_tank', 'Behemoth Tank'],
];

export async function edit() {
  const c = loadClip('r10', 'open');
  const T = new Timeline('r10', { bg: '#0d0b16', grade: { contrast: 1.05, saturate: 1.12, brightness: 1.0 } });
  const F = (s) => T.f(s);
  const WIDE = { layout: 'wide', wide: { y: 940, scale: 1.7, backdrop: 'radial-gradient(ellipse at 50% 48%, #2a2142 0%, #17122a 48%, #0b0914 100%)' } };
  const look = (extra) => ({ look: { ...WIDE, origin: [540, 940], ...extra } });

  // 1. the volley of ten capsules and the fan (filmed span 0)
  const sA = T.add(c, F(0.3), c.m('span-1'), look({ zoom: [1.0, 1.08], shakes: [{ at: F(0.2), dur: 10, amp: 10 }] }));
  // 2. five Epic bursts, each cut on its burst (spans 1-5 start at the burst step)
  const sE = EPICS.map((id, i) => {
    const at = c.m(`burst-c:${id}`);
    return T.add(c, at, at + F(0.75), look({ cutIn: i === 0 ? 'flash' : 'punch', zoom: [1.04, 1.0] }));
  });
  // 3. Legendaries 1-3: from the burst to just into the walkout (the walkout opens on an empty spotlight)
  const sL = LEGENDS.slice(0, 3).map(([id], i) => T.add(c, c.m(`burst-c:${id}`), c.m(`walkout-c:${id}`) + 8, look({ cutIn: i === 0 ? 'flash' : 'punch', zoom: [1.04, 1.0] })));
  // 4. the fourth Legendary, the new Behemoth Tank, through its walkout to its card (the game's summary
  // screen is cut: in the vertical crop it shows clipped labels and buttons)
  const sB = T.add(c, c.m('burst-c:behemoth_tank'), c.m('summary') - 3, look({ cutIn: 'flash', zoom: [1.04, 1.0] }));
  const summaryAt = sB.map(c.m('flip-c:behemoth_tank'));
  // hold the card so the closing question can be read
  const hold = F(1.4);
  T.add(c, c.m('summary') - 4, c.m('summary') - 3, { at: T.t, dur: hold, look: { ...WIDE, freeze: true }, sfx: false });
  T.t += hold;
  // 5. end card on a hold of the Behemoth card
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(c, c.m('summary') - 4, c.m('summary') - 3, { at: endAt, dur: endDur, look: { ...WIDE, freeze: true }, sfx: false });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('title', 0, sE[0].at, { y: 1430, burst: true, stagger: 4, lines: [{ text: 'Opening 10', size: 120, fill: 'white' }, { text: 'capsules at once', size: 112, fill: 'gold', gap: 4 }] });
  T.overlay('flash', F(0.2), 6, { color: '#ffffff', peak: 0.35 });
  sE.forEach((s, i) => {
    T.overlay('badge', s.at + 1, s.dur - 1, { text: `EPIC ${i + 1}/5`, rarity: 'epic', y: 330, size: 58 });
    T.overlay('flash', s.at, 4, { color: '#c27bff', peak: 0.25 });
  });
  [...sL, sB].forEach((s, i) => {
    T.overlay('badge', s.at + 3, (i < 3 ? s.dur : summaryAt - s.at) - 3, { text: `LEGENDARY ${i + 1}/4`, rarity: 'legendary', y: 330, size: i === 3 ? 70 : 60 });
    T.overlay('flash', s.at, i === 3 ? 8 : 5, { color: '#ffcf4a', peak: i === 3 ? 0.5 : 0.35 });
    // the walkout shows the fourth one's name itself
    if (i < 3) T.overlay('caption', s.at + 14, s.dur - 14, { text: LEGENDS[i][1], y: 1500 });
  });
  T.overlay('title', summaryAt, endAt - summaryAt, { y: 300, burst: true, glow: 'rgba(255,207,74,0.7)', lines: [{ text: '4 LEGENDARIES', size: 130, fill: 'gold' }] });
  T.overlay('caption', summaryAt + 8, endAt - summaryAt - 8, { text: 'Which one would you play first?', y: 1500 });
  T.overlay('endcard', endAt, endDur, { tagline: 'One lane. Eight ages. Endless battles.', cta: 'FOLLOW FOR MORE PULLS' });

  // --- sound: the show's own cues over the capsule music -----------------------------------------
  T.music('music.capsule', 0, total, { from: 0, gainDb: 0, fadeIn: 0.05, fadeOut: 0.8 });
  T.mix.config = { musicDb: -10, sfxDb: 1, accentDb: -2, sidechainDb: 5, exclude: ['xp_tick', 'copy_tick'] };
  T.accent('vs_slam', 1, { gainDb: -4 });
  sE.forEach((s) => T.accent('ui_whoosh', s.at, { gainDb: -9 }));
  sL.forEach((s) => T.accent('ui_whoosh', s.at, { gainDb: -6 }));
  T.accent('vs_slam', sB.at, { gainDb: -4 });
  T.accent('star_stamp', summaryAt, { gainDb: -3 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.4 });
  return { ...out, file: 'r10-10-capsules-at-once', cover: 0.55 };
}
