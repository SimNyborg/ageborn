/**
 * The hammer's motion over a timed blow (DESIGN A10 steps 3 and 3b): a pure function of the step's
 * time, so the downswing always lands exactly on the beat the runner judges against, and a trail can
 * sample earlier poses. View-side floats (B3); no Pixi imports.
 *
 * Main strike (800 ms): the hammer notches up on each count-in tick (0, 200, 400 ms) with a small
 * overshoot, pulls back a hair (anticipation), swings down in 100 ms, sits on the drum for the
 * hit-stop (`pin`), then bounces back up into the next count-in (or to rest after the last one).
 * Summit strike: it notches up twice, white-hot, and starts its slow descent on the third tick.
 */
import { easeInQuad, easeOutBack, easeOutQuad, lerp, span } from './ease';
import { SHOW_TIMING } from './plan';

/** Grip, rest and hit angles (radians; the head swings towards the drum as the angle falls). */
export const HAMMER = { x: 822, y: 474, rest: 0.38, hit: -0.74 } as const;

export const BLOW = {
  beatMs: SHOW_TIMING.strikeBeatMs,
  /** Each count-in notch lifts over this long. */
  liftMs: 70,
  /** The anticipation pull just before the swing. */
  pullMs: 30,
  pull: 0.07,
  /** The swing itself. */
  downMs: 100,
  /** Cock angles above rest: after the rebound, then after ticks 1, 2 and 3. */
  levels: [0.08, 0.26, 0.44, 0.62] as const,
  /** The hammer rests on the drum this long after the hit (the visible hit-stop), by grade. */
  pinMs: { none: 40, climb: 60, good: 80, perfect: 120, max: 150 } as const,
  /** Summit strike: two notches up, then the slow descent over the last beat. */
  summit: { wind: 0.62, top: 0.8, liftMs: 90, fastShare: 0.4, fastReach: 0.55 } as const,
} as const;

export interface BlowPose {
  kind: 'strike' | 'summitStrike';
  impactMs: number;
  durationMs: number;
  /** The angle the hammer had when the blow began (continuity from the charge or the last blow). */
  from: number;
  /** How long it stays down after the hit. */
  pinMs: number;
  /** The last blow before the burst or a summit gem: rebound to rest, not into a count-in. */
  last: boolean;
  /** Summit strikes hold on the drum this long (A10 step 3b), then lift. */
  holdMs?: number;
}

/** The hammer's rotation at step time `t`. */
export function blowAngle(b: BlowPose, t: number): number {
  return b.kind === 'summitStrike' ? summitAngle(b, t) : strikeAngle(b, t);
}

function strikeAngle(b: BlowPose, t: number): number {
  const R = HAMMER.rest;
  const L = BLOW.levels;
  const down0 = b.impactMs - BLOW.downMs;
  const pull0 = down0 - BLOW.pullMs;
  const top = R + L[3];
  if (t < pull0) {
    const k = Math.max(0, Math.min(2, Math.floor(t / BLOW.beatMs)));
    const lo = k === 0 ? b.from : R + (L[k] ?? 0);
    const hi = R + (L[k + 1] ?? 0);
    return lerp(lo, hi, easeOutBack(span(t - k * BLOW.beatMs, 0, BLOW.liftMs), 1.6));
  }
  if (t < down0) return top + BLOW.pull * easeOutQuad(span(t, pull0, down0));
  if (t < b.impactMs) return lerp(top + BLOW.pull, HAMMER.hit, Math.pow((t - down0) / BLOW.downMs, 2.4));
  if (t < b.impactMs + b.pinMs) return HAMMER.hit;
  const target = b.last ? R : R + L[0];
  return lerp(HAMMER.hit, target, easeOutBack(span(t, b.impactMs + b.pinMs, b.durationMs), 1.2));
}

function summitAngle(b: BlowPose, t: number): number {
  const R = HAMMER.rest;
  const S = BLOW.summit;
  const descent0 = b.impactMs - BLOW.beatMs;
  if (t < descent0) {
    const k = t < BLOW.beatMs ? 0 : 1;
    const lo = k === 0 ? b.from : R + S.wind;
    const hi = R + (k === 0 ? S.wind : S.top);
    return lerp(lo, hi, easeOutBack(span(t - k * BLOW.beatMs, 0, S.liftMs), 1.4));
  }
  if (t < b.impactMs) {
    // A slow descent over the last beat: a quick start, then the final stretch at half speed.
    const u = (t - descent0) / BLOW.beatMs;
    const p = u < S.fastShare ? S.fastReach * easeInQuad(u / S.fastShare) : S.fastReach + (1 - S.fastReach) * ((u - S.fastShare) / (1 - S.fastShare));
    return lerp(R + S.top, HAMMER.hit, p);
  }
  const hold = Math.max(b.holdMs ?? 0, b.pinMs);
  if (t < b.impactMs + hold) return HAMMER.hit;
  return lerp(HAMMER.hit, R + 0.2, easeOutBack(span(t, b.impactMs + hold, b.durationMs), 1.4));
}

/** 0..1: how far the hammer is cocked back (the grip rises with it). */
export function cockOf(angle: number): number {
  return Math.max(0, Math.min(1, (angle - HAMMER.rest) / (BLOW.summit.top + 0.02)));
}
