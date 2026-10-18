/**
 * Combat staging for the atlas unit view (queue item 38, Phase A; DIAGNOSIS A1, A2, A4, A8). Pure helpers:
 * the reach of an attack read from the loaded sheet, the per-frame lunge of the body, and the curves of the
 * additive hit reaction, the lift arcs and the weighted death.
 *
 * Everything here is visual only. The sim owns all timing (DESIGN B5): impact frames stay on the sim's impact
 * tick, and nothing here reads or changes sim state. Randomness comes from the view's seeded cosmetic RNG
 * (unit id and match seed), never `Math.random`, so a replay draws the same thing.
 */
import type { Texture } from 'pixi.js';
import { impactStepOf, type TimelineSeg } from './atlasMotion';

// ---------------------------------------------------------------------------------------------
// Frame boxes

/** A frame's visible (trimmed) box relative to the feet anchor, in texture units: x right (forward), y up. */
export interface FrameBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** The visible box of a sheet frame, or null for an empty texture. */
export function textureBox(tex: Texture | undefined): FrameBox | null {
  if (!tex) return null;
  const o = tex.orig;
  if (!o || !(o.width > 0) || !(o.height > 0)) return null;
  const tr = tex.trim ?? { x: 0, y: 0, width: o.width, height: o.height };
  if (!(tr.width > 0) || !(tr.height > 0)) return null;
  const a = tex.defaultAnchor ?? { x: 0.5, y: 1 };
  const ax = a.x * o.width;
  const ay = a.y * o.height;
  return { x0: tr.x - ax, x1: tr.x + tr.width - ax, y0: ay - (tr.y + tr.height), y1: ay - tr.y };
}

// ---------------------------------------------------------------------------------------------
// A1: reach

/**
 * Per-frame anchors that mark where a shot leaves or a prop sits rather than a striking tip (a muzzle, a
 * beam, a fuse, a pair of binoculars, a drummer's sticks). Every other per-frame anchor of an attack clip is
 * a tip tracker the art pipeline writes for melee (`clubHead`, `swordTip`, `lanceTip`, `fangTip`, `fist` ...).
 */
export const NON_TIP_ANCHOR = /muzzle|^beam$|^fuse$|^lens$|^binoculars$|^watchC$|^antenna$|^chanter$|^drone_top$|^stick_[lr]$/i;

/** The minimal clip meta the reach reads (a subset of the sheet's `meta.ageborn.clips.<clip>`). */
export interface ReachClipMeta {
  durationsMs?: readonly number[];
  impactAt?: number;
  impactFrame?: number;
  impactStep?: number;
  holdStep?: number;
  sequence?: readonly number[];
  muzzle?: readonly [number, number];
  anchorsLu?: Readonly<Record<string, readonly (readonly [number, number] | null)[]>>;
}

/** The furthest-forward melee tip tracker at a unique frame (sheet lu, y up), or null. */
export function meleeTipAt(anchors: ReachClipMeta['anchorsLu'], frame: number): { name: string; x: number; y: number } | null {
  let best: { name: string; x: number; y: number } | null = null;
  for (const [name, list] of Object.entries(anchors ?? {})) {
    if (NON_TIP_ANCHOR.test(name)) continue;
    const v = list[frame];
    if (!v) continue;
    if (!best || v[0] > best.x) best = { name, x: v[0], y: v[1] };
  }
  return best;
}

/** A shot's origin at a unique frame (the clip's `muzzle`, else a per-frame muzzle-like anchor), or null. */
export function muzzleAt(meta: ReachClipMeta, frame: number): { x: number; y: number } | null {
  if (meta.muzzle) return { x: meta.muzzle[0], y: meta.muzzle[1] };
  for (const [name, list] of Object.entries(meta.anchorsLu ?? {})) {
    if (!/muzzle|^beam$/i.test(name)) continue;
    const v = list[frame];
    if (v) return { x: v[0], y: v[1] };
  }
  return null;
}

