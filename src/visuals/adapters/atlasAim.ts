/**
 * Queue item 44: pure helpers for the atlas unit view's aim (the shooter leaning toward its target, and where its
 * shot leaves as drawn). Presentation only: the sim owns all timing, and nothing here reads or changes sim state.
 *
 * The lean is a damped spring that heads for the lean the battle view asks for and holds it while the unit aims at
 * one target: through every wind-up, release and recovery and the gaps between shots, so a unit firing again and
 * again never rocks. An attack that starts from upright opens with a small counter-lean (anticipation); when the aim
 * ends the body stands up, where the spring's slight overshoot gives the follow-through. Angles are degrees above the
 * facing direction (aim up is positive).
 *
 * The art round's aim data (contract C2): a sheet writes, per shot clip, the drawn weapon's angle (`aimDeg`) and
 * where the shot leaves (`release: { frame, atLu }`), `omni: true` on clips that emit rather than aim, and aimed
 * variants (`<clip>_up45`, `<clip>_up70`, `<clip>_down`, `aimOf: "<clip>"`, with exactly the base clip's timing) in
 * its extras sheet. The sheet's data wins over item 44's measured table (`unitAim.ts`), which stays the fallback.
 */
import { DEFAULT_CLIP_AIM, type ClipAim } from '../unitAim';

/** Where a shot leaves, as a sheet writes it: `{ frame, atLu }` (contract C2), or the bare point of item 44's first data. */
export type ClipRelease = readonly [number, number] | { readonly frame: number; readonly atLu: readonly [number, number] };

/** What the aim reads of a clip's meta (contract C2). */
export interface ClipAimMeta {
  aimDeg?: number;
  release?: ClipRelease;
  omni?: boolean;
  aimOf?: string;
}

/** The aimed variants' suffixes (contract C2): about 45 and 70 degrees up, and down. */
export const AIM_LEVELS = ['up45', 'up70', 'down'] as const;
/** An aimed variant's level, or '' for the base clip. */
export type AimLevel = (typeof AIM_LEVELS)[number] | '';
/** The shot clips that may have aimed variants (the attack variants and the second attacker's clip). */
const AIMED_BASES: readonly string[] = ['attack', 'attack_b', 'attack_c', 'attack_alt'];
/** Each base's aimed variants in level order, and every aimed variant's base and level (no allocation per lookup). */
const AIMED_NAMES = new Map<string, readonly string[]>(AIMED_BASES.map((b) => [b, AIM_LEVELS.map((l) => `${b}_${l}`)]));
const AIMED_OF = new Map<string, { base: string; level: Exclude<AimLevel, ''> }>(AIMED_BASES.flatMap((b) => AIM_LEVELS.map((l) => [`${b}_${l}`, { base: b, level: l }] as const)));
const NO_NAMES: readonly string[] = [];

/** The shot clip an aimed variant aims (`attack_b_up45` → `attack_b`), or null for any other clip. */
export function aimedBaseOf(anim: string): string | null {
  return AIMED_OF.get(anim)?.base ?? null;
}

/** A clip's aim level: an aimed variant's suffix, '' for any other clip. */
export function aimLevelOf(anim: string): AimLevel {
  return AIMED_OF.get(anim)?.level ?? '';
}

/** The aimed variants a sheet may have for a shot clip, in level order (none for other clips). */
export function aimedNamesOf(base: string): readonly string[] {
  return AIMED_NAMES.get(base) ?? NO_NAMES;
}

/** A clip a shot may play and the angle its weapon is drawn at (degrees above the facing direction). */
export interface AimCandidate {
  anim: string;
  deg: number;
}

/**
 * The aim level the last shot played keeps its place while it fits within this many degrees of the best (so a target
 * hovering near the midpoint of two levels does not switch the pose, and the lean with it, at every shot).
 */
export const AIMED_SLACK_DEG = 5;

/**
 * The clip a shot plays within its attack variant (contract C2): of the base clip and its loaded aimed variants
 * (`candidates`, the base first), the one that reaches `wantDeg`, the launch angle `render/aim.ts` asks for
 * (`aimWantDeg`), most closely: drawn at its own angle and leaned at most `maxLean` (0: the drawn angle alone), an aimed
 * variant only its own way (`aimedLean`); the lean then covers the rest. Of two that reach it alike, the one drawn
 * nearer to it (the smaller lean), then the pose nearer the base clip's; the level the last shot played (`prevLevel`;
 * null: no shot yet) stays while it is within `AIMED_SLACK_DEG` of the best. Returns the candidate's index (0: the base
 * clip, also for no candidates or no angle). Angles are relative to the facing direction, so facing left or right
 * chooses alike.
 */
