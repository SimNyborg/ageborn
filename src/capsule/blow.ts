/**
 * The hammer's motion over a timed blow (DESIGN A10 steps 3 and 3b): a pure function of the step's
 * time, so the swing always lands exactly on the beat the runner judges against, and a smear can
 * sample earlier poses. View-side floats (B3); no Pixi imports.
 *
 * The hammer pivots at its grip (the hand), right of the drum. Main strike (800 ms): on each count-in
 * tick (0, 200, 400 ms) the hand lifts the hammer a notch higher with a small overshoot, so it climbs
 * in three visible steps to high above the drum; then a short pull back over the shoulder (the
 * anticipation), a 100 ms swing down in an arc onto the drum on the fourth beat, the hit-stop with
 * the head on the drum (`pinMs`), and a bounce back up into the next count-in (to rest after the
 * last). Summit strike: the white-hot hammer climbs two notches, then comes down slowly over the
 * last beat.
 */
import { easeInQuad, easeOutBack, easeOutCubic, easeOutQuad, lerp, span } from './ease';
import { SHOW_TIMING } from './plan';

/** Grip, rest and hit angles (radians; the head swings towards the drum as the angle falls). */
export const HAMMER = { x: 822, y: 474, rest: 0.38, hit: -0.74 } as const;

/** A pose: the hammer's rotation and how far the hand has lifted it (design px, up). */
export interface Pose {
  a: number;
  lift: number;
}

export const BLOW = {
  beatMs: SHOW_TIMING.strikeBeatMs,
  /** Each count-in notch lifts over this long. */
  liftMs: 80,
  /** The anticipation: a pull back over the shoulder just before the swing. */
  pullMs: 40,
  /** The swing itself. */
  downMs: 100,
  /**
   * The notches: after the rebound, then after ticks 1, 2 and 3 (the top), then the pull. Each tick
   * tips the head about 0.16 rad further over the drum as the hand lifts it, so the hammer itself
   * counts in (readable on a phone), and the pull back over the shoulder is a real wind-up.
   */
  notches: [
    { a: 0.34, lift: 10 },
    { a: 0.18, lift: 36 },
    { a: 0.02, lift: 62 },
    { a: -0.13, lift: 88 },
  ] as readonly Pose[],
  pull: { a: 0.3, lift: 96 } as Pose,
  /**
   * The hammer rests on the drum this long after the hit (the visible hit-stop), by grade. Even an
   * ungraded hit sits 100 ms (`latencyMs + perfectMs + 10` of `STRIKE_WINDOW`), so a Perfect tapped
   * after the hit (the raw Perfect window ends 90 ms after it) still finds the head on the drum and
   * the stage extends the pin through its flourish. A Good that late (up to +170 ms) comes with the
   * hammer in the air; its flourish stays at the hit point, never on the hammer.
   */
  pinMs: { none: 100, climb: 110, good: 110, perfect: 130, max: 160 } as const,
  /** Summit strike: two notches up (white-hot), then the slow descent over the last beat. */
  summit: {
    notches: [
      { a: 0.2, lift: 70 },
      { a: 0.08, lift: 100 },
    ] as readonly Pose[],
    liftMs: 100,
    fastShare: 0.4,
    fastReach: 0.55,
  },
} as const;

export interface BlowPose {
  kind: 'strike' | 'summitStrike';
  impactMs: number;
  durationMs: number;
  /** The pose the hammer had when the blow began (continuity from the charge or the last blow). */
  from: Pose;
  /** How long it stays down after the hit. */
  pinMs: number;
  /** The last blow before the burst or a summit gem: rebound to rest, not into a count-in. */
  last: boolean;
  /** Summit strikes hold on the drum at least this long (A10 step 3b), then lift. */
  holdMs?: number;
}

const HIT: Pose = { a: HAMMER.hit, lift: 0 };
const REST: Pose = { a: HAMMER.rest, lift: 0 };

function mix(p: Pose, q: Pose, u: number): Pose {
  return { a: lerp(p.a, q.a, u), lift: lerp(p.lift, q.lift, u) };
}

/** The hammer's pose at step time `t`. */
export function blowPose(b: BlowPose, t: number): Pose {
  return b.kind === 'summitStrike' ? summitPose(b, t) : strikePose(b, t);
}

function strikePose(b: BlowPose, t: number): Pose {
  const N = BLOW.notches;
  const down0 = b.impactMs - BLOW.downMs;
  const pull0 = down0 - BLOW.pullMs;
  const top = N[3] ?? REST;
  if (t < pull0) {
    const k = Math.max(0, Math.min(2, Math.floor(t / BLOW.beatMs)));
    const lo = k === 0 ? b.from : (N[k] ?? REST);
    return mix(lo, N[k + 1] ?? REST, easeOutBack(span(t - k * BLOW.beatMs, 0, BLOW.liftMs), 1.7));
  }
  if (t < down0) return mix(top, BLOW.pull, easeOutQuad(span(t, pull0, down0)));
  if (t < b.impactMs) {
    // The swing: the head accelerates along its arc while the hand drives down.
    const u = (t - down0) / BLOW.downMs;
    return { a: lerp(BLOW.pull.a, HAMMER.hit, Math.pow(u, 2.2)), lift: lerp(BLOW.pull.lift, 0, easeInQuad(u)) };
  }
  if (t < b.impactMs + b.pinMs) return HIT;
  const u = span(t, b.impactMs + b.pinMs, b.durationMs);
  const target = b.last ? REST : (N[0] ?? REST);
  return { a: lerp(HAMMER.hit, target.a, easeOutBack(u, 1.3)), lift: lerp(0, target.lift, easeOutCubic(u)) };
}

function summitPose(b: BlowPose, t: number): Pose {
  const S = BLOW.summit;
  const descent0 = b.impactMs - BLOW.beatMs;
  const top = S.notches[1] ?? REST;
  if (t < descent0) {
    const k = t < BLOW.beatMs ? 0 : 1;
    const lo = k === 0 ? b.from : (S.notches[0] ?? REST);
    return mix(lo, S.notches[k] ?? REST, easeOutBack(span(t - k * BLOW.beatMs, 0, S.liftMs), 1.4));
  }
  if (t < b.impactMs) {
    // A slow descent over the last beat: a quick start, then the final stretch at half speed.
    const u = (t - descent0) / BLOW.beatMs;
    const p = u < S.fastShare ? S.fastReach * easeInQuad(u / S.fastShare) : S.fastReach + (1 - S.fastReach) * ((u - S.fastShare) / (1 - S.fastShare));
    return mix(top, HIT, p);
  }
  const hold = Math.max(b.holdMs ?? 0, b.pinMs);
  if (t < b.impactMs + hold) return HIT;
  const u = span(t, b.impactMs + hold, b.durationMs);
  return { a: lerp(HAMMER.hit, HAMMER.rest + 0.2, easeOutBack(u, 1.4)), lift: lerp(0, 20, easeOutCubic(u)) };
}