/**
 * A strike that lands before its impact frame: some big clips (the Woolly Rhino's gore, the Elk Chieftain's
 * rack, the Bronze Colossus's chop) toss the head or weapon up on the impact frame, after the blow. When the
 * impact frame's tip sits this high (share of the sheet height) and the strike frames before it reached this
 * much further forward (lu), the strike frames' furthest tip is the contact.
 */
export const TOSS_TIP_HEIGHT_SHARE = 0.55;
export const TOSS_TIP_BEHIND_LU = 15;

/**
 * The striking tip of an attack clip at its impact (sheet lu from the feet, x forward, y up) and where it
 * came from: the impact frame's tip tracker, the strike frames' furthest tip (a toss on the impact frame,
 * see `TOSS_TIP_HEIGHT_SHARE`), the shot's muzzle (ranged clips), or null (no tracker at all).
 */
export function strikeTip(meta: ReachClipMeta, impactStep: number, sheetHeightLu: number): { x: number; y: number; from: 'impact' | 'strike' | 'muzzle' } | null {
  const frameOf = (step: number): number => meta.sequence?.[step] ?? step;
  const tip = meleeTipAt(meta.anchorsLu, frameOf(impactStep));
  if (tip) {
    if (tip.y > TOSS_TIP_HEIGHT_SHARE * sheetHeightLu) {
      const hold = meta.holdStep;
      const from = hold !== undefined && Number.isInteger(hold) && hold >= 0 && hold < impactStep ? hold + 1 : Math.max(0, impactStep - 2);
      let best: { x: number; y: number } | null = null;
      for (let s = from; s < impactStep; s++) {
        const t = meleeTipAt(meta.anchorsLu, frameOf(s));
        if (t && (!best || t.x > best.x)) best = { x: t.x, y: t.y };
      }
      if (best && best.x - tip.x > TOSS_TIP_BEHIND_LU) return { ...best, from: 'strike' };
    }
    return { x: tip.x, y: tip.y, from: 'impact' };
  }
  const m = muzzleAt(meta, frameOf(impactStep));
  return m ? { ...m, from: 'muzzle' } : null;
}

/** What `CombatView.reach()` returns: lu from the feet, facing +x (screen lu, so a levy drawn smaller reads smaller). */
export interface Reach {
  /** The weapon tip at the impact frame (see `strikeTip`), else the impact frame's front extent. */
  tipLu: number;
  /** How far the body (the team-colour layer) moves forward on the impact frame against the idle (may be negative). */
  lungeLu: number;
  /** The body's front and back extents at idle (the furthest any idle frame reaches). */
  frontLu: number;
  backLu: number;
  /** Additions: the tip's height above the feet (for a contact spark) and the impact frame's front extent. */
  tipYLu: number;
  impactFrontLu: number;
  /** Additions: the torso (team-colour layer) front and back at idle, the part that must not overlap a foe's. */
  torsoFrontLu: number;
  torsoBackLu: number;
  /** Additions: where the tip came from (`strike`: the impact frame tosses, the strike frames carry the tip). */
  tipFrom: 'impact' | 'strike' | 'muzzle' | 'extent';
}

/** The minimal sheet the reach reads (a loaded `AtlasData`). */
export interface ReachSheet {
  animations: Readonly<Record<string, readonly Texture[]>>;
  clips: Readonly<Record<string, ReachClipMeta | undefined>>;
  heightLu?: number;
}

const mean = (xs: readonly number[]): number => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** The centre x of each step's team-colour layer (texture units from the feet), null where a step has none. */
export function teamCentres(sheet: ReachSheet, anim: string): (number | null)[] {
  const team = sheet.animations[`${anim}_team`] ?? [];
  const n = sheet.animations[anim]?.length ?? 0;
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const b = textureBox(team[i]);
    out.push(b ? (b.x0 + b.x1) / 2 : null);
  }
  return out;
}

/** The idle reference of the body: the mean team-layer centre and box over the idle frames, and the frame extents. */
export interface IdleBody {
  teamCentre: number | null;
  teamFront: number | null;
  teamBack: number | null;
  front: number;
  back: number;
  backMean: number;
}

