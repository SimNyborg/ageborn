// IA1 edit: "I'm making a strategy game on my own" (explore arm "ask", owner idea 2026-10-19). A personal
// ask in the developer's voice: cold open on an impact, a fast montage across four ages, the biggest capsule
// burst for "no studio, no ad budget", and a closing ask to send it to one friend who would love it (only
// sent shares count; no "like, comment, share" list). Narration from work/ia1 (scripts/narrate.py).
// Footage from Bronze, Medieval, Industrial and Future only: the capture's Stone and Modern looks use
// backdrops that must not be shown (RUNBOOK, 2026-10-20).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/ia1/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/ia1/lines.json', import.meta.url)));

export async function edit() {
  const T = new Timeline('ia1', { bg: '#14110d' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, to, { rate: (to - from) / dur, look });
  const WIDE = { layout: 'wide', wide: { y: 900, scale: 1.7, backdrop: 'radial-gradient(ellipse at 50% 48%, #2a2142 0%, #17122a 48%, #0b0914 100%)' } };

  const titan = loadClip('r12', 'a');
  const ages = [
    [loadClip('r7', 'a'), 'BRONZE AGE', '#ffcf4a'],
    [loadClip('r8', 'a'), 'MEDIEVAL AGE', '#9fe7ff'],
    [loadClip('r11', 'a'), 'INDUSTRIAL AGE', '#ff9a4a'],
  ];
  const titanWin = loadClip('r12', 'c');
  const aeon = loadClip('r9', 'aeon');
  const ship = loadClip('r11', 'c');

  // W0 cold open: the Chrono Titan charges into the troopers, impact in slow motion
  const w1 = at('l1');
  const s0 = fit(titan, Math.max(0, titan.m('impact') - 14), Math.min(titan.frames, titan.m('impact') + 50), w1, { shakes: [{ at: 14, dur: 14, amp: 18 }], zoom: [1.06, 1.0], origin: [540, 1300] });
  const impactAt = s0.at + Math.round(14 * (w1 / 64));
  // W1 four ages, one impact each, the last one the titan winning
  const w2 = at('l2');
  const step = Math.floor((w2 - T.t) / 4);
  const sAges = ages.map(([clip], i) => fit(clip, Math.max(0, clip.m('impact') - 12), Math.min(clip.frames, clip.m('impact') + 18), step, { cutIn: i === 0 ? 'whip' : 'punch', shakes: [{ at: Math.round(step * 0.4), dur: 10, amp: 14 }] }));
  const sFuture = fit(titanWin, Math.max(0, titanWin.m('last-death') - 24), Math.min(titanWin.frames, titanWin.m('last-death') + 12), w2 - T.t, { cutIn: 'punch' });
  // W2 "no studio, no ad budget": the biggest capsule, summit strikes into the burst
  const w3 = at('l3');
  const burst = aeon.m('burst') + 38;
  const aFrom = aeon.m('summitStrike-0') + 18 - 10;
  const sAeon = fit(aeon, aFrom, Math.min(aeon.frames, burst + 40), w3 - T.t, { ...WIDE, cutIn: 'flash', origin: [540, 900], zoom: [1.0, 1.08] });
  const boomAt = sAeon.at + Math.round((burst - aFrom) * ((w3 - sAeon.at) / (Math.min(aeon.frames, burst + 40) - aFrom)));
  // W3 the ask, over the Land Dreadnought's last stand (real time, no speed-up)
  const w4 = at('l4');
  const shipTo = Math.min(ship.frames, ship.m('last-death') + 20);
  const sAsk = T.add(ship, Math.max(0, shipTo - (w4 - T.t)), shipTo, { look: { cutIn: 'punch', zoom: [1.0, 1.06], origin: [540, 1200] } });
  // W4 the closing line on a held frame, then the end card
  const holdAt = T.t;
  const holdDur = F(OFF.end + 0.5) - holdAt;
  T.add(ship, shipTo - 1, shipTo, { look: { freeze: true }, sfx: false, at: holdAt, dur: holdDur });
  T.t = holdAt + holdDur;
  const endAt = T.t;
  const endDur = F(1.5);
  T.add(ship, shipTo - 1, shipTo, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('title', 0, w1, { y: 470, burst: true, stagger: 4, lines: [{ text: "I'm making a game", size: 104, fill: 'white' }, { text: 'ON MY OWN', size: 150, fill: 'orange', gap: 4 }] });
  T.overlay('flash', impactAt, 7, { peak: 0.6 });
  sAges.forEach((s, i) => {
    T.overlay('badge', s.at + 1, s.dur - 1, { text: ages[i][1], y: 300, color: ages[i][2], size: 60 });
    T.overlay('flash', s.at, 4, { peak: 0.3 });
  });
  T.overlay('badge', sFuture.at + 1, sFuture.dur - 1, { text: 'FUTURE AGE', y: 300, color: '#c27bff', size: 60 });
  T.overlay('title', sAges[0].at, w2 - sAges[0].at, { y: 470, stagger: 3, lines: [{ text: '8 ages', size: 130, fill: 'gold' }, { text: '1 lane', size: 130, fill: 'white', gap: 4 }] });
  T.overlay('title', sAeon.at + 2, boomAt - sAeon.at - 2, { y: 1380, stagger: 6, lines: [{ text: 'No studio', size: 110, fill: 'white' }, { text: 'No ad budget', size: 110, fill: 'white', gap: 4 }] });
  T.overlay('flash', boomAt, 8, { color: '#ffffff', peak: 0.6 });
  T.overlay('title', boomAt + 4, w3 - boomAt - 4, { y: 1380, burst: true, glow: 'rgba(255,207,74,0.7)', lines: [{ text: 'Just me', size: 150, fill: 'gold' }] });
  T.overlay('title', sAsk.at + 2, holdAt + holdDur - sAsk.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Know someone', size: 110, fill: 'white' }, { text: "who'd love this?", size: 110, fill: 'gold', gap: 4 }] });
  T.overlay('title', at('l3') + F(2.2), holdAt + holdDur - at('l3') - F(2.2), { y: 860, burst: true, glow: 'rgba(111,182,255,0.7)', lines: [{ text: 'SEND IT', size: 150, fill: 'blue' }, { text: 'to them', size: 90, fill: 'white', gap: 4 }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Ageborn. One lane, eight ages.', cta: 'FOLLOW THE JOURNEY' });
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 46 }));

  // --- sound: narration over the battles and a music bed --------------------------------------------
  T.music('music.future', 0, total, { from: 20, gainDb: -2, fadeIn: 0.3, fadeOut: 1.0 });
  T.mix.config = { musicDb: -15, sfxDb: -9, accentDb: -6, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready', 'copy_tick'] };
  T.accent('vs_slam', boomAt, { gainDb: -6 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/ia1/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'ia1-im-making-a-game-on-my-own', cover: 0.05 };
}