export function pickAimedClip(candidates: readonly AimCandidate[], wantDeg: number, prevLevel: AimLevel | null = null, maxLean = 0): number {
  const base = candidates[0];
  if (!base || candidates.length < 2 || !Number.isFinite(wantDeg)) return 0;
  const m = maxLean > 0 && Number.isFinite(maxLean) ? maxLean : 0;
  let best = 0;
  let bestErr = reachErr(base, wantDeg, m);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i]!;
    const err = reachErr(c, wantDeg, m);
    const b = candidates[best]!;
    const tie = Math.abs(err - bestErr) < 1e-9;
    const nearer = Math.abs(wantDeg - c.deg) < Math.abs(wantDeg - b.deg) - 1e-9;
    const same = Math.abs(Math.abs(wantDeg - c.deg) - Math.abs(wantDeg - b.deg)) < 1e-9;
    if (err < bestErr - 1e-9 || (tie && (nearer || (same && Math.abs(c.deg - base.deg) < Math.abs(b.deg - base.deg))))) {
      best = i;
      bestErr = err;
    }
  }
  for (let i = 0; prevLevel !== null && i < candidates.length; i++) {
    if (i === best || aimLevelOf(candidates[i]!.anim) !== prevLevel) continue;
    if (reachErr(candidates[i]!, wantDeg, m) <= bestErr + AIMED_SLACK_DEG) return i;
  }
  return best;
}

/** How far `wantDeg` lies outside what a candidate reaches: its drawn angle, leaned at most `m` (`aimedLean`'s way). */
function reachErr(c: AimCandidate, wantDeg: number, m: number): number {
  const lvl = aimLevelOf(c.anim);
  const lo = c.deg - (lvl === 'up45' || lvl === 'up70' ? 0 : m);
  const hi = c.deg + (lvl === 'down' ? 0 : m);
  return wantDeg < lo ? lo - wantDeg : wantDeg > hi ? wantDeg - hi : 0;
}

/**
 * The lean an aimed clip may take (the W4 review's rifle dip): an aimed variant is drawn up (or down) on its own frames
 * only. Its wind-up and recovery start and end on the base clip's pose, and the idle between shots holds the weapon as
 * the base clip does, so a lean held against the variant (down for an up-aimed clip drawn above the target, up for a
 * down-aimed one drawn below it) outlived its aimed frames and pointed the weapon past level the other way (the Ion
 * Ranger's rifle dipped about 35 degrees under level for some 170 ms after each up-aimed shot). A lean only ever goes
 * the aimed clip's way; the clip is chosen with that (`pickAimedClip`'s `maxLean`). `level` is the clip's (`aimLevelOf`).
 */
export function aimedLean(level: AimLevel, leanDeg: number): number {
  if (level === 'up45' || level === 'up70') return Math.max(0, leanDeg);
  if (level === 'down') return Math.min(0, leanDeg);
  return leanDeg;
}

/** A release as the point it names (lu from the feet, x forward, y up), or undefined. */
export function releasePoint(r: ClipRelease | undefined): readonly [number, number] | undefined {
  if (!r) return undefined;
  const p = Array.isArray(r) ? (r as readonly [number, number]) : (r as { atLu?: readonly [number, number] }).atLu;
  return p && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? p : undefined;
}

/** `clipAimOf`'s results by clip meta (one per clip per loaded sheet; they go with the sheet), with the table entry used. */
const CLIP_AIMS = new WeakMap<ClipAimMeta, { own: ClipAim | undefined; aim: ClipAim }>();

/**
 * An attack clip's drawn aim: the sheet's own data where it writes any (`aimDeg`, `release`, `omni`), with the
 * measured table's entry (`own`) filling what it leaves out; else the table's entry; else level. A clip with its own
 * `aimDeg` has a real axis, so only the sheet's `omni` makes it an emitter then.
 */
export function clipAimOf(meta: ClipAimMeta | undefined, own: ClipAim | undefined): ClipAim {
  const release = releasePoint(meta?.release);
  if (meta && (meta.aimDeg !== undefined || release !== undefined || meta.omni === true)) {
    // the battle reads this every frame for every aiming unit (`aimNow`): built once per clip of a loaded sheet
    const hit = CLIP_AIMS.get(meta);
    if (hit && hit.own === own) return hit.aim;
    const rel = release ?? own?.release;
    const omni = meta.omni === true || (meta.aimDeg === undefined && own?.omni === true);
    const aim: ClipAim = { deg: meta.aimDeg ?? own?.deg ?? 0, ...(rel ? { release: rel } : {}), ...(omni ? { omni: true } : {}) };
    CLIP_AIMS.set(meta, { own, aim });
    return aim;
  }
  return own ?? DEFAULT_CLIP_AIM;
}

