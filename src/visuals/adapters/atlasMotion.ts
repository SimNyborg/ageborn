/**
 * Pure motion helpers for the atlas unit view (ANIM_SPEC 2026-10-02, render changes R1-R8).
 *
 * Everything here is visual only: the sim owns all timing (DESIGN B5), and none of these helpers
 * read or change sim state. The battle view passes the measured ground velocity (R1); the atlas
 * view turns it into a walk rate, a frame-locked root offset (R2), an attack variant (R4), a
 * hold-step warp of the wind-up (R5), cartoon spawn and hit motion (R6) and code-driven secondary
 * motion (R8: hover bob, tilt, lean).
 */
import type { Texture } from 'pixi.js';

/** Body types of the walk standard (ANIM_SPEC 2.1); written by the art pipeline as `meta.ageborn.gait`. */
export type UnitGait = 'biped' | 'heavy' | 'quad' | 'rider' | 'wheeled' | 'tracked' | 'walker' | 'hover' | 'fly';
export const UNIT_GAITS: readonly UnitGait[] = ['biped', 'heavy', 'quad', 'rider', 'wheeled', 'tracked', 'walker', 'hover', 'fly'];

/** Attack variants (ANIM_SPEC 2.2): A is the shipped `attack`; B and C share its timing contract. */
export const ATTACK_VARIANTS = ['attack', 'attack_b', 'attack_c'] as const;
/** The second attacker's own clip (riders, sponsons, the MG; `attackIndex >= 1`, R3). */
export const ALT_ATTACK = 'attack_alt';
/** Clips that may live in the lazily loaded extras sheet `<slug>.x.json` (P4). */
export const EXTRA_CLIPS: readonly string[] = ['attack_b', 'attack_c', ALT_ATTACK];

/** True for the gaits whose feet plant on the ground (R2 frame lock on). */
export function plantsFeet(g: UnitGait | null | undefined): boolean {
  return g === 'biped' || g === 'heavy' || g === 'quad' || g === 'rider' || g === 'walker';
}

/** True for units that float in the air (R8 hover bob and tilt). */
export function hovers(g: UnitGait | null | undefined): boolean {
  return g === 'hover' || g === 'fly';
}

/**
 * The gait of a sheet that does not write one yet (all sheets before the ANIM_SPEC re-render), from
 * its procedural puppet's rig family. Heavy bipeds are those taller than 95 lu.
 */
