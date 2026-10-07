/**
 * The rarity burst (owner request 2026-10-07; DESIGN A10 step 5a, A12, A13): when a Rare, Epic or
 * Legendary card's rarity is revealed, the card explodes in its rarity colour, scaled with the
 * rarity so the ladder reads: Rare a small pop, Epic a strong burst, Legendary a big explosion.
 *
 * The beat: the honest pre-signal is the anticipation (the card glows in its rarity colour, trembles
 * harder and harder, light leaks from its edges and cracks, a rising tone), then a short windup (the
 * card compresses), the pop (a burst of light and particles in the rarity colour, a shockwave ring, a
 * brief hit-stop, screen shake), the card blasting out and slamming back into place with a bounce,
 * and embers drifting up. Then the flip shows who it is.
 *
 * Honesty (A10, A15.3): the result is rolled and saved before the show; this is pure presentation of
 * a rarity already shown by the pre-signal. The level is the card's own rarity, never higher, it is
 * planned only right after that card's pre-signal, and nothing here reads or changes contents.
 *
 * This module is pure data (timing, effect sizes and their Reduce motion / Lite variants), so the
 * plan, the stage and the tests share one table.
 */
import type { Rarity } from '@/contracts';

export type BurstLevel = 'rare' | 'epic' | 'legendary';

export interface RarityBurstSpec {
  /** The windup from the step's start to the pop: the card compresses, the leaks peak, the riser lands. */
  popMs: number;
  /** The whole step: windup, pop, hit-stop, slam and bounce, embers lifting off. */
  durationMs: number;
  /** View-only freeze at the pop (A12: effects creep, the world holds). */
  hitStopMs: number;
  /** After the hit-stop the card falls back and slams into place this long after; it bounces after. */
  slamMs: number;
  /** Screen flash alpha at the pop (tinted towards the rarity colour). */
  flash: number;
  /** Trauma added at the pop (A12 shake = trauma²). */
  trauma: number;
  /** Zoom punch at the pop. */
  punch: number;
  /** Shockwave rings (1 Rare, 2 Epic, 3 Legendary plus a floor ring). */
  rings: number;
  /** Burst particles at the pop: streaks, sparks, stars and light puffs. */
  particles: number;
  /** Embers drifting up after the pop, released over `emberMs`. */
  embers: number;
  emberMs: number;
  /** How much the card blasts out (scale) at the pop before it slams back. 0 = it stays put. */
  blast: number;
  /** Light leaking from the card's edges and cracks at the peak of the windup (0..1). */
  leak: number;
  /** Diameter of the burst light (design px). */
  lightPx: number;
  /** Haptics at the pop (only with Settings.vibrate, A13). */
  vibrate: number[];
}

/**
 * Timing and size per rarity (full graphics, motion on). Every number grows with the rarity, so the
 * scale reads at a glance (tested). Legendary stays under 1 s: the walkout follows it.
 */
export const RARITY_BURST: Readonly<Record<BurstLevel, RarityBurstSpec>> = {
  rare: { popMs: 70, durationMs: 400, hitStopMs: 40, slamMs: 110, flash: 0.18, trauma: 0.16, punch: 0.012, rings: 1, particles: 28, embers: 8, emberMs: 400, blast: 0.1, leak: 0.45, lightPx: 420, vibrate: [15] },
  epic: { popMs: 150, durationMs: 700, hitStopMs: 80, slamMs: 150, flash: 0.45, trauma: 0.45, punch: 0.032, rings: 2, particles: 72, embers: 18, emberMs: 900, blast: 0.18, leak: 0.8, lightPx: 700, vibrate: [30, 20, 40] },
  legendary: { popMs: 230, durationMs: 1000, hitStopMs: 130, slamMs: 190, flash: 0.85, trauma: 0.72, punch: 0.06, rings: 3, particles: 150, embers: 32, emberMs: 1600, blast: 0.28, leak: 1, lightPx: 1100, vibrate: [50, 30, 90] },
};

/** Upper bound for the step (A10 limits; `checkPlan` enforces it). */
export const RARITY_BURST_LIMIT_MS = 1000;

/**
 * The rising tone under the anticipation (`rarity_riser`, A13): rendered this long, and pitched by
 * the plan so it peaks exactly at the pop (Epic and Legendary; Rare keeps its two-note sting).
 */
export const RARITY_RISER_MS = 900;

/** Particle budgets at the pop: the burst never asks for more than this (A12 caps; mid phones). */
export const BURST_PARTICLE_CAP = { full: 160, lite: 80, reduced: 12 } as const;

/** Rare and up burst; Common never does. */
export function burstLevel(r: Rarity): BurstLevel | null {
  return r === 'common' ? null : r;
}

export interface BurstSettings {
  reduceMotion: boolean;
  lite?: boolean;
}

/** The effect sizes the stage plays, after Reduce motion and Lite (timing stays the plan's). */
export interface BurstFx extends RarityBurstSpec {
  /** A calm glow behind the card (alpha 0..1): the one effect Reduce motion keeps besides the sound. */
  glow: number;
  /** The card shakes before the pop and bounces after it. */
  motion: boolean;
}

/**
 * Applies the player's settings (A12): Reduce motion has no shake, no flash, no hit-stop, no punch,
 * no blast or bounce and no shockwave, only a calm glow, a few slow embers and the sound; Lite halves
 * the particles and embers and keeps at most two rings.
 */
export function resolveBurstFx(level: BurstLevel, s: BurstSettings): BurstFx {
  const b = RARITY_BURST[level];
  if (s.reduceMotion) {
    return {
      ...b,
      hitStopMs: 0,
      flash: 0,
      trauma: 0,
      punch: 0,
      rings: 0,
      blast: 0,
      particles: Math.min(BURST_PARTICLE_CAP.reduced, Math.round(b.particles / 10)),
      embers: Math.round(b.embers / 3),
      leak: b.leak * 0.6,
      glow: level === 'legendary' ? 0.75 : level === 'epic' ? 0.6 : 0.45,
      motion: false,
      vibrate: [],
    };
  }
  if (s.lite) {
    return {
      ...b,
      particles: Math.min(BURST_PARTICLE_CAP.lite, Math.round(b.particles / 2)),
      embers: Math.round(b.embers / 2),
      rings: Math.min(2, b.rings),
      glow: 1,
      motion: true,
    };
  }
  return { ...b, particles: Math.min(BURST_PARTICLE_CAP.full, b.particles), glow: 1, motion: true };
}
