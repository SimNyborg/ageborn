// DV3 edit: "Devlog #3: the plot twist" (devlog pillar; the B option shown in devlog #1). Story first:
// big units ended the fight the moment they died, which felt unfair, so the Land Dreadnought's crew bails
// out when it falls and fights on. Real battle from shots/dv3.mjs (1 Land Dreadnought vs 7 Riveters, the crew
// of 2 Carbineers wins). Ends on an open yes/no question. Narration from work/dv3 (scripts/narrate.py).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv3/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv3/lines.json', import.meta.url)));
const heroHp = (st) => (st.watched?.[0] ? st.watched[0].hpBp / 10000 : 0);

export async function edit() {
  const T = new Timeline('dv3', { bg: '#1c1712' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, to, { rate: (to - from) / dur, look });

  const a = loadClip('dv3', 'a');
  const b = loadClip('dv3', 'b');
  const c = loadClip('dv3', 'c');
  const death = c.m('hero-death');
  const lastDeath = c.m('last-death');

  // W0 cold open: the riveters hit the landship
  const sA = fit(a, Math.max(0, a.m('impact') - 14), a.frames, at('l1'), { shakes: [{ at: 14, dur: 14, amp: 18 }], zoom: [1.06, 1.0], origin: [540, 1300] });
  const impactAt = sA.at + Math.round(14 * (at('l1') / (a.frames - Math.max(0, a.m('impact') - 14))));
  // W1 they take it apart: mid-fight, then the last stand up to just before it falls
  const sB = fit(b, 0, b.frames, F(1.4), { cutIn: 'punch' });
  const sStand = fit(c, 0, death - 30, at('l2') - T.t, { cutIn: 'punch' });
  // W2 it falls, slowed
  const sFall = fit(c, death - 30, death + 20, at('l3') - T.t, { cutIn: 'punch', zoom: [1.0, 1.08], origin: [540, 1250], shakes: [{ at: 30, dur: 16, amp: 22 }] });
  const fallAt = sFall.map(death);
  // W3 the crew bails out
  const crewTo = death + 120;
  const sCrew = fit(c, death + 20, crewTo, at('l4') - T.t, { cutIn: 'flash', zoom: [1.08, 1.0], origin: [540, 1250] });
  // W4 the crew fights on, sped up to the last Riveter's fall
  const sFight = fit(c, crewTo, lastDeath + 10, at('l5') - T.t, { cutIn: 'punch' });
  const winAt = sFight.map(lastDeath);
  // W5 the question over the survivors, then a held frame and the end card
  const qTo = Math.min(c.frames, lastDeath + 60);
  const sQ = fit(c, lastDeath + 10, qTo, F(OFF.end + 0.6) - T.t, { zoom: [1.0, 1.05], origin: [540, 1250] });
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(c, qTo - 1, qTo, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('badge', 4, at('l1') - 4, { text: 'DEVLOG #3', y: 210, color: '#ffd466', size: 52 });
  T.overlay('title', 0, at('l1'), { y: 470, burst: true, stagger: 4, lines: [{ text: 'When it died', size: 96, fill: 'white' }, { text: 'the fight was over', size: 86, fill: 'orange', gap: 4 }] });
  T.overlay('flash', impactAt, 7, { peak: 0.6 });
  // the landship's health and the riveters left, until it falls
  const hudFrom = sB.at;
  const hp = [...T.series(sB, sB.at, sB.dur, heroHp), ...T.series(sStand, sStand.at, sStand.dur, heroHp), ...T.series(sFall, sFall.at, fallAt - sFall.at + 2, heroHp)];
  T.overlay('hpbar', hudFrom, fallAt + 2 - hudFrom, { label: 'Land Dreadnought', sub: 'Industrial Age', side: 1, y: 300, values: hp });
  T.overlay('title', sB.at + 2, at('l2') - sB.at - 2, { y: 520, stagger: 3, lines: [{ text: '7 riveters', size: 120, fill: 'blue' }, { text: 'vs 1 landship', size: 100, fill: 'white', gap: 4 }] });
  T.overlay('flash', fallAt, 8, { peak: 0.8 });
  T.overlay('title', fallAt + 2, at('l3') - fallAt - 2, { y: 520, burst: true, lines: [{ text: 'GONE', size: 190, fill: 'orange' }] });
  T.overlay('flash', sCrew.at, 6, { color: '#ffcf4a', peak: 0.5 });
  T.overlay('title', sCrew.at + 2, at('l4') - sCrew.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'PLOT TWIST', size: 150, fill: 'gold' }, { text: 'the crew bails out', size: 92, fill: 'white', gap: 6 }] });
  // the riveters left while the crew fights
  T.overlay('counter', sFight.at + 2, winAt + 10 - sFight.at - 2, { label: 'RIVETERS LEFT', y: 470, color: 'blue', size: 130, values: T.series(sFight, sFight.at + 2, winAt + 10 - sFight.at - 2, (st) => st.sides[0].units) });
  T.overlay('flash', winAt, 7, { peak: 0.6 });
  T.overlay('title', sQ.at, endAt - sQ.at, { y: 470, burst: true, stagger: 4, lines: [{ text: 'A second life', size: 110, fill: 'white' }, { text: 'for every big unit?', size: 96, fill: 'gold', gap: 4 }] });
  T.overlay('title', at('l5') + F(2.6), endAt - at('l5') - F(2.6), { y: 820, burst: true, lines: [{ text: 'YES or NO', size: 140, fill: 'blue' }, { text: 'Comment below', size: 76, fill: 'white', gap: 8 }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one battle at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4', 'l5'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 46 }));

  // --- sound ----------------------------------------------------------------------------------
  T.music('music.industrial', 0, total, { from: 20, gainDb: -2, fadeIn: 0.3, fadeOut: 1.2 });
  T.mix.config = { musicDb: -15, sfxDb: -9, accentDb: -6, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('vs_slam', fallAt, { gainDb: -6 });
  T.accent('star_stamp', sCrew.at, { gainDb: -6 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv3/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv3-devlog-3-the-plot-twist', cover: 0.5 };
}
