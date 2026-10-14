// R6 edit: "Wait for the gold" (pillar P2 rarity reveal): one Time Capsule opening from the game's own
// capsule show that climbs Common, Rare, Epic and ends in a Legendary walkout. The show's sound cues come
// from its plan (shots/r6.mjs). The show is filmed in landscape (its stage is 16:9) and runs across the
// middle of the vertical frame (layout `wide`) on the show's own dark violet.
import { loadClip, Timeline } from '../lib/edit.mjs';

export async function edit() {
  const ladder = loadClip('r6', 'ladder');
  const T = new Timeline('r6', { bg: '#0d0b16', grade: { contrast: 1.04, saturate: 1.08, brightness: 1.0 } });
  const WIDE = { layout: 'wide', wide: { y: 940, scale: 1.7, backdrop: 'radial-gradient(ellipse at 50% 48%, #2a2142 0%, #17122a 48%, #0b0914 100%)' } };
  // the opening: burst, fan, Common, Rare, Epic, then the Legendary and its walkout
  const walk = ladder.m('walkout-c:ursa_paladin');
  const end = Math.min(ladder.frames, walk + 96);
  const sOpen = T.add(ladder, 0, end, { look: { ...WIDE, zoom: [1.0, 1.05], origin: [540, 940] } });
  const at = (id) => sOpen.map(ladder.m(id));
  const endAt = T.t;
  const endDur = 70;
  T.add(ladder, end - 1, end, { at: endAt, dur: endDur, look: { ...WIDE, freeze: true }, sfx: false });
  T.t = endAt + endDur;
  const total = T.t;

  // the hook: the capsule bursts open in the first frame
  T.overlay('title', 0, at('signal-c:bonker'), { skip: 5, y: 300, burst: true, stagger: 5, lines: [{ text: 'Wait for', size: 120, fill: 'white' }, { text: 'the gold...', size: 150, fill: 'gold', gap: 4 }] });
  // the rarity ladder: a badge per step
  const steps = [
    ['signal-c:bonker', 'COMMON', 'common', 'signal-c:spear_hunter'],
    ['signal-c:spear_hunter', 'RARE!', 'rare', 'signal-c:battering_ram'],
    ['signal-c:battering_ram', 'EPIC!!', 'epic', 'signal-c:ursa_paladin'],
  ];
  for (const [from, text, rarity, until] of steps) T.overlay('badge', at(from), at(until) - at(from), { text, rarity, y: 330, size: 58 });
  const legend = at('burst-c:ursa_paladin');
  T.overlay('flash', legend + 6, 8, { color: '#ffe9a8', peak: 0.6 });
  T.overlay('title', legend + 4, at('walkout-c:ursa_paladin') + 40 - legend, { y: 330, burst: true, glow: 'rgba(245,184,46,0.8)', lines: [{ text: 'Legendary!', size: 150, fill: 'gold' }] });
  T.overlay('caption', at('walkout-c:ursa_paladin') + 44, endAt - at('walkout-c:ursa_paladin') - 44, { text: 'Ursa Paladin joins the army', y: 1500 });
  T.overlay('endcard', endAt, endDur, { tagline: 'Every card earned in battle. Nothing for sale.', cta: 'FOLLOW FOR MORE PULLS' });

  T.music('music.capsule', 0, total, { from: 0, gainDb: 0, fadeIn: 0.05, fadeOut: 1.2 });
  T.mix.config = { musicDb: -8, sfxDb: 0, accentDb: -2, sidechainDb: 4, exclude: ['xp_tick', 'copy_tick'] };
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5 });
  return { ...out, file: 'r6-legendary-capsule-pull', cover: 0.3 };
}