/** The anticipation: this share of the lean, the other way, for this share of the wind-up (at most `ANTICIPATION_MS`). */
export const ANTICIPATION_LEAN_SHARE = 0.2;
export const ANTICIPATION_WINDUP_SHARE = 0.2;
export const ANTICIPATION_MS = 90;
/** The spring: natural frequency (Hz) and damping (below 1 overshoots a little: the follow-through). */
export const LEAN_SPRING_HZ = 4.2;
export const LEAN_SPRING_DAMPING = 0.72;
/** Reduce motion: critically damped, no anticipation, half the lean. */
export const LEAN_REDUCED_DAMPING = 1;
export const LEAN_REDUCED_SHARE = 0.5;
/** Integration step of the spring (ms). */
const SPRING_STEP_MS = 8;

/** Where an attack is in its timeline (ms into the track), from the atlas view's attack track. */
export interface LeanTiming {
  t: number;
  /** When the impact (the release) lands, ms into the track. */
  impactAtMs: number;
}

/**
 * The lean (deg) the body heads for when the battle view wants `desiredDeg` (0: the aim ended, stand up). It holds
 * `desiredDeg`, except at the start of an attack that began from upright (`fromUpright`), which first leans the other
 * way a little (never under Reduce motion). `tm` is the attack playing now, or null between attacks.
 */
export function aimLeanGoal(desiredDeg: number, fromUpright: boolean, tm: LeanTiming | null, reduce: boolean): number {
  if (desiredDeg === 0) return 0;
  if (!reduce && fromUpright && tm && tm.t >= 0) {
    const antic = Math.min(ANTICIPATION_MS, Math.max(0, tm.impactAtMs) * ANTICIPATION_WINDUP_SHARE);
    if (tm.t < antic) return -ANTICIPATION_LEAN_SHARE * desiredDeg;
  }
  return desiredDeg;
}

export interface SpringState {
  x: number;
  v: number;
}

/** Advances the lean spring toward `goal` over `dtMs` (semi-implicit Euler in small steps; stable for any frame time). */
export function stepLeanSpring(s: SpringState, goal: number, dtMs: number, reduce: boolean): void {
  // at rest upright (almost every unit almost every frame): nothing to do
  if (dtMs <= 0 || (goal === 0 && s.x === 0 && s.v === 0)) return;
  const w = 2 * Math.PI * LEAN_SPRING_HZ;
  const z = reduce ? LEAN_REDUCED_DAMPING : LEAN_SPRING_DAMPING;
  let left = dtMs;
  while (left > 0) {
    const h = Math.min(SPRING_STEP_MS, left) / 1000;
    s.v += (w * w * (goal - s.x) - 2 * z * w * s.v) * h;
    s.x += s.v * h;
    left -= SPRING_STEP_MS;
  }
  // settled: snap, so an idle unit draws exactly upright
  if (goal === 0 && Math.abs(s.x) < 0.02 && Math.abs(s.v) < 0.5) {
    s.x = 0;
    s.v = 0;
  }
}

/** The lean a unit may take toward a target: clamped by its policy's maximum, halved under Reduce motion. */
export function clampLean(desiredDeg: number, maxDeg: number, reduce: boolean): number {
  const m = maxDeg * (reduce ? LEAN_REDUCED_SHARE : 1);
  if (!(m > 0) || !Number.isFinite(desiredDeg)) return 0;
  return Math.max(-m, Math.min(m, desiredDeg));
}

/** The body's transform as the view placed it: offset (lu, root space), rotation (radians, Pixi), scale per lu (sx carries the facing). */
export interface BodyXform {
  x: number;
  y: number;
  rotation: number;
  sx: number;
  sy: number;
}

/** A point given in the body's lu (x forward, y down, from the feet) where it is drawn in the root's space, written to `out`. */
export function throughBody<T extends { x: number; y: number }>(b: BodyXform, p: { x: number; y: number }, out: T): T {
  const lx = p.x * b.sx;
  const ly = p.y * b.sy;
  const c = Math.cos(b.rotation);
  const s = Math.sin(b.rotation);
  out.x = b.x + lx * c - ly * s;
  out.y = b.y + lx * s + ly * c;
  return out;
}

/** A weapon drawn `deg` above the facing direction: the angle it points on screen after the body transform, still relative to `facing`. */
export function angleThroughBody(b: BodyXform, deg: number, facing: 1 | -1): number {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a) * b.sx;
  const dy = -Math.sin(a) * b.sy;
  const c = Math.cos(b.rotation);
  const s = Math.sin(b.rotation);
  const wx = dx * c - dy * s;
  const wy = dx * s + dy * c;
  return (Math.atan2(-wy, wx * facing) * 180) / Math.PI;
}
