// DV1 edit: "Devlog #1: the Cosmic Age was too strong" (devlog pillar, first episode; story first, owner
// note 2026-10-18). First-person narration (Kokoro bm_george, docs/voice.md round 1) over real battle
// footage, told as a game-dev problem: later ages are much stronger (power 1.00 to 4.48, DESIGN A17.8),
// so why play old units? 40 cavemen cannot stop a Cosmic tank, but Spear Hunters (triple damage to
// armour) can: counters keep old ages useful. Ends on an open choice the studio controls (the next battle).
// The narration is assembled in work/dv1 (lines + offsets.json); every segment is fitted to its line.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv1/offsets.json', import.meta.url)));
const tankHp = (st) => (st.watched?.[0] ? st.watched[0].hpBp / 10000 : 0);

export async function edit() {
  const T = new Timeline('dv1', { bg: '#14110d' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]); // a narration line's start, in frames
  // play clip frames [from, to) so they fill exactly `dur` frames
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, to, { rate: (to - from) / dur, look });

  const a = loadClip('r1', 'a');
  const c = loadClip('r1', 'c');
  const d1 = loadClip('r1', 'd1');
  const d2 = loadClip('r1', 'd2');
  const evo = loadClip('r4', 'evolve');
  const duels = ['r7', 'r8', 'r11'].map((r) => loadClip(r, 'b'));
  const ship = loadClip('r11', 'c');

  // W0 hook: the Cosmic tank, then the horde
  const w1 = at('l1');
  const sTank = fit(a, a.m('tank'), a.m('tank') + F(1.4), F(1.4), { zoom: [1.0, 1.05], origin: [540, 1250] });
  fit(a, a.m('horde'), a.m('horde') + (w1 - T.t), w1 - T.t, { cutIn: 'none' });
  // W1 the power scale: a whole battle climbing from the Stone Age to the Cosmic Age, sped up
  const w2 = at('l2');
  const sEvo = fit(evo, evo.m('age-stone'), evo.frames - 1, w2 - T.t, { cutIn: 'whip' });
  // W2 the charge and the finale: the tank survives on a sliver
  const w3 = at('l3');
  const sImpact = fit(a, a.m('impact') - 24, a.m('impact') + 36, F(2.0), { cutIn: 'whip', shakes: [{ at: 24, dur: 12, amp: 16 }] });
  const cFrom = Math.max(0, c.m('last-one') - 8);
  const cTo = Math.min(c.frames, c.m('last-death') + 40);
  const sFinal = fit(c, cFrom, cTo, w3 - T.t, { cutIn: 'punch' });
  const lastDeath = sFinal.map(c.m('last-death'));
  // W3 the twist: six Spear Hunters
  const w4 = at('l4');
  const sSpears = fit(d1, d1.m('spears') + 6, Math.min(d1.frames, d1.m('impact') + 20), F(2.6), { cutIn: 'flash' });
  const dies = d2.m('tank-dies');
  const sFall = fit(d2, Math.max(0, dies - 16), Math.min(d2.frames, dies + 34), w4 - T.t, { cutIn: 'punch', shakes: [{ at: 10, dur: 16, amp: 22 }] });
  // W4 the balance goal: newer ages hit harder (quick cuts of three ages), the right counter still wins
  const w5 = at('l50');
  const sDuels = duels.map((clip) => fit(clip, 2, 32, F(1.0), { cutIn: 'punch' }));
  const sShip = fit(ship, Math.max(0, ship.m('last-death') - 30), Math.min(ship.frames, ship.m('last-death') + 30), w5 - T.t, { cutIn: 'punch' });
  // W5 the open choice: "you pick", A (Mammoth vs cavemen, over the R1 horde), B (the landship), A or B?
  const wA = at('l51');
  const wB = at('l52');
  const wAB = at('l53');
  const sPick = T.add(a, a.m('both'), a.m('both') + 1, { look: { freeze: true, cutIn: 'flash' }, sfx: false, at: T.t, dur: wA - T.t });
  T.t = wA;
  const sA = T.add(a, a.m('horde'), a.m('horde') + 1, { look: { freeze: true, cutIn: 'punch' }, sfx: false, at: T.t, dur: wB - T.t });
  T.t = wB;
  const sB = fit(ship, 0, Math.min(ship.frames, wAB - wB), wAB - wB, { cutIn: 'punch' });
  const abEnd = F(OFF.end) + F(0.9);
  const sAB = T.add(ship, 0, 1, { look: { freeze: true, cutIn: 'flash' }, sfx: false, at: T.t, dur: abEnd - T.t });
  T.t = abEnd;
  // end card
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(ship, 0, 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('badge', 4, w1 - 4, { text: 'DEVLOG #1', y: 210, color: '#ffd466', size: 52 });
  T.overlay('title', 2, w1 - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'The Cosmic Age', size: 100, fill: 'white' }, { text: 'was too strong', size: 128, fill: 'orange', gap: 4 }] });
  // the power scale: Stone 1.00 to Cosmic 4.48 (A17.8)
  T.overlay('title', sEvo.at + F(0.4), F(2.6), { y: 430, lines: [{ text: 'Stone Age', size: 76, fill: 'white' }, { text: 'power 1.00', size: 110, fill: 'blue', gap: 2 }] });
  T.overlay('title', sEvo.at + F(3.4), F(2.4), { y: 430, burst: true, lines: [{ text: 'Cosmic Age', size: 76, fill: 'white' }, { text: 'power 4.48', size: 130, fill: 'gold', gap: 2 }] });
  T.overlay('title', sEvo.at + F(5.9), w2 - sEvo.at - F(5.9), { y: 470, burst: true, stagger: 3, lines: [{ text: 'So why play', size: 110, fill: 'white' }, { text: 'the old stuff?', size: 130, fill: 'orange', gap: 4 }] });
  // the tank's health through the finale, and the result it shows last
  const hp = T.series(sFinal, sFinal.at, lastDeath + 10 - sFinal.at, tankHp);
  T.overlay('hpbar', sImpact.at, lastDeath + 10 - sImpact.at, { label: 'Hover Tank', sub: 'Cosmic Age', side: 1, y: 300, values: [...T.series(sImpact, sImpact.at, sImpact.dur, tankHp), ...hp] });
  const hpLeft = Math.max(0, Math.round(hp[hp.length - 1] * 100));
  T.overlay('title', sImpact.at, F(1.6), { y: 520, burst: true, lines: [{ text: '40 cavemen', size: 130, fill: 'blue' }] });
  T.overlay('title', lastDeath + 2, w3 - lastDeath - 2, { y: 560, burst: true, lines: [{ text: `${hpLeft}% left`, size: 150, fill: 'orange' }] });
  T.overlay('flash', sImpact.at + 24, 6, { peak: 0.6 });
  T.overlay('title', sSpears.at + 2, F(2.0), { y: 470, burst: true, lines: [{ text: 'Spear Hunters', size: 130, fill: 'blue' }] });
  T.overlay('badge', sSpears.at + F(1.6), w4 - sSpears.at - F(1.6), { text: 'x3 DAMAGE TO ARMOUR', y: 300, color: '#ffd466', size: 50 });
  T.overlay('flash', sFall.at + 16, 8, { peak: 0.8 });
  T.overlay('title', sDuels[0].at, F(3.0), { y: 470, stagger: 3, lines: [{ text: 'Newer ages', size: 110, fill: 'white' }, { text: 'hit harder', size: 130, fill: 'orange', gap: 4 }] });
  T.overlay('title', sShip.at, w5 - sShip.at, { y: 470, burst: true, stagger: 3, lines: [{ text: 'The right counter', size: 96, fill: 'white' }, { text: 'still wins', size: 140, fill: 'gold', gap: 4 }] });
  // the choice
  T.overlay('title', sPick.at + 2, sPick.dur - 2, { y: 560, burst: true, lines: [{ text: 'YOU PICK', size: 170, fill: 'gold' }, { text: 'the next battle', size: 84, fill: 'white', gap: 6 }] });
  T.overlay('title', sA.at, sA.dur, { y: 330, burst: true, lines: [{ text: 'A', size: 200, fill: 'gold' }] });
  T.overlay('image', sA.at + 3, sA.dur - 3, { src: 'art/cut/mammoth_matriarch-attack.png', x: 540, y: 1160, h: 560, anim: 'pop' });
  T.overlay('caption', sA.at + 6, sA.dur - 6, { text: '1 Mammoth vs 12 cavemen', y: 1300 });
  T.overlay('title', sB.at, sB.dur, { y: 330, burst: true, lines: [{ text: 'B', size: 200, fill: 'blue' }] });
  T.overlay('caption', sB.at + 6, sB.dur - 6, { text: 'The landship whose crew bails out', y: 1300 });
  T.overlay('title', sAB.at, sAB.dur, { y: 620, burst: true, stagger: 4, lines: [{ text: 'A or B?', size: 190, fill: 'gold' }, { text: 'Comment below', size: 80, fill: 'white', gap: 8 }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one battle at a time.', cta: 'FOLLOW THE DEVLOG' });
  // the spoken lines as captions (lower safe area), each for its line's length
  const lines = JSON.parse(readFileSync(new URL('../work/dv1/lines.json', import.meta.url)));
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: lines[i], y: 1560, size: 46 }));
  T.overlay('caption', at('l50'), F(OFF.l50[1]) + 4, { text: 'Next episode, you pick.', y: 1560, size: 46 });

  // --- sound: narration over the battle sounds and a low music bed --------------------------------
  T.music('music.cosmic', 0, total, { from: 30, gainDb: -2, fadeIn: 0.5, fadeOut: 1.2 });
  T.mix.config = { musicDb: -15, sfxDb: -9, accentDb: -6, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: resolve(new URL('../work/dv1/narration.wav', import.meta.url).pathname), at: 0, gainDb: 0 } });
  return { ...out, file: 'dv1-devlog-1-the-cosmic-age-was-too-strong', cover: 0.02 };
}
