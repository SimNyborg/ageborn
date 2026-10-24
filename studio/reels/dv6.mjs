// DV6 edit: "Devlog #6: I found a broken Legendary" (owner direction 2026-10-22: indie-dev angle, a visible
// problem first). Real battles from shots/dv6.mjs: the Star Leviathan (cost 350) beats 3 Star Legionnaires
// (cost 150) on a sliver and falls to 4 (cost 200); the other Legendaries filmed this week beat 6-13 commons
// (R11 6, R12-R14 8, R15 13). HP numbers on screen are read from the clips' own state. Ends on an open question
// (buff it or leave it), which goes to the game as a suggestion, not a decision. Narration from work/dv6.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv6/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv6/lines.json', import.meta.url)));
const heroHp = (st) => (st?.watched?.[0] ? st.watched[0].hpBp / 10000 : 0);

export async function edit() {
  const T = new Timeline('dv6', { bg: '#140f1e' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, Math.max(0, from), Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - Math.max(0, from)) / dur, look });

  const wa = loadClip('dv6', 'w3/a');
  const wb = loadClip('dv6', 'w3/b');
  const wc = loadClip('dv6', 'w3/c');
  const la = loadClip('dv6', 'l4/a');
  const lc = loadClip('dv6', 'l4/c');
  const others = [
    [loadClip('r12', 'c'), 'CHRONO TITAN', 'beats 8'],
    [loadClip('r14', 'c'), 'GRAND MARSHAL', 'beats 8'],
    [loadClip('r15', 'c'), 'BRONZE COLOSSUS', 'beats 13'],
  ];
  const fall = lc.m('hero-death');
  const wDeath = wc.m('last-death');

  // W0 cold open: the Leviathan crashes down
  const s0 = fit(lc, fall - 40, fall + 50, at('l1'), { zoom: [1.1, 1.0], origin: [540, 1250], shakes: [{ at: Math.round(at('l1') * 0.45), dur: 16, amp: 20 }] });
  // W1 meet the Leviathan: its song wave hits the line
  const s1 = fit(wa, wa.m('impact') - 30, wa.frames, at('l2') - T.t, { cutIn: 'flash', zoom: [1.0, 1.1], origin: [540, 1250] });
  // W2 against 3: mid-fight, then the last soldier falls
  const s2a = fit(wb, 0, wb.frames, F(1.2), { cutIn: 'punch' });
  const s2b = fit(wc, wDeath - 50, wDeath + 30, at('l3') - T.t, { cutIn: 'punch' });
  const win2 = s2b.map(wDeath);
  // W3 against 4: the charge, then the fall
  const s3a = fit(la, la.m('impact') - 12, la.m('impact') + 30, F(1.4), { cutIn: 'punch' });
  const s3b = fit(lc, fall - 60, fall + 40, at('l4') - T.t, { cutIn: 'punch', zoom: [1.0, 1.08], origin: [540, 1250] });
  const fall3 = s3b.map(fall);
  // W4 the others: three Legendaries winning bigger fights
  const step = Math.floor((F(OFF.l4[0] + 4.2) - T.t) / 3);
  const s4 = others.map(([clip]) => fit(clip, clip.m('last-death') - 30, clip.m('last-death') + 20, step, { cutIn: 'punch' }));
  const s4q = fit(lc, fall + 40, lc.frames, at('l5') - T.t, { cutIn: 'flash' });
  // W5 the question on a held frame, then the end card
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(lc, lc.frames - 1, lc.frames, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(lc, lc.frames - 1, lc.frames, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  T.overlay('badge', 4, at('l1') - 4, { text: 'DEVLOG #6', y: 210, color: '#ffd466', size: 52 });
  T.overlay('title', 0, at('l1'), { y: 520, stagger: 4, lines: [{ text: 'A broken', size: 110, fill: 'white' }, { text: 'Legendary?', size: 112, fill: 'orange', gap: 4 }] });
  T.overlay('badge', s1.at + 2, s1.dur - 2, { text: 'STAR LEVIATHAN', rarity: 'legendary', y: 300, size: 62 });
  T.overlay('title', s1.at + F(2.2), s1.dur - F(2.2), { y: 520, burst: true, lines: [{ text: 'Cost 350', size: 140, fill: 'gold' }] });
  T.overlay('title', s2a.at + 2, win2 - s2a.at - 2, { y: 520, burst: true, lines: [{ text: 'vs 3 soldiers', size: 120, fill: 'blue' }] });
  T.overlay('flash', win2, 6, { peak: 0.5 });
  T.overlay('title', win2 + 2, at('l3') - win2 - 2, { y: 520, burst: true, lines: [{ text: `${Math.round(heroHp(wc.states[wDeath]) * 100)}% left`, size: 150, fill: 'orange' }] });
  T.overlay('title', s3a.at + 2, fall3 - s3a.at - 2, { y: 520, burst: true, stagger: 4, lines: [{ text: 'vs 4 soldiers', size: 120, fill: 'blue' }, { text: 'cost 200', size: 90, fill: 'white', gap: 6 }] });
  T.overlay('flash', fall3, 8, { peak: 0.8 });
  T.overlay('title', fall3 + 2, at('l4') - fall3 - 2, { y: 520, burst: true, lines: [{ text: 'IT FALLS', size: 170, fill: 'orange' }] });
  s4.forEach((s, i) => {
    T.overlay('badge', s.at + 1, s.dur - 1, { text: others[i][1], y: 300, color: '#ffd466', size: 56 });
    T.overlay('title', s.at + 2, s.dur - 2, { y: 520, burst: true, lines: [{ text: others[i][2], size: 150, fill: 'gold' }] });
  });
  T.overlay('title', s4q.at + 2, at('l5') - s4q.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'A bug?', size: 130, fill: 'white' }, { text: 'Or a back-line unit?', size: 92, fill: 'gold', gap: 6 }] });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Buff it', size: 140, fill: 'gold' }, { text: 'or leave it?', size: 110, fill: 'white', gap: 4 }] });
  T.overlay('title', qAt + F(1.4), endAt - qAt - F(1.4), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one fix at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2', 'l3', 'l4'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound ----------------------------------------------------------------------------------
  T.music('music.cosmic', 0, total, { from: 30, gainDb: -2, fadeIn: 0.3, fadeOut: 1.2 });
  T.mix.config = { musicDb: -15, sfxDb: -8, accentDb: -6, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('vs_slam', fall3, { gainDb: -6 });
  T.accent('region_open', endAt, { gainDb: -6 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv6/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv6-devlog-6-a-broken-legendary', cover: 0.03 };
}