export function idleBody(sheet: ReachSheet, idleAnim: string): IdleBody | null {
  const frames = sheet.animations[idleAnim] ?? [];
  const team = sheet.animations[`${idleAnim}_team`] ?? [];
  const boxes = frames.map((t) => textureBox(t)).filter((b): b is FrameBox => b !== null);
  if (boxes.length === 0) return null;
  const tb = team.map((t) => textureBox(t)).filter((b): b is FrameBox => b !== null);
  return {
    teamCentre: tb.length > 0 ? mean(tb.map((b) => (b.x0 + b.x1) / 2)) : null,
    teamFront: tb.length > 0 ? mean(tb.map((b) => b.x1)) : null,
    teamBack: tb.length > 0 ? mean(tb.map((b) => -b.x0)) : null,
    front: Math.max(...boxes.map((b) => b.x1)),
    back: Math.max(...boxes.map((b) => -b.x0)),
    backMean: mean(boxes.map((b) => -b.x0)),
  };
}

/**
 * The body's forward travel on each step of an attack clip against the idle, in texture units: the team-colour
 * layer's box centre (a torso proxy the runtime can read without pixels; against the alpha-weighted pixel
 * centroid it is within 1.6 lu at the median, 4.9 lu at p90, over every melee attack of the 167 sheets), else
 * the shift of the frame's back edge.
 */
export function lungeCurve(sheet: ReachSheet, anim: string, idle: IdleBody): number[] {
  const frames = sheet.animations[anim] ?? [];
  const centres = teamCentres(sheet, anim);
  return frames.map((t, i) => {
    const c = centres[i];
    if (c !== null && c !== undefined && idle.teamCentre !== null) return c - idle.teamCentre;
    const b = textureBox(t);
    return b ? idle.backMean - -b.x0 : 0;
  });
}

/** The impact step of an attack clip (the timing contract: `impactAt`, then `impactStep`, then `impactFrame`). */
export function clipImpactStep(meta: ReachClipMeta | undefined, frames: number, impactAt: number | null): number | null {
  const own = meta?.durationsMs !== undefined && meta.durationsMs.length === frames;
  const steps = own && meta?.durationsMs ? meta.durationsMs : Array.from({ length: frames }, () => 1);
  return impactStepOf(steps, impactAt, own ? meta?.impactFrame : undefined, own ? meta?.sequence : undefined, own ? meta?.impactStep : undefined);
}

/**
 * The reach of one attack clip. `k` converts texture units to screen lu (the view's sprite scale), `hk` sheet
 * lu to screen lu (1 except for an entry drawn smaller than its sheet, a levy). Null without frames.
 */
export function computeReach(sheet: ReachSheet, anim: string, idleAnim: string, impactAt: number | null, k: number, hk: number): Reach | null {
  const frames = sheet.animations[anim];
  if (!frames || frames.length === 0) return null;
  const idle = idleBody(sheet, idleAnim) ?? idleBody(sheet, anim);
  if (!idle) return null;
  const meta = sheet.clips[anim];
  const step = clipImpactStep(meta, frames.length, impactAt) ?? Math.floor(frames.length / 2);
  const box = textureBox(frames[step]) ?? { x0: -idle.back, x1: idle.front, y0: 0, y1: 0 };
  const tip = meta ? strikeTip(meta, step, sheet.heightLu ?? 68) : null;
  const lunge = lungeCurve(sheet, anim, idle)[step] ?? 0;
  return {
    tipLu: tip ? tip.x * hk : box.x1 * k,
    tipYLu: tip ? tip.y * hk : ((box.y0 + box.y1) / 2) * k,
    lungeLu: lunge * k,
    frontLu: idle.front * k,
    backLu: idle.back * k,
    impactFrontLu: box.x1 * k,
    torsoFrontLu: (idle.teamFront ?? idle.front * 0.5) * k,
    torsoBackLu: (idle.teamBack ?? idle.back * 0.5) * k,
    tipFrom: tip ? tip.from : 'extent',
  };
}

// ---------------------------------------------------------------------------------------------
// A1: lunge compensation

/**
 * The steps of an attack clip on which the lunge compensation applies: from the step after the held
 * anticipation (`holdStep`; else two steps before the impact) to the end. The wind-up's own pull-back is
 * never compensated, so the anticipation reads as authored; the recovery's lunge returns to zero by itself.
 */
