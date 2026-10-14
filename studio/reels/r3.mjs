// R3 edit: "A knight on a war bear" (pillar P2 Legendary showcase): the reveal, the name with its
// rarity, the charge, the roar and first cleaves slowed, and the rampage with its numbers.
import { loadClip, MUSIC, Timeline } from '../lib/edit.mjs';

export async function edit() {
  const c = loadClip('r3', 'paladin');
  const T = new Timeline('r3', { bg: '#191714' });
  const sReveal = T.add(c, c.m('reveal'), c.m('pull'), { look: { zoom: [1.0, 1.05], origin: [540, 1250] } });
  const sPull = T.add(c, c.m('pull'), c.m('charge') + 18);
  const runFrom = Math.max(c.m('charge') + 18, c.m('contact') - 34);
  const sRun = T.add(c, runFrom, c.m('contact'), { look: { cutIn: 'whip' } });
  const sContact = T.add(c, c.m('contact'), c.m('rampage'), { look: { shakes: [{ at: 0, dur: 14, amp: 16 }], zoom: [1.05, 1.0], origin: [540, 1300] } });
  const sRampage = T.add(c, c.m('rampage'), Math.min(c.frames, c.m('rampage') + 132));
  const endAt = T.t;
  const endDur = 72;
  T.add(c, sRampage.to - 1, sRampage.to, { at: endAt, dur: endDur, look: { freeze: true }, sfx: false });
  T.t = endAt + endDur;
  const total = T.t;

  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('title', 0, 27, { skip: 5, y: 470, burst: true, lines: [{ text: 'A knight', size: 150, fill: 'white' }] });
  T.overlay('title', 27, sReveal.dur - 27 + 4, { y: 470, burst: true, stagger: 4, lines: [{ text: 'A knight', size: 120, fill: 'white' }, { text: 'on a war bear', size: 140, fill: 'gold', gap: 4 }] });
  T.overlay('title', sPull.at + 2, sPull.dur + sRun.dur - 4, { y: 470, burst: true, lines: [{ text: 'Ursa Paladin', size: 150, fill: 'gold' }] });
  T.overlay('badge', sPull.at + 8, sPull.dur + sRun.dur - 10, { text: 'LEGENDARY', rarity: 'legendary', y: 650, size: 48 });
  T.overlay('flash', sContact.at, 7, { peak: 0.6 });
  T.overlay('title', sContact.at + 4, sContact.dur - 4, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Its roar', size: 120, fill: 'white' }, { text: 'shields allies', size: 128, fill: 'blue', gap: 4 }] });
  const r = sRampage.at;
  T.overlay('title', r + 4, 54, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Cleaves 2', size: 130, fill: 'white' }, { text: 'at once', size: 110, fill: 'gold', gap: 4 }] });
  T.overlay('title', r + 58, sRampage.dur - 58, { y: 470, burst: true, stagger: 4, lines: [{ text: '2,150 HP', size: 160, fill: 'gold' }, { text: 'Medieval Age', size: 92, fill: 'linear-gradient(180deg,#f2f6ff 0%,#c4d2e8 40%,#8ea3c4 68%,#3f5170 100%)', gap: 4 }] });
  T.overlay('caption', r + 64, sRampage.dur - 70, { text: 'Would you take it into battle?', y: 760, size: 46 });
  T.overlay('endcard', endAt, endDur, { tagline: '16 Legendaries across 8 ages.', cta: 'FOLLOW FOR MORE BATTLES' });

  const music0 = MUSIC.peak - sContact.at / 30;
  T.music('music.medieval', 0, total, { from: music0, gainDb: 0, fadeIn: 0.02, fadeOut: 1.2 });
  T.mix.config = { musicDb: -8, sfxDb: -1, accentDb: -2, sidechainDb: 4, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('vs_slam', 1, { gainDb: -3 });
  T.accent('vs_slam', 27, { gainDb: -4, variant: 1 });
  T.accent('star_stamp', sPull.at + 2, { gainDb: -3 });
  T.accent('ui_whoosh', sRun.at, { gainDb: -5 });
  T.accent('ui_stamp', r + 58, { gainDb: -4 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5 });
  return { ...out, file: 'r3-ursa-paladin-legendary' };
}
