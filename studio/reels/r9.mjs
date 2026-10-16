// R9 edit: "The biggest capsule" (P2 rarity reveal, owner request 2026-10-16). A first Aeon capsule
// climbs all seven tiers under six perfect hammer strikes (the show's climb tones rise with each one),
// bursts in the Aeon explosion, then three Legendaries walk out in quick cuts. Filmed by shots/r9.mjs
// (only the spans used); the show runs across the middle of the vertical frame like R6.
import { loadClip, Timeline } from '../lib/edit.mjs';

// tier colours from the game's capsule art (clay -> aeon)
const CLIMB = [
  ['strike-0', 'BRONZE', '#d08a4a'],
  ['strike-1', 'SILVER', '#cfd8e3'],
  ['strike-2', 'JADE', '#47d39a'],
  ['strike-3', 'GOLD', '#ffcf4a'],
  ['summitStrike-0', 'PLATINUM!', '#9fe7ff'],
  ['summitStrike-1', 'AEON!!!', '#e08cff'],
];
const LEGENDS = [
  ['signal-c:elk_chieftain', 'Elk Chieftain'],
  ['signal-c:chrono_titan', 'Chrono Titan'],
  ['signal-c:land_dreadnought', 'Land Dreadnought'],
];

export async function edit() {
  const c = loadClip('r9', 'aeon');
  const T = new Timeline('r9', { bg: '#0d0b16', grade: { contrast: 1.05, saturate: 1.12, brightness: 1.0 } });
  const WIDE = { layout: 'wide', wide: { y: 940, scale: 1.7, backdrop: 'radial-gradient(ellipse at 50% 48%, #2a2142 0%, #17122a 48%, #0b0914 100%)' } };
  const hitAt = (id) => c.m(id) + 18; // each strike lands 600 ms into its step (the hit_heavy cue)

  // 1. the climb and the burst (filmed span 0). Cold open on the first hammer hit: the show's own
  // "Tap on the beat!" hint sits at the stage's left edge (cut off in the vertical frame) until then.
  const burstHit = c.m('burst') + 38; // explosion_l at 1.27 s into the burst step
  const aFrom = hitAt('strike-0') + 3;
  const aTo = c.m('span-1');
  const shakes = CLIMB.map(([id]) => ({ at: hitAt(id) - aFrom, dur: id.startsWith('summit') ? 12 : 8, amp: id.startsWith('summit') ? 16 : 9 }));
  shakes.push({ at: burstHit - aFrom, dur: 26, amp: 34 });
  const sA = T.add(c, aFrom, aTo, { look: { ...WIDE, zoom: [1.0, 1.08], origin: [540, 940], shakes } });
  // 2-4. the three Legendaries: the first two end on their gold card burst (their walkouts open on an
  // empty spotlight), the third plays on to the unit's reveal
  const legEnd = [c.m('walkout-c:elk_chieftain') + 8, c.m('walkout-c:chrono_titan') + 8, c.frames];
  const spans = [c.m('span-1'), c.m('span-2'), c.m('span-3')];
  const sL = [0, 1, 2].map((i) => T.add(c, spans[i], legEnd[i], { look: { ...WIDE, cutIn: i === 0 ? 'flash' : 'punch', zoom: [1.04, 1.0], origin: [540, 940] } }));
  // 5. end card
  const endAt = T.t;
  const endDur = 48;
  T.add(c, c.frames - 1, c.frames, { at: endAt, dur: endDur, look: { ...WIDE, freeze: true }, sfx: false });
  T.t = endAt + endDur;
  const total = T.t;
  const map = (f) => sA.map(f);

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('title', 0, map(hitAt('strike-3')), { y: 1430, burst: true, stagger: 4, lines: [{ text: 'The biggest', size: 110, fill: 'white' }, { text: 'capsule', size: 150, fill: 'gold', gap: 4 }] });
  CLIMB.forEach(([id, text, color], i) => {
    const at = map(hitAt(id));
    const until = i + 1 < CLIMB.length ? map(hitAt(CLIMB[i + 1][0])) : map(burstHit) - 4;
    T.overlay('badge', at, until - at, { text, y: 330, color, size: i >= 4 ? 70 : 58 });
    T.overlay('flash', at, i >= 4 ? 7 : 4, { color: color, peak: i >= 4 ? 0.45 : 0.25 });
  });
  T.overlay('flash', map(burstHit), 8, { color: '#ffffff', peak: 0.6 });
  T.overlay('flash', map(burstHit) + 10, 14, { color: '#e08cff', peak: 0.4 });
  T.overlay('title', map(burstHit) + 6, sA.end - map(burstHit) - 6, { y: 300, burst: true, glow: 'rgba(224,140,255,0.8)', lines: [{ text: 'AEON', size: 190, fill: 'gold' }] });
  sL.forEach((s, i) => {
    T.overlay('badge', s.at + 3, s.dur - 3, { text: `LEGENDARY ${i + 1}/3`, rarity: 'legendary', y: 330, size: 60 });
    T.overlay('caption', s.at + 14, s.dur - 14, { text: LEGENDS[i][1], y: 1500 });
  });
  T.overlay('endcard', endAt, endDur, { tagline: 'Every card earned in battle. Nothing for sale.', cta: 'FOLLOW FOR MORE PULLS' });

  // --- sound: the show's own cues (rising climb tones, the Aeon burst) over the capsule music ----
  T.music('music.capsule', 0, total, { from: 0, gainDb: 0, fadeIn: 0.05, fadeOut: 0.8 });
  T.mix.config = { musicDb: -10, sfxDb: 1, accentDb: -2, sidechainDb: 5, exclude: ['xp_tick', 'copy_tick'] };
  T.accent('vs_slam', map(burstHit), { gainDb: -3 });
  sL.forEach((s) => T.accent('ui_whoosh', s.at, { gainDb: -6 }));
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.4 });
  return { ...out, file: 'r9-the-biggest-capsule', cover: 0.4 };
}
