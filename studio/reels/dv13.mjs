// DV13 edit: "Devlog #13: the ship that attacks after it dies" (indie-dev angle, a twist found in DV10's footage).
// In shots/dv10.mjs counter, the Mothership calls a strike at frame 256 (callStrike, 1 s delay), dies at 266 and
// the strike lands at 319, hitting all four remaining Ion Rangers (clip events). Narration from work/dv13.
import { readFileSync } from 'node:fs';
import { loadClip, Timeline } from '../lib/edit.mjs';

const OFF = JSON.parse(readFileSync(new URL('../work/dv13/offsets.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../work/dv13/lines.json', import.meta.url)));
const CALL = 256;
const LAND = 319;

export async function edit() {
  const T = new Timeline('dv13', { bg: '#1d1828' });
  const F = (s) => T.f(s);
  const at = (k) => F(OFF[k][0]);
  const fit = (clip, from, to, dur, look = {}) => T.add(clip, from, Math.min(clip.frames, to), { rate: (Math.min(clip.frames, to) - from) / dur, look });

  const ctr = loadClip('dv10', 'counter');
  const death = ctr.m('death');
  const ON_SQUAD = { zoom: [1.15, 1.35], origin: [260, 1180] };

  // the rangers shoot the ship down
  const s0 = fit(ctr, 150, death + 12, at('l1'), { zoom: [1.0, 1.06], origin: [540, 1150] });
  const deathAt = s0.map(death);
  // a second later: the strike lands on the squad (slow motion)
  const s1 = fit(ctr, death + 12, LAND + 24, at('l2') - T.t, { cutIn: 'punch', ...ON_SQUAD });
  const landAt = s1.map(LAND);
  // replay: the call before the death, then the landing again
  const s2a = fit(ctr, CALL - 14, death + 8, F(2.4), { cutIn: 'flash', zoom: [1.1, 1.1], origin: [700, 1100] });
  const callAt = s2a.map(CALL);
  const s2b = fit(ctr, LAND - 20, LAND + 30, at('l3') - T.t, { cutIn: 'punch', ...ON_SQUAD });
  const land2At = s2b.map(LAND);
  // the question on a held frame, then the end card
  const holdSrc = ctr.frames - 1;
  const qAt = T.t;
  const qDur = F(OFF.end + 0.9) - qAt;
  T.add(ctr, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: qAt, dur: qDur });
  T.t = qAt + qDur;
  const endAt = T.t;
  const endDur = F(1.6);
  T.add(ctr, holdSrc, holdSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('badge', 4, s1.at - 4, { text: 'DEVLOG #13', y: 200, color: '#ffd466', size: 52 });
  T.overlay('title', 0, deathAt, { y: 470, stagger: 4, lines: [{ text: '5 rangers', size: 130, fill: 'blue' }, { text: 'vs 1 mothership', size: 86, fill: 'white', gap: 4 }] });
  T.overlay('flash', deathAt, 8, { peak: 0.6 });
  T.overlay('title', deathAt + 2, s1.at - deathAt - 2, { y: 470, burst: true, lines: [{ text: 'DOWN', size: 170, fill: 'gold' }] });
  T.overlay('title', s1.at + 2, landAt - s1.at - 2, { y: 470, burst: true, lines: [{ text: 'Fight over?', size: 140, fill: 'white' }] });
  T.overlay('flash', landAt, 8, { color: '#ffffff', peak: 0.7 });
  T.overlay('title', landAt + 2, s2a.at - landAt - 2, { y: 470, burst: true, lines: [{ text: 'BOOM', size: 180, fill: 'orange' }] });
  T.overlay('badge', s2a.at + 2, s2b.at + s2b.dur - s2a.at - 2, { text: 'REPLAY', y: 300, color: '#9fe7ff', size: 62 });
  T.overlay('title', callAt, s2b.at - callAt, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Strike called', size: 120, fill: 'gold' }, { text: 'just before it dies', size: 84, fill: 'white', gap: 4 }] });
  T.overlay('title', s2b.at + 2, qAt - s2b.at - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'It still lands', size: 130, fill: 'orange' }] });
  T.overlay('flash', land2At, 8, { color: '#ffffff', peak: 0.6 });
  T.overlay('title', qAt + 2, endAt - qAt - 2, { y: 470, burst: true, stagger: 4, lines: [{ text: 'Should it', size: 120, fill: 'white' }, { text: 'still count?', size: 130, fill: 'gold', gap: 4 }] });
  T.overlay('title', qAt + F(1.2), endAt - qAt - F(1.2), { y: 820, burst: true, lines: [{ text: 'Comment below', size: 80, fill: 'blue' }] });
  T.overlay('endcard', endAt, endDur, { tagline: 'Building Ageborn, one rule at a time.', cta: 'FOLLOW THE DEVLOG' });
  ['l0', 'l1', 'l2'].forEach((k, i) => T.overlay('caption', at(k), F(OFF[k][1]) + 6, { text: LINES[i], y: 1600, size: 44 }));

  // --- sound: low music with a soft fade-in, the battle's own sound -------------------------------
  T.music('music.cosmic', 0, total, { from: 20, gainDb: -4, fadeIn: 1.0, fadeOut: 1.2 });
  T.mix.config = { musicDb: -16, sfxDb: -8, accentDb: -8, sidechainDb: 6, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('region_open', endAt, { gainDb: -8 });
  const out = T.write({ endFade: 0.5, narration: { file: new URL('../work/dv13/narration.wav', import.meta.url).pathname, at: 0, gainDb: 0 } });
  return { ...out, file: 'dv13-devlog-13-the-ship-that-attacks-after-it-dies', cover: 0.35 };
}
