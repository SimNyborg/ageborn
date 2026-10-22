// DV4 edit: "Devlog #4: close fights are not an accident" (devlog pillar). Story first, and true: every duel
// is scouted on the game's simulator with different horde sizes until it ends on a sliver (tools/scout.ts,
// 2026-10-21: Grand Marshal vs 6 Highlanders 30 % left, vs 8 about 6-10 %, vs 9 he falls). Footage from the
// filmed duels R11-R14; the HP numbers on screen are read from each clip's own state. Ends on an open
// question the studio controls (which unit to test next). Narration from work/dv4 (scripts/narrate.py).
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv4/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv4/lines.json', import.meta.url)));
const heroHp = (st) => (st.watched?.[0] ? st.watched[0].hpBp / 10000 : 0);
const hpAt = (clip, frame) => Math.round(heroHp(clip.states[frame]) * 100);

export async function edit() {
  const T = new Timeline('dv4', { bg: '#1c1712' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, to, { rate: (to - from) / dur, look });

  const ma = loadClip('r14', 'a');
  const mc = loadClip('r14', 'c');
  const others = [
    [loadClip('r13', 'c'), 'BEHEMOTH TANK'],
    [loadClip('r12', 'c'), 'CHRONO TITAN'],
    [loadClip('r11', 'c'), 'LAND DREADNOUGHT'],
  ];
  const mDeath = mc.m('last-death');

  // W0 cold open: the marshal's last seconds, one hit from losing
  const s0 = fit(mc, mDeath - 110, mDeath + 30, at('l1'), { zoom: [1.08, 1.0], origin: [540, 1250] });
  const win0 = s0.map(mDeath);
  // W1 "not an accident": the charge and the impact
  const s1 = fit(ma, Math.max(0, ma.m('impact') - 14), ma.frames, at('l2') - T.t, { cutIn: 'whip', shakes: [{ at: 14, dur: 14, amp: 18 }] });
  // W2 the simulator: the fight runs while the scouting results land
  const s2 = fit(mc, 0, mc.m('last-one'), at('l3') - T.t, { cutIn: 'punch' });
  // W3 eight: the filmed fight's finish
  const s3 = fit(mc, mDeath - 24, mDeath + 40, at('l4') - T.t, { cutIn: 'flash', zoom: [1.0, 1.06], origin: [540, 1250] });
  const win3 = s3.map(mDeath);
  // W4 three more duels, each on its last blow
  const step = Math.floor((at('l5') - T.t) / 3);
  const s4 = others.map(([clip]) => fit(clip, clip.m('last-death') - 30, clip.m('last-death') + 24, step, { cutIn: 'punch' }));
  // W5 the question on a held frame, then the end card
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(mc, mDeath + 39, mDeath + 40, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(mc, mDeath + 39, mDeath + 40, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('badge', 4, at('l1') - 4, { text: 'DEVLOG #4', y: 210, color: '#ffd466', size: 52 });
  T.overlay('title', 0, win0, { y: 470, burst: true, stagger: 4, lines: [{ text: 'One hit', size: 130, fill: 'white' }, { text: 'from losing', size: 110, fill: 'orange', gap: 4 }] });
  T.overlay('hpbar', 0, win0 + 10, { label: 'Grand Marshal', sub: 'Gunpowder Age', side: 1, y: 300, values: T.series(s0, 0, win0 + 10, heroHp) });
  T.overlay('flash', win0, 7, { peak: 0.6 });
  T.overlay('title', s1.at + 2, at('l2') - s1.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Not an', size: 120, fill: 'white' }, { text: 'accident', size: 140, fill: 'gold', gap: 4 }] });
  // the scouting results, as the narration names them
  T.overlay('badge', s2.at + 2, s2.dur - 2, { text: 'SIMULATOR TEST', y: 300, color: '#9fe7ff', size: 58 });
  const six = at('l2') + F(3.9);
  const nine = at('l2') + F(6.6);
  T.overlay('title', six, nine - six, { y: 520, burst: true, lines: [{ text: '6 highlanders', size: 100, fill: 'blue' }, { text: 'marshal: 30% left', size: 84, fill: 'white', gap: 6 }] });
  T.overlay('title', nine, at('l3') - nine, { y: 520, burst: true, lines: [{ text: '9 highlanders', size: 100, fill: 'blue' }, { text: 'the marshal falls', size: 84, fill: 'orange', gap: 6 }] });
  T.overlay('title', s3.at + 2, win3 - s3.at - 2, { y: 520, burst: true, lines: [{ text: '8 highlanders', size: 110, fill: 'gold' }] });
  T.overlay('flash', win3, 7, { peak: 0.6 });
  T.overlay('title', win3 + 2, at('l4') - win3 - 2, { y: 520, burst: true, lines: [{ text: `${hpAt(mc, mDeath)}% left`, size: 170, fill: 'orange' }] });
  s4.forEach((s, i) => {
    const [clip, name] = others[i];
    T.overlay('badge', s.at + 1, s.dur - 1, { text: name, y: 300, color: '#ffd466', size: 56 });
    T.overlay('title', s.map(clip.m('last-death')) + 2, s.end - s.map(clip.m('last-death')) - 2, { y: 520, burst: true, lines: [{ text: `${hpAt(clip, clip.m('last-death'))}% left`, size: 150, fill: 'orange' }] });
    T.overlay('flash', s.map(clip.m('last-death')), 6, { peak: 0.5 });
  });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Which unit', size: 120, fill: 'white' }, { text: 'should I test next?', size: 100, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + F(1.6), endAt - qAt - F(1.6), { y: 820, burst: true, lines: [{ text: 'Name one below', size: 84, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one battle at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4', 'l5'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 46 }));

  // --- sound ----------------------------------------------------------------------------------
  T.music('music.gunpowder', 0, total, { from: 20, gainDb: -2, fadeIn: 0.3, fadeOut: 1.2 });
  T.mix.config = { musicDb: -15, sfxDb: -9, accentDb: -6, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('star_stamp', win3, { gainDb: -6 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv4/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv4-devlog-4-close-fights-are-no-accident', cover: 0.3 };
}
