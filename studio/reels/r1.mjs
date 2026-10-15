// R1 edit: "40 CAVEMEN vs 1 COSMIC TANK" (pillar P1 Age Clash). Hook: the matchup in three slams and
// "WHO WINS?"; the charge and impact in slow motion; the grind as jump cuts with a live counter and the
// tank's health bar; the tank survives on a sliver of health; the twist: 6 Spear Hunters (anti-armour) beat it.
import { loadClip, MUSIC, Timeline } from '../lib/edit.mjs';

const tankHp = (st) => (st.watched?.[0] ? st.watched[0].hpBp / 10000 : 0);

export async function edit() {
  const a = loadClip('r1', 'a');
  const b = ['b1', 'b2', 'b3'].map((n) => loadClip('r1', n));
  const c = loadClip('r1', 'c');
  const d1 = loadClip('r1', 'd1');
  const d2 = loadClip('r1', 'd2');
  const T = new Timeline('r1', { bg: '#1c1712' });
  const F = (s) => T.f(s);

  // 1. hook: the tank, the horde, both
  const sTank = T.add(a, a.m('tank'), a.m('horde'), { look: { zoom: [1.0, 1.04], origin: [540, 1250] } });
  const sHorde = T.add(a, a.m('horde'), a.m('both'), { look: { cutIn: 'none' } });
  const sBoth = T.add(a, a.m('both'), a.m('charge'));
  // 2. the charge (trimmed run-up) and the impact in slow motion
  const runFrom = Math.max(a.m('charge') + 8, a.m('impact') - 42);
  const sRun = T.add(a, runFrom, a.m('impact'), { look: { cutIn: 'whip' } });
  const sImpact = T.add(a, a.m('impact'), Math.min(a.frames, a.m('impact') + 56), { look: { shakes: [{ at: 0, dur: 14, amp: 18 }], zoom: [1.06, 1.0], origin: [540, 1300] } });
  // 3. the grind: three jump cuts
  const sB = b.map((clip) => T.add(clip, 4, 34, { look: { cutIn: 'punch' } }));
  // 4. the finale: the last caveman falls (recorded at 0.4x, played a little faster), the tank holds on
  const cStart = Math.max(0, c.m('last-one') - 8);
  const sFinal = T.add(c, cStart, Math.min(c.frames, c.m('last-death') + 52), { rate: 1.25, look: { cutIn: 'punch' } });
  const lastDeath = sFinal.map(c.m('last-death'));
  // 5. the twist
  const sSpears = T.add(d1, d1.m('spears') + 6, d1.m('charge'), { look: { cutIn: 'flash', zoom: [1.0, 1.05], origin: [540, 1250] } });
  const runFrom2 = Math.max(d1.m('charge') + 6, d1.m('impact') - 30);
  const sRun2 = T.add(d1, runFrom2, Math.min(d1.frames, d1.m('impact') + 48), { look: { cutIn: 'whip', shakes: [{ at: d1.m('impact') - runFrom2, dur: 12, amp: 14 }] } });
  const dies = d2.m('tank-dies');
  const sFall = T.add(d2, Math.max(0, dies - 20), Math.min(d2.frames, dies + 64), { look: { cutIn: 'punch', shakes: [{ at: Math.min(20, dies), dur: 18, amp: 26 }] } });
  const tankDies = sFall.map(dies);
  // 6. end card over the survivors
  const endAt = T.t;
  const endDur = F(2.4);
  const lastSrc = Math.min(d2.frames, dies + 64) - 1;
  T.add(d2, lastSrc, lastSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('title', 0, sTank.dur, { skip: 5, y: 470, burst: true, lines: [{ text: '1 Cosmic Tank', size: 140, fill: 'orange' }] });
  T.overlay('title', sHorde.at, sHorde.dur, { y: 460, burst: true, stagger: 3, lines: [{ text: 'vs', size: 80, fill: 'white' }, { text: '40 Cavemen', size: 150, fill: 'blue', gap: 4 }] });
  T.overlay('title', sBoth.at, sBoth.dur + 8, { y: 470, burst: true, lines: [{ text: 'Who wins?', size: 170, fill: 'gold' }] });
  T.overlay('caption', sBoth.at + 6, sBoth.dur + sRun.dur - 6, { text: 'Comment your guess', y: 690 });

  // the tank's health and the cavemen left, from the impact to the last caveman
  const hudFrom = sImpact.at;
  const hudTo = lastDeath + 16;
  const hpValues = T.series(sImpact, hudFrom, hudTo - hudFrom, tankHp);
  T.overlay('hpbar', hudFrom, hudTo - hudFrom, { label: 'Hover Tank', sub: 'Cosmic Age', side: 1, y: 300, values: hpValues });
  // the result title quotes the exact percentage the bar shows last, so the two always agree
  const hpLeft = Math.max(0, Math.round(hpValues[hpValues.length - 1] * 100));
  T.overlay('counter', hudFrom + 4, hudTo - hudFrom - 4, { label: 'CAVEMEN LEFT', y: 560, color: 'blue', size: 140, values: T.series(sImpact, hudFrom + 4, hudTo - hudFrom - 4, (st) => st.sides[0].units) });
  T.overlay('flash', sImpact.at, 7, { peak: 0.7 });
  for (const s of sB) T.overlay('flash', s.at, 5, { peak: 0.35 });

  // the result
  T.overlay('title', lastDeath + 4, sFinal.end - lastDeath - 4, { y: 820, burst: true, stagger: 5, lines: [{ text: 'The tank wins', size: 128, fill: 'orange' }, { text: `with ${hpLeft}% left`, size: 84, fill: 'white', gap: 6 }] });

  // the twist
  T.overlay('title', sSpears.at + 2, sSpears.dur - 2, { y: 460, burst: true, stagger: 5, lines: [{ text: 'But...', size: 96, fill: 'white' }, { text: '6 Spear Hunters?', size: 132, fill: 'blue', gap: 6 }] });
  const twistTo = tankDies + F(0.6);
  T.overlay('hpbar', sRun2.at, twistTo - sRun2.at, { label: 'Hover Tank', sub: 'Cosmic Age', side: 1, y: 300, values: T.series(sRun2, sRun2.at, twistTo - sRun2.at, tankHp) });
  const impact2 = sRun2.map(d1.m('impact'));
  T.overlay('badge', impact2 + 2, F(2.2), { text: 'ANTI-ARMOR  x3 DAMAGE', y: 560, color: '#ffd466', size: 50 });
  T.overlay('flash', tankDies, 9, { peak: 0.85 });
  T.overlay('title', tankDies + F(0.7), endAt - tankDies - F(0.7), { y: 520, burst: true, stagger: 6, lines: [{ text: 'Counters', size: 150, fill: 'gold' }, { text: 'beat numbers', size: 110, fill: 'white', gap: 4 }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Pick the right counter. Win the age.', cta: 'FOLLOW FOR MORE BATTLES' });

  // --- sound ----------------------------------------------------------------------------------
  // the music: the peak phrase arrives with the twist
  const musicStart = MUSIC.peak - sSpears.at / 30;
  T.music('music.cosmic', 0, total, { from: musicStart, gainDb: 0, fadeIn: 0.02, fadeOut: 1.2 });
  T.mix.config = { musicDb: -9, sfxDb: -1, accentDb: -2, sidechainDb: 4, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('vs_slam', 1, { gainDb: -2 });
  T.accent('vs_slam', sHorde.at + 1, { gainDb: -2, variant: 1 });
  T.accent('ui_stamp', sBoth.at + 2, { gainDb: 0 });
  T.accent('ui_whoosh', sRun.at, { gainDb: -4 });
  T.accent('explosion_m', sImpact.at, { gainDb: -6 });
  for (const s of sB) T.accent('ui_whoosh', s.at, { gainDb: -6 });
  T.accent('star_stamp', lastDeath + 4, { gainDb: -3 });
  T.accent('vs_slam', sSpears.at + 2, { gainDb: -2 });
  T.accent('ui_stamp', impact2 + 2, { gainDb: -3 });
  T.accent('ui_unlock', tankDies + F(0.7), { gainDb: -2 });
  T.accent('region_open', endAt, { gainDb: -6 });
  T.duck(tankDies, F(1.2), -6);

  const out = T.write({ endFade: 0.5 });
  return { ...out, file: 'r1-40-cavemen-vs-1-cosmic-tank' };
}