export function legacyGait(family: string | undefined, heightLu: number, opts: { air?: boolean; slug?: string; wheels?: boolean } = {}): UnitGait | null {
  if (opts.slug === 'hover_tank') return 'hover';
  if (opts.air || family === 'flyer') return 'fly';
  // a rider or beast that pulls a cart on wheels (the War Chariot) rolls: no frame lock (review N3)
  if (opts.wheels && (family === 'rider' || family === 'quadruped')) return 'wheeled';
  switch (family) {
    case 'biped':
      return heightLu >= 95 ? 'heavy' : 'biped';
    case 'quadruped':
      return 'quad';
    case 'rider':
      return 'rider';
    case 'walker':
      return 'walker';
    case 'vehicle':
      return 'wheeled';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------
// R1: walk rate from the measured velocity

/** Walk rate clamp against the authored cycle (R1: 0.33x-3x). */
export const GAIT_RATE_MIN = 0.33;
export const GAIT_RATE_MAX = 3;

/**
 * Walk cycle length (ms) for a sheet so the planted foot keeps pace with the ground: the authored
 * cycle times `natural / |speed|`, clamped to 0.33x-3x of it. Sheets without a natural speed keep
 * their authored cycle.
 */
export function gaitWalkDurationMs(authoredMs: number, naturalLuPerS: number | undefined, speedLuPerS: number): number {
  if (!naturalLuPerS || !(naturalLuPerS > 0)) return authoredMs;
  const s = Math.abs(speedLuPerS);
  if (!(s > 1e-6)) return authoredMs * GAIT_RATE_MAX;
  return Math.min(authoredMs * GAIT_RATE_MAX, Math.max(authoredMs * GAIT_RATE_MIN, (authoredMs * naturalLuPerS) / s));
}

/** +1 plays the walk forward, -1 backward (a backpedal for the Hold walk-back and Fall back, R1). */
export function walkDirection(speedLuPerS: number): 1 | -1 {
  return speedLuPerS < 0 ? -1 : 1;
}

// ---------------------------------------------------------------------------------------------
// R2: frame-locked root motion

/**
 * Position inside a looping step list: the step index at `t` (ms, any sign, wrapped into the cycle
 * of `durationMs`) and the time since that step began on screen. A backward walk enters a step at
 * its end, so the time since its start counts from there.
 */
export function loopStepAt(steps: readonly number[], durationMs: number, t: number, dir: 1 | -1 = 1): { step: number; sinceMs: number } {
  const total = steps.reduce((a, b) => a + b, 0);
  const d = Math.max(1e-6, durationMs);
  const tt = ((t % d) + d) % d;
  const k = total > 0 ? d / total : 1;
  let acc = 0;
  for (let i = 0; i < steps.length; i++) {
    const len = (steps[i] ?? 0) * k;
    if (tt < acc + len - 1e-9 || i === steps.length - 1) {
      return { step: i, sinceMs: dir > 0 ? tt - acc : Math.max(0, acc + len - tt) };
    }
    acc += len;
  }
  return { step: 0, sinceMs: 0 };
}

/**
 * The frame lock (R2): while a legged unit walks, its body is drawn where the unit stood when the
 * current sprite frame began, so the planted foot stays on its pixel and the body moves forward in
 * one step at each frame change. Returns the body offset in world lu (0 at a frame start, then
 * `-vx * dt`). `vxLuPerS` is the world-space x velocity (sign included).
 */
export function frameLockOffset(vxLuPerS: number, sinceFrameMs: number): number {
  return -(vxLuPerS * sinceFrameMs) / 1000;
}

/** A frame lock larger than this (a knockback or a teleport) resets instead of dragging the body. */
export const FRAME_LOCK_MAX_LU = 16;

/** How fast the body eases back onto the sim position on a unit without planted feet (ms; review M3). */
export const FRAME_LOCK_RELEASE_TAU_MS = 35;
/** A body held still by an attack, a hit or the idle settles onto a standing unit's sim position this slowly (ms). */
export const FRAME_LOCK_SETTLE_TAU_MS = 500;
/** The offset a walk starts with (where the body was held) melts away this fast while walking (ms). */
export const FRAME_LOCK_CATCH_UP_TAU_MS = 120;

// ---------------------------------------------------------------------------------------------
// Clip switches (review M4)

/**
 * A switch between the walk and any other clip (the walk carry pose against the idle guard or an
 * attack's first pose) cross-dissolves over this long, so the weapon does not jump between poses.
 */
export const CROSS_HOLD_MS = 110;

/** The outgoing frame's alpha `t` ms into a cross-hold: eased out, 0 at `CROSS_HOLD_MS`. */
export function crossHoldAlpha(t: number): number {
  const u = Math.max(0, Math.min(1, t / CROSS_HOLD_MS));
  return (1 - u) * (1 - u * 0.5);
}

// ---------------------------------------------------------------------------------------------
// Fall back (review N4)

/** A retreat this long (ms) turns the unit to walk home forward instead of backpedalling. */
export const RETREAT_TURN_MS = 700;
/** It turns back once it has not retreated for this long (ms). */
export const RETREAT_UNTURN_MS = 150;
/** The turn: the body narrows to its edge and widens again, mirrored, over this long (ms). */
export const TURN_MS = 140;

/** The x scale factor `t` ms into a turn (1 -> 0.15 -> 1); the facing flips at the midpoint. */
export function turnScale(t: number): number {
  const u = Math.max(0, Math.min(1, t / TURN_MS));
  return Math.max(0.15, Math.abs(1 - 2 * u));
}

// ---------------------------------------------------------------------------------------------
// R3 / review N2: the second attacker after a body attack

/** A rider shot whose wind-up has at least this long left when the body attack ends still plays `attack_alt`. */
export const ALT_LATE_MIN_MS = 250;

// ---------------------------------------------------------------------------------------------
// R4: attack variants

/**
 * The per-unit variant cycle from the variants that have loaded: [A, B, A, C] with all three,
 * [A, B] or [A, C] with two, [A] alone.
 */
export function attackCycle(has: (anim: string) => boolean): string[] {
  const b = has('attack_b');
  const c = has('attack_c');
  if (b && c) return ['attack', 'attack_b', 'attack', 'attack_c'];
  if (b) return ['attack', 'attack_b'];
  if (c) return ['attack', 'attack_c'];
  return ['attack'];
}

/**
 * The variant for a unit's `plays`-th attack: the cycle starts at `unitId mod length` and moves on
 * with the view's own count of attack plays. It depends only on the event stream (replays and
 * screenshot tests draw the same thing) and the sim never reads it.
 */
export function pickAttackVariant(cycle: readonly string[], unitId: number, plays: number): string {
  const n = cycle.length;
  if (n === 0) return 'attack';
  const i = (((Math.trunc(unitId) % n) + n) % n + Math.max(0, Math.trunc(plays))) % n;
  return cycle[i] ?? 'attack';
}

// ---------------------------------------------------------------------------------------------
// R5: the hold step absorbs the wind-up

/** One shown step of an attack timeline. */
export interface TimelineSeg {
  step: number;
  ms: number;
}

/** A hold longer than this starts looping `holdLoop` (fuse fizz, aim wobble) when the clip has one (review N5: 350 ms read as a freeze). */
export const HOLD_LOOP_AFTER_MS = 200;
/** The hold shrinks to at most this share of its length before the rest of the wind-up shrinks. */
export const HOLD_MIN_SHARE = 0.4;

/**
 * The step where the impact lands (a step indexes `durationsMs`; a frame indexes the unique poses that
 * `sequence` plays). In order of trust:
 * 1. the step that starts at `impactAt` (the timing contract `check_timing.mjs` guards);
 * 2. an explicit `impactStep`;
 * 3. `impactFrame` (a unique-frame index, as the pipeline writes it) mapped through `sequence`.
 * They only agree without `sequence` when the clip plays its frames in order: a variant that repeats a
 * frame (Bonker C taps twice) has its impact frame at a later step (review B2, 2026-10-02).
 */
export function impactStepOf(steps: readonly number[], impactAt: number | null, impactFrame?: number, sequence?: readonly number[], impactStep?: number): number | null {
  const ok = (s: number | undefined): s is number => s !== undefined && Number.isInteger(s) && s > 0 && s < steps.length;
  if (impactAt !== null && impactAt > 0) {
    const total = steps.reduce((a, b) => a + b, 0);
    const at = impactAt * total;
    let acc = 0;
    for (let i = 0; i < steps.length; i++) {
      if (acc >= at - 0.5) return i > 0 ? i : null;
      acc += steps[i] ?? 0;
    }
  }
  if (ok(impactStep)) return impactStep;
  if (impactFrame !== undefined) {
    const s = sequence ? sequence.indexOf(impactFrame) : impactFrame;
    if (ok(s)) return s;
  }
  return null;
}

/**
 * The attack's steps re-timed so the impact step starts exactly at `windupMs` (the sim wind-up W).
 * With the authored pre-impact time P:
 * - no valid `holdStep`: every pre-impact step scales by W / P (the old even warp);
 * - W > P: the whole difference goes to `holdStep`; once that hold passes 350 ms and `holdLoop`
 *   exists, the extra time alternates its two steps;
 * - W < P: the hold shrinks first, down to 40% of its length, then the other steps shrink evenly.
 * The impact and every step after it keep their authored lengths.
 */
export function attackTimeline(steps: readonly number[], impactStep: number, windupMs: number, holdStep?: number, holdLoop?: readonly [number, number]): TimelineSeg[] {
  const out: TimelineSeg[] = [];
  const pre = steps.slice(0, impactStep);
  const P = pre.reduce((a, b) => a + b, 0);
  const W = Math.max(0, windupMs);
  const validHold = holdStep !== undefined && Number.isInteger(holdStep) && holdStep >= 0 && holdStep < impactStep && (steps[holdStep] ?? 0) > 0;
  const even = (): void => {
    const f = P > 0 ? W / P : 0;
    pre.forEach((ms, step) => out.push({ step, ms: ms * f }));
  };
  if (P <= 0) {
    // nothing before the impact: the wind-up holds the first frame
    if (W > 0) out.push({ step: 0, ms: W });
  } else if (!validHold) {
    even();
  } else {
    const h = holdStep as number;
    const hold = steps[h] ?? 0;
    if (W >= P) {
      const holdMs = hold + (W - P);
      for (let step = 0; step < impactStep; step++) {
        if (step !== h) {
          out.push({ step, ms: steps[step] ?? 0 });
          continue;
        }
        const loop = holdLoop && holdLoop.every((s) => Number.isInteger(s) && s >= 0 && s < steps.length) ? holdLoop : null;
        if (!loop || holdMs <= HOLD_LOOP_AFTER_MS) {
          out.push({ step: h, ms: holdMs });
          continue;
        }
        const first = Math.min(holdMs, Math.max(HOLD_LOOP_AFTER_MS, hold));
        out.push({ step: h, ms: first });
        let rest = holdMs - first;
        const seg = Math.min(120, Math.max(60, ((steps[loop[0]] ?? 80) + (steps[loop[1]] ?? 80)) / 2));
        let k = 0;
        while (rest > 1e-6) {
          const ms = rest < seg * 1.25 ? rest : seg;
          out.push({ step: loop[k % 2] ?? h, ms });
          rest -= ms;
          k++;
        }
      }
    } else {
      const others = P - hold;
      const cut = P - W;
      const holdCut = Math.min(cut, hold * (1 - HOLD_MIN_SHARE));
      const rest = cut - holdCut;
      if (rest > others + 1e-9) {
        even();
      } else {
        const f = others > 0 ? (others - rest) / others : 1;
        for (let step = 0; step < impactStep; step++) out.push({ step, ms: step === h ? hold - holdCut : (steps[step] ?? 0) * f });
      }
    }
  }
  for (let step = impactStep; step < steps.length; step++) out.push({ step, ms: steps[step] ?? 0 });
  return out;
}

/** The step shown at `t` ms of a (non-looping) timeline; the last step holds once it ends. */
export function timelineStepAt(tl: readonly TimelineSeg[], t: number): number {
  let acc = 0;
  for (const s of tl) {
    acc += s.ms;
    if (t < acc - 1e-9) return s.step;
  }
  return tl[tl.length - 1]?.step ?? 0;
}

/** When the timeline's impact step begins (ms): the sum of the segments before it. */
export function timelineImpactMs(tl: readonly TimelineSeg[], impactStep: number): number {
  let acc = 0;
  for (const s of tl) {
    if (s.step === impactStep) return acc;
    acc += s.ms;
  }
  return acc;
}

// ---------------------------------------------------------------------------------------------
// R6: cartoon runtime motion

export type MotionMass = 'light' | 'medium' | 'heavy';

/** Spawn pop (A11): scale 0 -> peak -> 1 over `ms`; heavies are slower with a smaller overshoot. */
export const SPAWN_POP: Readonly<Record<MotionMass, { ms: number; peak: number }>> = {
  light: { ms: 220, peak: 1.15 },
  medium: { ms: 260, peak: 1.12 },
  heavy: { ms: 320, peak: 1.08 },
};

/** The spawn pop's scale at `t` ms (0 at the start, the overshoot at 60%, 1 at the end). */
export function spawnPop(mass: MotionMass, t: number): number {
  const w = SPAWN_POP[mass];
  const u = Math.max(0, Math.min(1, t / w.ms));
  if (u >= 1) return 1;
  if (u < 0.6) {
    const f = u / 0.6;
    return w.peak * (1 - (1 - f) ** 3);
  }
  const g = (u - 0.6) / 0.4;
  return w.peak + (1 - w.peak) * (0.5 - 0.5 * Math.cos(g * Math.PI));
}

/** Hit squash depth by mass (0.9/1.1 light, 0.94/1.06 medium, 0.97/1.03 heavy). */
export const HIT_SQUASH: Readonly<Record<MotionMass, number>> = { light: 0.1, medium: 0.06, heavy: 0.03 };
export const HIT_SQUASH_OUT_MS = 90;
export const HIT_SQUASH_BACK_MS = 120;

/** The hit squash at `t` ms: x widens and y flattens (feet stay on the ground), out fast, back slower. */
export function hitSquash(mass: MotionMass, t: number): { sx: number; sy: number } {
  if (t <= 0 || t >= HIT_SQUASH_OUT_MS + HIT_SQUASH_BACK_MS) return { sx: 1, sy: 1 };
  const a = t < HIT_SQUASH_OUT_MS ? Math.sin((t / HIT_SQUASH_OUT_MS) * (Math.PI / 2)) : 0.5 + 0.5 * Math.cos(((t - HIT_SQUASH_OUT_MS) / HIT_SQUASH_BACK_MS) * Math.PI);
  const d = HIT_SQUASH[mass] * a;
  return { sx: 1 + d, sy: 1 - d };
}

// ---------------------------------------------------------------------------------------------
// R8: secondary motion in code

/** Hover bob (G8): a sine of 5 lu peak to peak (about 4.6 px on a phone), period 1.2-1.6 s by seed. */
export const HOVER_AMP_LU = 2.5;
export const HOVER_PERIOD_MS: readonly [number, number] = [1200, 1600];
/** Nose down while moving (G8: 4-8 degrees), eased over 250 ms. */
export const HOVER_TILT_RAD = (4 * Math.PI) / 180;
export const HOVER_TILT_TAU_MS = 250;

/** The hover bob's height (lu, + is up) at `clockMs`. */
export function hoverBob(clockMs: number, periodMs: number, phase: number): number {
  return Math.sin((clockMs / Math.max(1, periodMs)) * Math.PI * 2 + phase * Math.PI * 2) * HOVER_AMP_LU;
}

/** Lean against acceleration (R8): at most 3 degrees, full at this acceleration. */
export const LEAN_MAX_RAD = (3 * Math.PI) / 180;
export const LEAN_FULL_ACCEL = 700;
export const LEAN_TAU_MS = 120;

/**
 * The lean target (radians, + is forward) for an acceleration toward the enemy (lu/s^2). Ground
 * units lean against it (start weight back, a lurch forward on a stop); flyers pitch with it, so a
 * stop flares the nose up (G8).
 */
export function leanTarget(accelLuPerS2: number, flyer: boolean): number {
  const f = Math.max(-1, Math.min(1, accelLuPerS2 / LEAN_FULL_ACCEL));
  return (flyer ? 1 : -1) * f * LEAN_MAX_RAD;
}

/** Exponential ease toward `target` over `dtMs` with time constant `tauMs`. */
export function easeExp(cur: number, target: number, dtMs: number, tauMs: number): number {
  if (dtMs <= 0) return cur;
  return cur + (target - cur) * (1 - Math.exp(-dtMs / Math.max(1, tauMs)));
}

// ---------------------------------------------------------------------------------------------
// P4: extras sheets

/** `art/units/<age>/<slug>.json` -> `<slug>.x.json` (and `.hd.json` -> `.x.hd.json`). */
export function extrasSheetUrl(url: string): string {
  return url.replace(/(\.hd)?\.json$/, (_m, hd: string | undefined) => `.x${hd ?? ''}.json`);
}

/** What a sheet merge needs (a loaded `AtlasData`, or a fake in tests). */
export interface MergeableSheet {
  animations: Readonly<Record<string, readonly Texture[]>>;
  clips: Readonly<Record<string, unknown>>;
  luPerUnit: number;
  /** Frame name -> texture (lets an extras animation reuse the core sheet's frames, P3). */
  textures?: Readonly<Record<string, Texture>>;
  /** Animation -> frame names, as written in the sheet JSON. */
  frameNames?: Readonly<Record<string, readonly string[]>>;
}

/**
 * Merges an extras sheet's animations (and their clip meta) into a loaded core sheet. Frames are
 * resolved by name in the extras sheet first, then in the core sheet, so B and C may reuse A's
 * frames at no pixel cost. The core sheet wins for names it already has. Returns the animation
 * names that were added; nothing merges when the two sheets disagree on scale.
 */
export function mergeExtras(core: MergeableSheet, x: MergeableSheet): string[] {
  if (Math.abs(core.luPerUnit - x.luPerUnit) > core.luPerUnit * 0.02) return [];
  const anims: Record<string, readonly Texture[]> = { ...core.animations };
  const clips: Record<string, unknown> = { ...core.clips };
  const added: string[] = [];
  const names = x.frameNames ? Object.keys(x.frameNames) : Object.keys(x.animations);
  for (const name of names) {
    if (anims[name]) continue;
    let frames: readonly Texture[] | undefined = x.animations[name];
    const fn = x.frameNames?.[name];
    if (fn) {
      const res = fn.map((n) => x.textures?.[n] ?? core.textures?.[n]);
      frames = res.every((t): t is Texture => t !== undefined) ? res : undefined;
    }
    if (!frames || frames.length === 0 || frames.some((t) => !t)) continue;
    anims[name] = frames;
    const c = x.clips[name];
    if (c !== undefined && clips[name] === undefined) clips[name] = c;
    added.push(name);
  }
  (core as { animations: Record<string, readonly Texture[]> }).animations = anims;
  (core as { clips: Record<string, unknown> }).clips = clips;
  return added;
}