export function compFromStep(meta: ReachClipMeta | undefined, impactStep: number | null): number {
  const hold = meta?.holdStep;
  if (impactStep === null) return Number.POSITIVE_INFINITY;
  if (hold !== undefined && Number.isInteger(hold) && hold >= 0 && hold < impactStep) return hold + 1;
  return Math.max(0, impactStep - 2);
}

/** The body offset (lu, backward along the facing) that takes back `share` of the lunge shown on a step. */
export function lungeCompLu(curve: readonly number[], step: number, fromStep: number, share: number, k: number): number {
  if (step < fromStep || !(share > 0)) return 0;
  return Math.max(0, curve[step] ?? 0) * Math.min(1, share) * k;
}

// ---------------------------------------------------------------------------------------------
// A2: hit reactions

/** Hit size tier: the hit's share of the victim's max HP (the battle view decides), or the killing blow. */
export type HitTier = 'light' | 'medium' | 'heavy' | 'kill';
export const HIT_TIERS: readonly HitTier[] = ['light', 'medium', 'heavy', 'kill'];

/** The mass classes of `unitMass` (atlas.ts): light infantry and ranged, medium anti-armour and tall, heavy. */
export type ReactMass = 'light' | 'medium' | 'heavy';

/**
 * The additive recoil per tier and mass: how far the body is pushed (lu), how far it tilts back about the feet
 * (degrees; the head snaps back first), how deep it squashes (share), and how long the whole reaction lasts (ms).
 * A light hit on infantry is visible but small (about 3 px of push and a 4.5 degree snap on a phone); the killing
 * blow is the strongest; a heavy body barely moves under a light hit. Replaces the flat 5 / 2.5 / 1 lu flinch.
 */
export const REACTION: Readonly<Record<HitTier, Readonly<Record<ReactMass, { pushLu: number; tiltDeg: number; squash: number; ms: number }>>>> = {
  light: { light: { pushLu: 3, tiltDeg: 4.5, squash: 0.06, ms: 210 }, medium: { pushLu: 1.7, tiltDeg: 2.8, squash: 0.04, ms: 230 }, heavy: { pushLu: 0.7, tiltDeg: 1.2, squash: 0.02, ms: 250 } },
  medium: { light: { pushLu: 5.5, tiltDeg: 7.5, squash: 0.09, ms: 260 }, medium: { pushLu: 3.2, tiltDeg: 4.8, squash: 0.06, ms: 280 }, heavy: { pushLu: 1.5, tiltDeg: 2.2, squash: 0.035, ms: 300 } },
  heavy: { light: { pushLu: 9, tiltDeg: 11, squash: 0.12, ms: 320 }, medium: { pushLu: 5.5, tiltDeg: 7, squash: 0.08, ms: 340 }, heavy: { pushLu: 2.8, tiltDeg: 3.5, squash: 0.05, ms: 360 } },
  kill: { light: { pushLu: 13, tiltDeg: 15, squash: 0.14, ms: 360 }, medium: { pushLu: 8, tiltDeg: 10, squash: 0.1, ms: 380 }, heavy: { pushLu: 4, tiltDeg: 5, squash: 0.06, ms: 400 } },
};

/** Reduce motion: the recoil keeps its shape at this share (the A12 preset softens motion; it never hides a hit). */
export const REACT_REDUCE = 0.6;

/** A settle after a peak: 1 at tau 0, crossing 0 at a third, a soft overshoot (about -17%), 0 at tau 1. */
function settle(tau: number, turns: number): number {
  const t = Math.max(0, Math.min(1, tau));
  return (1 - t) * (1 - t) * Math.cos(turns * Math.PI * t);
}

/**
 * The shape of a reaction at `u` (0..1 of its length), each 0..1 at its peak: the push (out in the first 16%,
 * back with a small rebound), the tilt (the head snaps back in the first 10%, comes forward past neutral, settles)
 * and the squash (the impact squash in the first 8%, a stretch on the rebound, gone by 60%).
 */
