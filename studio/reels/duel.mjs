// Shared edit for short "1 Legendary vs N" duels (R7, R8), built on what the first week taught us:
// average watch time was 2-5 s, so these open cold on the impact with the matchup slammed over the
// action (no intro shot), run about 9-10 s, and end on a short end card.
import { loadClip, MUSIC, Timeline } from '../lib/edit.mjs';

const heroHp = (st) => (st.watched?.[0] ? st.watched[0].hpBp / 10000 : 0);

/**
 * o: { id, file, heroName, hordeLabel, ageName, music, accentFill, winLine, tagline }
 */
export function duelEdit(o) {
  const a = loadClip(o.id, 'a');
  const b = loadClip(o.id, 'b');
  const c = loadClip(o.id, 'c');
  const T = new Timeline(o.id, { bg: '#1c1712' });
  const F = (s) => T.f(s);

  // 1. cold open: a few frames of the run, then the impact in slow motion
  const from = Math.max(0, a.m('impact') - 10);
  const sImpact = T.add(a, from, Math.min(a.frames, a.m('impact') + 62), { look: { shakes: [{ at: a.m('impact') - from, dur: 14, amp: 18 }], zoom: [1.06, 1.0], origin: [540, 1300] } });
  const impactAt = sImpact.map(a.m('impact'));
  // 2. mid-fight, one punch cut
  const sMid = T.add(b, 2, 32, { look: { cutIn: 'punch' } });
  // 3. the finale: the last enemy falls, the hero holds on
  const cStart = Math.max(0, c.m('last-one') - 6);
  const sFinal = T.add(c, cStart, Math.min(c.frames, c.m('last-death') + 46), { rate: 1.2, look: { cutIn: 'punch' } });
  const lastDeath = sFinal.map(c.m('last-death'));
  // 4. a short end card on the last frame
  const endAt = T.t;
  const endDur = F(1.6);
  const lastSrc = Math.min(c.frames, c.m('last-death') + 46) - 1;
  T.add(c, lastSrc, lastSrc + 1, { look: { freeze: true }, sfx: false, at: endAt, dur: endDur });
  T.t = endAt + endDur;
  const total = T.t;

  // --- overlays -------------------------------------------------------------------------------
  T.overlay('vignette', 0, total, { top: 0.5, bottom: 0.72 });
  // the matchup lands on frame 0, over the action
  T.overlay('title', 0, impactAt + F(1.1), { y: 470, burst: true, stagger: 3, lines: [{ text: `1 ${o.heroName}`, size: 128, fill: o.accentFill }, { text: `vs ${o.hordeLabel}`, size: 108, fill: 'blue', gap: 4 }] });
  T.overlay('caption', F(0.5), impactAt + F(1.6) - F(0.5), { text: 'Who wins? Guess before the end', y: 690 });
  T.overlay('flash', impactAt, 7, { peak: 0.7 });
  T.overlay('flash', sMid.at, 5, { peak: 0.35 });

  // live health of the hero and the enemies left, from the mid cut to the last death
  const hudFrom = sMid.at;
  const hudTo = lastDeath + 14;
  const hp = T.series(sMid, hudFrom, hudTo - hudFrom, heroHp);
  T.overlay('hpbar', hudFrom, hudTo - hudFrom, { label: o.heroName, sub: o.ageName, side: 1, y: 300, values: hp });
  T.overlay('counter', hudFrom + 2, hudTo - hudFrom - 2, { label: `${o.hordeWord} LEFT`, y: 560, color: 'blue', size: 130, values: T.series(sMid, hudFrom + 2, hudTo - hudFrom - 2, (st) => st.sides[0].units) });
  const hpLeft = Math.max(0, Math.round(hp[hp.length - 1] * 100));
  T.overlay('flash', lastDeath, 7, { peak: 0.6 });
  T.overlay('title', lastDeath + 3, endAt - lastDeath - 3, { y: 820, burst: true, stagger: 5, lines: [{ text: o.winLine, size: 120, fill: o.accentFill }, { text: `with ${hpLeft}% left`, size: 84, fill: 'white', gap: 6 }] });
  T.overlay('endcard', endAt, endDur, { tagline: o.tagline, cta: 'FOLLOW FOR MORE BATTLES' });

  // --- sound ----------------------------------------------------------------------------------
  T.music(o.music, 0, total, { from: MUSIC.peak - impactAt / 30, gainDb: 0, fadeIn: 0.02, fadeOut: 0.8 });
  T.mix.config = { musicDb: -9, sfxDb: -1, accentDb: -2, sidechainDb: 4, exclude: ['emote_pop', 'xp_tick', 'coin_gain', 'alert_base', 'evolve_ready'] };
  T.accent('vs_slam', 1, { gainDb: -2 });
  T.accent('explosion_m', impactAt, { gainDb: -6 });
  T.accent('ui_whoosh', sMid.at, { gainDb: -6 });
  T.accent('star_stamp', lastDeath + 3, { gainDb: -3 });
  T.accent('region_open', endAt, { gainDb: -6 });

  const out = T.write({ endFade: 0.4 });
  return { ...out, file: o.file, cover: 0.6 };
}