export function reactionShape(u: number): { push: number; tilt: number; squash: number } {
  if (!(u > 0) || u >= 1) return { push: 0, tilt: 0, squash: 0 };
  const push = u < 0.16 ? Math.sin((u / 0.16) * (Math.PI / 2)) : settle((u - 0.16) / 0.84, 1.25);
  const tilt = u < 0.1 ? Math.sin((u / 0.1) * (Math.PI / 2)) : settle((u - 0.1) / 0.9, 1.5);
  const squash = u < 0.08 ? Math.sin((u / 0.08) * (Math.PI / 2)) : u < 0.6 ? settle((u - 0.08) / 0.52, 1.5) : 0;
  return { push, tilt, squash };
}

/** The hit-pose insert for a walking or recovering victim (ms): the hit clip's first step, then its extreme pose. */
export const HIT_INSERT_MS: readonly [number, number] = [30, 42];
/**
 * A new insert waits this long after the last one began (ms): under sustained fire (an MG's ten hits a second on a
 * walker) the walk still shows between the hit poses; the additive recoil answers every hit.
 */
export const HIT_INSERT_GAP_MS = 240;

// ---------------------------------------------------------------------------------------------
// A2 / A8: lift arcs (sim knockback, pounce, leap)

export type AirKind = 'knockback' | 'pounce' | 'leap';

/**
 * The body's lift, pitch and stretch at `u` (0..1 of the arc): a parabola of `liftLu`; a knockback tilts back
 * (positive = head back) and, with `tumble`, turns one full backflip about the hit centre; a pounce or leap takes off
 * stretched and nose up, then dips the nose toward the landing. `stretch` > 0 stretches (sy up, sx in).
 */
export function airShape(kind: AirKind, u: number, tumble: boolean): { lift: number; backTilt: number; spin: number; stretch: number } {
  const v = Math.max(0, Math.min(1, u));
  const lift = 4 * v * (1 - v);
  if (kind === 'knockback') {
    const backTilt = tumble ? 0 : Math.sin(Math.min(1, v / 0.35) * (Math.PI / 2)) * (1 - smoothstep01((v - 0.55) / 0.45));
    const spin = tumble ? smoothstep01(v) : 0;
    return { lift, backTilt, spin, stretch: v < 0.2 ? 0.6 * Math.sin((v / 0.2) * Math.PI) : 0 };
  }
  // pounce / leap: nose up at take-off (-1), level at the top, nose down before the landing (+1)
  const pitch = v < 0.5 ? -Math.sin((v / 0.5) * (Math.PI / 2)) * (1 - v / 0.5) * 1.6 : Math.sin(((v - 0.5) / 0.5) * (Math.PI / 2));
  return { lift, backTilt: -pitch, spin: 0, stretch: v < 0.25 ? Math.sin((v / 0.25) * Math.PI) : 0 };
}

/** The landing squash at `t` ms after touch-down (0..1 at its peak, gone by `LAND_SQUASH_MS`). */
export const LAND_SQUASH_MS = 160;
export function landSquash(t: number): number {
  if (!(t >= 0) || t >= LAND_SQUASH_MS) return 0;
  const u = t / LAND_SQUASH_MS;
  return u < 0.2 ? Math.sin((u / 0.2) * (Math.PI / 2)) : settle((u - 0.2) / 0.8, 1.2);
}

// ---------------------------------------------------------------------------------------------
// A4: deaths with weight

/**
 * When the body meets the ground in a die clip (authored ms): the first step that starts at or after this. Both
 * shipped die timing tables (161 of 167 sheets: 695 ms in 10 steps, 990 ms in 12) land about here: step 5 at 285 ms
 * (Footman, Rifleman, Pikeman, Bonker a step earlier) and step 4 at 290 ms (Mammoth, Woolly Rhino, Elk; riders at
 * 350 ms). A sheet may say it exactly with `groundAtMs` on its die clip (a later art pass).
 */
export const DEATH_GROUND_MS = 280;

export function deathGroundMs(steps: readonly number[], groundAtMs?: number): number {
  const total = steps.reduce((a, b) => a + b, 0);
  if (groundAtMs !== undefined && Number.isFinite(groundAtMs) && groundAtMs > 0) return Math.min(total, groundAtMs);
  let acc = 0;
  for (const ms of steps) {
    if (acc >= DEATH_GROUND_MS) return acc;
    acc += ms;
  }
  return Math.min(total, DEATH_GROUND_MS);
}

/** How a body falls: a light or medium body under a heavy blow is thrown (lift); everything else crumples. */
export interface DeathStyle {
  fling: boolean;
  /** Playback speed of the die clip (thrown bodies fall a little faster, heavy ones slower). */
  speed: number;
  /** Lift of a thrown body before it lands (lu), the bounce after the landing (lu) and the landing squash depth. */
  liftLu: number;
  bounceLu: number;
  squash: number;
}

export function deathStyle(tier: HitTier, heavy: boolean, mass: ReactMass, reduce: boolean): DeathStyle {
  const big = heavy || mass === 'heavy';
  const fling = !big && (tier === 'heavy' || tier === 'kill');
  const r = reduce ? 0 : 1;
  return {
    fling: fling && !reduce,
    speed: big ? 0.85 : fling ? 1.15 : 0.92,
    liftLu: fling ? (mass === 'light' ? 10 : 6) * r : 0,
    bounceLu: big ? 0 : (mass === 'light' ? 3.5 : 2.5) * r,
    squash: (big ? 0.16 : mass === 'light' ? 0.14 : 0.12) * (reduce ? 0.5 : 1),
  };
}

/** The landing beat: a squash in the first 50 ms, the bounce over the next 150 ms (lift share 0..1), a settle. */
export const DEATH_BOUNCE_MS = 200;
export function deathLanding(since: number): { squash: number; bounce: number } {
  if (!(since >= 0) || since >= DEATH_BOUNCE_MS + 120) return { squash: 0, bounce: 0 };
  if (since < 50) return { squash: Math.sin((since / 50) * (Math.PI / 2)), bounce: 0 };
  if (since < DEATH_BOUNCE_MS) {
    const u = (since - 50) / (DEATH_BOUNCE_MS - 50);
    // out of the squash into a slight stretch on the way up
    return { squash: Math.max(0, 1 - u * 3) - Math.sin(u * Math.PI) * 0.25, bounce: Math.sin(u * Math.PI) };
  }
  // the second, smaller touch-down
  const v = (since - DEATH_BOUNCE_MS) / 120;
  return { squash: Math.sin(v * Math.PI) * 0.35, bounce: 0 };
}

/** The fade of a lying body after `lieMs`: alpha and how far it has sunk (share of the sink). */
export function deathFade(since: number, lieMs: number, fadeMs: number): { alpha: number; sink: number } {
  const t = since - lieMs;
  if (!(t > 0)) return { alpha: 1, sink: 0 };
  const f = Math.min(1, t / Math.max(1, fadeMs));
  return { alpha: 1 - f * f * (3 - 2 * f), sink: f };
}

function smoothstep01(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------------------------
// A8: staging details

/**
 * The recovery after an attack's impact plays at 85-115% of its authored speed, per unit and per swing, so a front
 * of the same card does not settle in unison. The impact step keeps its start (the sim's impact tick) and its length
 * (the impact hold); only the steps after it stretch or shrink. A hash of the unit id and the view's attack count,
 * not the view's random stream, so a replay at another frame rate draws the same swings.
 */
export const RECOVERY_JITTER = 0.15;

export function recoveryScale(unitId: number, plays: number): number {
  let h = Math.imul((unitId | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(((plays | 0) + 0x632be5ab) | 0, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return 1 - RECOVERY_JITTER + 2 * RECOVERY_JITTER * ((h >>> 0) / 4294967296);
}

/** A timeline with the steps after `impactStep` scaled by `f` (the impact and everything before it unchanged). */
export function jitterRecovery(tl: readonly TimelineSeg[], impactStep: number, f: number): TimelineSeg[] {
  let seen = false;
  return tl.map((seg) => {
    if (seg.step === impactStep) seen = true;
    return seen && seg.step > impactStep ? { step: seg.step, ms: seg.ms * f } : seg;
  });
}
